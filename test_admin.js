const API_URL = 'http://localhost:3333';

async function runAdminTest() {
  console.log('🚀 Iniciando Teste do Super Admin\n');
  
  try {
    // 1. Fazer Login como Super Admin
    console.log('1️⃣ Fazendo Login com maestro@admin.com...');
    let res = await fetch(`${API_URL}/users/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'maestro@admin.com', password: '123456' })
    });
    const loginData = await res.json();
    console.log('✅ Login feito. Token obtido para:', loginData.user?.email, '| Role:', loginData.user?.role);
    if (!res.ok) throw new Error('Falha no login do admin');
    
    const adminToken = loginData.token;
    const adminHeaders = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    // 2. Testar a criação de um novo usuário logado como Admin
    console.log('\n2️⃣ Criando um usuário comum (músico) através do painel do Admin...');
    const userPayload = {
      name: `Baterista ${Date.now()}`,
      email: `batera${Date.now()}@banda.com`,
      password: 'senha_segura',
      role: 'musician'
    };
    
    res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(userPayload)
    });
    const userResponse = await res.json();
    console.log('✅ Usuário criado com sucesso pelo Admin:', userResponse);
    if (!res.ok) throw new Error('O Admin não conseguiu criar o usuário');

    // 3. Testar se um não-admin consegue criar usuários
    console.log('\n3️⃣ Tentando criar usuário sem o token do Admin (Hacker simulado)...');
    res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@mal.com',
        password: 'senha'
      })
    });
    const hackerResponse = await res.json();
    if (res.status === 401 || res.status === 403) {
      console.log('✅ BLOQUEIO FUNCIONOU! Hacker bloqueado com erro:', hackerResponse.error || hackerResponse.message);
    } else {
      throw new Error('O bloqueio falhou, qualquer um está conseguindo criar usuário!');
    }

    console.log('\n🎉 Todos os testes de segurança do Admin e bloqueio de criação passaram com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  }
}

runAdminTest();
