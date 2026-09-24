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
let colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

io.on('connection', (socket) => {
  console.log('¡Dispositivo conectado ID:', socket.id);

  // 1. SI ES EL HOST (LA PC): Marcamos este socket como Host y NO le creamos jugador
  socket.on('register_host', () => {
    socket.isHost = true;
    console.log(`🖥️ Socket ${socket.id} registrado como PANTALLA HOST (No crea jugador)`);
    
    // Si la PC se asignó por error antes de mandar register_host, la borramos
    if (players[socket.id]) {
      delete players[socket.id];
    }
    
    socket.emit('players_updated', players);
  });

  // 2. SI ES UN CELULAR: Solo si NO es Host se le crea un jugador
  setTimeout(() => {
    if (!socket.isHost && !players[socket.id]) {
      const playerKeys = Object.keys(players);
      if (playerKeys.length < 4) {
        const playerIndex = playerKeys.length + 1;
        players[socket.id] = {
          playerIndex: playerIndex,
          color: colors[playerKeys.length]
        };
        console.log(`📱 Jugador ${playerIndex} asignado a celular ID: ${socket.id}`);
        socket.emit('init_player', { player: players[socket.id] });
        io.emit('players_updated', players);
      }
    }
  }, 150);

  socket.on('get_current_players', () => {
    socket.emit('players_updated', players);
  });

  socket.on('player_input', (data) => {
    io.emit('host_process_input', {
      socketId: socket.id,
      action: data.action,
      eventType: data.eventType
    });
  });

  socket.on('cambiar_nivel', (levelNum) => {
    io.emit('change_level', levelNum);
  });

  socket.on('level_completed', (nextLevel) => {
    io.emit('change_level', nextLevel);
  });

  socket.on('disconnect', () => {
    console.log('Dispositivo desconectado:', socket.id);
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('players_updated', players);
    }
  });
});

const PORT = 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});