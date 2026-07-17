import { sign } from 'jsonwebtoken';
import { pool } from './src/config/database';

async function testApi() {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    
    // Get org id
    const orgQuery = await pool.query('SELECT id FROM organizations LIMIT 1');
    const orgId = orgQuery.rows[0]?.id;

    // Get an admin user
    const userQuery = await pool.query("SELECT * FROM users u JOIN organization_users ou ON ou.user_id = u.id WHERE ou.role = 'admin' LIMIT 1");
    const user = userQuery.rows[0];

    if (!user) throw new Error('No admin user found');

    const token = sign({ 
      role: 'admin', 
      organization_id: orgId 
    }, secret, {
      subject: user.id.toString(),
      expiresIn: '1d',
    });

    console.log('Posting event with token...');
    const response = await fetch('http://localhost:3333/events', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'API Test Event Fetch',
        description: 'Desc',
        date_time: '2026-07-17T20:15'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('API Error:', data);
    } else {
      console.log('Success:', data);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testApi();
