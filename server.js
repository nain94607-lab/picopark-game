const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'juego')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'juego', 'index.html'));
});

let players = {};
let hostSocketId = null;
const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

io.on('connection', (socket) => {
  console.log('🔗 Dispositivo conectado ID:', socket.id);

  // 1. REGISTRO EXPLICITO DE HOST
  socket.on('register_host', () => {
    hostSocketId = socket.id;
    socket.isHost = true;
    
    // Si se le asignó rol de jugador por error, se limpia
    if (players[socket.id]) {
      delete players[socket.id];
    }
    
    console.log(`🖥️ Socket ${socket.id} registrado como PANTALLA HOST`);
    socket.emit('players_updated', players);
  });

  // 2. REGISTRO DE JUGADORES
  // Solo se crea un jugador si la conexión NO es el Host registrado
  if (hostSocketId !== socket.id) {
    // Si aún no se registró como Host en los primeros ms, verificamos en el siguiente ciclo del event-loop
    setImmediate(() => {
      if (socket.isHost) return;

      const playerKeys = Object.keys(players);
      if (playerKeys.length < 4 && !players[socket.id]) {
        const playerIndex = playerKeys.length + 1;
        players[socket.id] = {
          playerIndex: playerIndex,
          color: colors[playerKeys.length]
        };
        console.log(`📱 Jugador ${playerIndex} asignado al celular ID: ${socket.id}`);
        
        socket.emit('init_player', { player: players[socket.id] });
        io.emit('players_updated', players);
      }
    });
  }

  socket.on('get_current_players', () => {
    socket.emit('players_updated', players);
  });

  socket.on('player_input', (data) => {
    // Solo enviamos los inputs al Host para evitar broadcast innecesario a los demás celulares
    if (hostSocketId) {
      io.to(hostSocketId).emit('host_process_input', {
        socketId: socket.id,
        action: data.action,
        eventType: data.eventType
      });
    }
  });

  socket.on('cambiar_nivel', (levelNum) => {
    io.emit('change_level', levelNum);
  });

  socket.on('level_completed', (nextLevel) => {
    io.emit('change_level', nextLevel);
  });

  socket.on('disconnect', () => {
    console.log('❌ Dispositivo desconectado:', socket.id);
    if (socket.id === hostSocketId) {
      hostSocketId = null;
    }
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('players_updated', players);
    }
  });
});

const PORT = 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});