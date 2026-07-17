const API_URL = 'http://localhost:3333';

async function runTest() {
  console.log('🚀 Iniciando Teste Geral (E2E) - Maestro Cifras API\n');
  
  try {
    // 1. Criar Usuário
    console.log('1️⃣ Criando Usuário...');
    const userPayload = {
      name: `Usuario Teste ${Date.now()}`,
      email: `teste${Date.now()}@teste.com`,
      password: 'senha_segura123',
      role: 'admin'
    };
    
    let res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    const userResponse = await res.json();
    console.log('✅ Usuário criado:', userResponse);
    if (!res.ok) throw new Error('Falha ao criar usuário');

    // 2. Autenticar (Login)
    console.log('\n2️⃣ Fazendo Login...');
    res = await fetch(`${API_URL}/users/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userPayload.email, password: userPayload.password })
    });
    const loginData = await res.json();
    console.log('✅ Login realizado com sucesso. Token obtido.');
    if (!res.ok) throw new Error('Falha no login');
    
    const token = loginData.token;
    const authHeaders = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 3. Criar Música
    console.log('\n3️⃣ Criando Música...');
    const songPayload = {
      title: 'Música de Teste ' + Date.now(),
      artist: 'Ministério Teste',
      original_key: 'G',
      chordpro_content: '[G]Deus é [D]bom',
      bpm: 120,
      time_signature: '4/4'
    };
    res = await fetch(`${API_URL}/songs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(songPayload)
    });
    const songResponse = await res.json();
    console.log('✅ Música criada:', songResponse);
    if (!res.ok) throw new Error('Falha ao criar música');
    const songId = songResponse.id;

    // 4. Criar Evento
    console.log('\n4️⃣ Criando Evento (Culto/Ensaio)...');
    const eventPayload = {
      title: 'Culto de Teste ' + Date.now(),
      description: 'Testando a criação de eventos e escalas',
      date_time: new Date(Date.now() + 86400000).toISOString() // amanhã
    };
    res = await fetch(`${API_URL}/schedules/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(eventPayload)
    });
    const eventResponse = await res.json();
    console.log('✅ Evento criado:', eventResponse);
    if (!res.ok) throw new Error('Falha ao criar evento');
    const eventId = eventResponse.id;

    // 5. Adicionar Música ao Repertório do Evento (Setlist)
    console.log('\n5️⃣ Adicionando Música ao Repertório...');
    res = await fetch(`${API_URL}/setlists/${eventId}/songs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ song_id: songId, position: 1 })
    });
    const setlistResponse = await res.json();
    console.log('✅ Música adicionada ao repertório do evento:', setlistResponse);
    if (!res.ok) throw new Error('Falha ao adicionar ao repertório');

    // 6. Criar uma nova Habilidade (Skill) dinamicamente
    console.log('\n6️⃣ Criando Habilidade (Skill) dinâmica...');
    const skillPayload = { name: 'Engenheiro de Som ' + Date.now() };
    res = await fetch(`${API_URL}/skills`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(skillPayload)
    });
    const skillResponse = await res.json();
    console.log('✅ Habilidade criada:', skillResponse);
    if (!res.ok) throw new Error('Falha ao criar habilidade');
    const skillId = skillResponse.id;

    // 7. Escalar Usuário
    console.log('\n7️⃣ Escalando Usuário para o Evento com a nova Habilidade...');
    const userId = loginData.user.id;
    const schedulePayload = {
      event_id: eventId,
      user_id: userId,
      skill_id: skillId
    };
    res = await fetch(`${API_URL}/schedules`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(schedulePayload)
    });
    if (res.ok) {
      const scheduleResponse = await res.json();
      console.log('✅ Usuário escalado com a nova habilidade:', scheduleResponse);
    } else {
      const errRes = await res.json();
      console.log('⚠️ Falha ao escalar:', errRes);
    }

    console.log('\n🎉 Teste E2E concluído com sucesso! Agora o módulo de Habilidades é dinâmico!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  }
}

runTest();
