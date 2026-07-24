import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { app } from './src/shared/infra/http/app';
import { pool } from './src/config/database';
const PORT = process.env.PORT || 3333;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 [Socket]: Usuário conectado: ${socket.id}`);

  // Entrar na sala do evento
  socket.on('join_event', (eventId) => {
    socket.join(`event_${eventId}`);
    console.log(`👥 [Socket]: Usuário ${socket.id} entrou no evento ${eventId}`);
  });

  // Solicitar liderança
  socket.on('request_leadership', ({ eventId, userName }) => {
    // Envia solicitação de liderança para a sala (somente admins devem ver e responder no frontend)
    socket.to(`event_${eventId}`).emit('leadership_requested', {
      requesterId: socket.id,
      userName
    });
  });

  // Cancelar solicitação de liderança
  socket.on('cancel_leadership_request', ({ eventId }) => {
    socket.to(`event_${eventId}`).emit('leadership_request_cancelled', socket.id);
  });

  // Aprovar liderança
  socket.on('approve_leadership', ({ eventId, requesterId }) => {
    // Notifica o requester que ele foi aprovado
    io.to(requesterId).emit('leadership_approved');
    // Notifica a sala inteira quem é o novo líder
    io.to(`event_${eventId}`).emit('new_leader', requesterId);
  });

  // Eventos de sincronização
  socket.on('sync_change_song', ({ eventId, index }) => {
    socket.to(`event_${eventId}`).emit('sync_song_changed', index);
  });

  socket.on('sync_change_tone', ({ eventId, visualTone, capo }) => {
    socket.to(`event_${eventId}`).emit('sync_tone_changed', { visualTone, capo });
  });

  socket.on('sync_scroll', ({ eventId, scrollRatio }) => {
    socket.to(`event_${eventId}`).emit('sync_scrolled', scrollRatio);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 [Socket]: Usuário desconectado: ${socket.id}`);
  });
});

async function startServer() {
  try {
    // Tenta executar uma query simples de teste no banco
    const client = await pool.connect();
    console.log('💾 [Database]: Conexão com o banco de dados validada com sucesso!');
    client.release(); // Libera o cliente de volta para o pool

    // Inicia o servidor HTTP integrado com Socket.io
    server.listen(PORT, () => {
      console.log(`🚀 [Maestro]: Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ [Critical]: Falha ao iniciar o servidor. Não foi possível conectar ao banco de dados.');
    console.error(error);
    process.exit(1); // Encerra a aplicação com código de erro
  }
}

startServer();