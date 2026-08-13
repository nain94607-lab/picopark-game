const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

// 4 Colores predefinidos para los 4 jugadores
const PLAYER_COLORS = ['#FF4D4D', '#4D79FF', '#4DFF70', '#FFD700'];
const players = {};
let currentLevel = 1;

io.on('connection', (socket) => {
  console.log('🎮 Jugador intentando conectar:', socket.id);

  // Limite de 4 jugadores
  if (Object.keys(players).length >= 4) {
    socket.emit('error_message', 'Servidor lleno (Máximo 4 jugadores)');
    socket.disconnect();
    return;
  }

  // Buscar el primer color disponible
  const assignedColors = Object.values(players).map(p => p.color);
  const color = PLAYER_COLORS.find(c => !assignedColors.includes(c)) || PLAYER_COLORS[0];

  players[socket.id] = {
    id: socket.id,
    color: color,
    playerIndex: Object.keys(players).length + 1
  };

  console.log(`✅ Jugador ${players[socket.id].playerIndex} asignado con color: ${color}`);

  // Notificar al nuevo jugador su asignación y el nivel actual
  socket.emit('init_player', { player: players[socket.id], currentLevel });
  
  // Avisar al Host que se unió un nuevo jugador
  io.emit('players_updated', players);

  // Recibir entradas de control (Izquierda, Derecha, Salto)
  socket.on('player_input', (inputData) => {
    // Reemitir el input al Host de pantalla para que procese la física
    io.emit('host_process_input', { socketId: socket.id, ...inputData });
  });

  // Cambiar de nivel cuando se completa la meta
  socket.on('level_completed', (nextLevel) => {
    currentLevel = nextLevel;
    io.emit('change_level', currentLevel);
  });

  socket.on('disconnect', () => {
    console.log('❌ Jugador desconectado:', socket.id);
    delete players[socket.id];
    io.emit('players_updated', players);
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Servidor Pico Park escuchando en red local en puerto 3000');
});