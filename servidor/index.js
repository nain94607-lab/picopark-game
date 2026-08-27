const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, '../juego')));

// Obtener IP Local automáticamente
function obtenerIPLocal() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const ipLocal = obtenerIPLocal();
const COLORES = ['#FF3333', '#33FF57', '#3380FF', '#F39C12'];
let jugadores = {};

// Endpoint para obtener IP y QR
app.get('/info-red', async (req, res) => {
  const urlServer = `http://${ipLocal}:3000`;
  const qrDataUrl = await QRCode.toDataURL(urlServer);
  res.json({ ip: ipLocal, qr: qrDataUrl });
});

io.on('connection', (socket) => {
  // Manejo de Hot-Join: Rechazar si ya hay 4 jugadores
  if (Object.keys(jugadores).length >= 4) {
    socket.emit('error_conexion', 'Servidor lleno. Máximo 4 jugadores.');
    socket.disconnect(true);
    return;
  }

  const coloresUsados = Object.values(jugadores).map(j => j.color);
  const colorDisponible = COLORES.find(c => !coloresUsados.includes(c)) || COLORES[0];

  jugadores[socket.id] = { id: socket.id, color: colorDisponible };

  socket.emit('jugadores_existentes', jugadores);
  io.emit('nuevo_jugador', jugadores[socket.id]);

  socket.on('accion', (data) => {
    io.emit('accion_jugador', { id: socket.id, ...data });
    // Por compatibilidad con el juego actual, emitimos también 'accion' simple si lo requiere
    io.emit('accion', data);
  });

  // Eventos de control de menús y niveles enviados desde el celular
  socket.on('cambiar_nivel', (nivel) => {
    io.emit('cambiar_nivel', nivel);
  });

  socket.on('abrir_menu', () => {
    io.emit('abrir_menu');
  });

  socket.on('ir_a_niveles', () => {
    io.emit('ir_a_niveles');
  });

  // Manejo de desconexión sin crasheo
  socket.on('disconnect', () => {
    delete jugadores[socket.id];
    io.emit('jugador_desconectado', socket.id);
  });
});

server.listen(3000, () => {
  console.log(`🚀 Servidor Pico Park corriendo en http://${ipLocal}:3000`);
});