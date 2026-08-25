import request from 'supertest';
import { app } from '../../../shared/infra/http/app';
import { pool } from '../../../config/database';

describe('LGPD: UsersController (Exclusão e Exportação)', () => {
  let token: string;
  let userId: string;
  let orgId: string;

  beforeAll(async () => {
    // 1. Criar um Tenant e obter Token
    const res = await request(app).post('/users/register').send({
      name: 'LGPD Test User',
      email: `lgpd_${Date.now()}@test.com`,
      password: 'password123',
      organizationName: 'LGPD Org',
      phone: '11999999999',
      acceptedTerms: true,
      isAdult: true
    });

    token = res.body.token;
    userId = res.body.user.id;
    orgId = res.body.user.organization_id;
  });

  afterAll(async () => {
    // Limpar lixos caso algum teste falhe antes do hard delete
    await pool.query('DELETE FROM organization_users WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_consents WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    await pool.end();
  });

  it('deve exportar os dados do usuário logado em formato JSON (Art 18, V)', async () => {
    const response = await request(app)
      .get('/users/me/export')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('personal_data');
    expect(response.body.personal_data).toHaveProperty('name', 'LGPD Test User');
    expect(response.body.personal_data).toHaveProperty('email');
    expect(response.body).toHaveProperty('export_date');
  });

  it('deve falhar a exportação se não houver token', async () => {
    const response = await request(app).get('/users/me/export');
    expect(response.status).toBe(401);
  });

  it('deve excluir definitivamente os dados da conta do usuário logado (Art 18, VI)', async () => {
    const response = await request(app)
      .delete('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);

    // Verificar direto no banco se o hard delete funcionou (Dados Órfãos mitigados)
    const dbCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    expect(dbCheck.rows.length).toBe(0);
  });
});
