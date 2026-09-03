const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir la carpeta 'juego' para que la PC muestre el index.html al entrar a localhost:3000
app.use(express.static(path.join(__dirname, 'juego')));

let players = {};
let colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']; // Colores para los jugadores

io.on('connection', (socket) => {
  console.log('¡Dispositivo conectado con ID:', socket.id);

  // Asignar rol de jugador si hay espacio (máximo 4)
  const playerKeys = Object.keys(players);
  if (playerKeys.length < 4) {
    const playerIndex = playerKeys.length + 1;
    players[socket.id] = {
      playerIndex: playerIndex,
      color: colors[playerKeys.length]
    };
    
    // Enviar info de su color y número al celular
    socket.emit('init_player', { player: players[socket.id] });
    
    // Actualizar la lista en la pantalla de la PC (Host)
    io.emit('players_updated', players);
  }

  // Recibir movimiento del celular y mandarlo a la pantalla de la PC
  socket.on('player_input', (data) => {
    io.emit('host_process_input', {
      socketId: socket.id,
      action: data.action,
      eventType: data.eventType
    });
  });

  // Cambiar de nivel desde el celular
  socket.on('cambiar_nivel', (levelNum) => {
    io.emit('change_level', levelNum);
  });

  // Si se completó el nivel en la PC
  socket.on('level_completed', (nextLevel) => {
    io.emit('change_level', nextLevel);
  });

  // Al desconectarse el celular o la PC
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
  console.log(`Servidor corriendo con éxito en http://localhost:${PORT}`);
});