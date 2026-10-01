<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pico Park Host - Motor de Juego</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #18181c; color: white; text-align: center; margin: 0; padding: 10px; }
    #canvas-container { display: flex; justify-content: center; margin-top: 10px; }
    canvas { border: 4px solid #fff; border-radius: 6px; background: #222; }
    .status-bar { display: flex; justify-content: space-around; width: 800px; margin: 0 auto; background: #2a2a32; padding: 10px; border-radius: 6px; align-items: center; }
    
    #qr-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(30, 30, 36, 0.95);
      border: 2px solid #3b82f6;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      z-index: 1000;
      text-align: center;
    }
    #qrcode {
      background: white;
      padding: 10px;
      border-radius: 6px;
      display: inline-block;
      margin-top: 8px;
    }
    .ip-text {
      color: #38bdf8;
      font-weight: bold;
      font-size: 16px;
      margin-top: 5px;
    }

    #pauseOverlay {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      border: 3px solid #dc2626;
      padding: 30px 50px;
      border-radius: 12px;
      z-index: 2000;
      font-size: 32px;
      font-weight: bold;
      color: #fff;
      letter-spacing: 2px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.7);
    }
  </style>

  <!-- Motor Físico Matter.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
  <!-- Librería QRCode.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body>

  <h1>🎮 Pico Park - Host (Pantalla Principal)</h1>

  <div id="pauseOverlay">⏸ JUEGO PAUSADO</div>

  <div id="qr-overlay">
    <div style="font-size: 14px; font-weight: bold; color: #fff;">📱 ESCANEA PARA UNIRTE</div>
    <div id="qrcode"></div>
    <div class="ip-text" id="lblIpAddress">Cargando IP...</div>
  </div>

  <div class="status-bar">
    <div>Nivel Actual: <span id="lblLevel" style="color:#00e676; font-weight:bold;">1</span></div>
    <div>Jugadores Conectados: <span id="lblPlayerCount">0</span> / 4</div>
    <div>Estado Llave: <span id="lblKeyStatus" style="color:#ffea00;">En el Mapa</span></div>
  </div>

  <div id="canvas-container"></div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();

    socket.emit('register_host');

    const HOST_IP = "10.56.2.33";
    const PORT = window.location.port || '3000';
    const currentHostUrl = `http://${HOST_IP}:${PORT}/`;

    document.getElementById('lblIpAddress').innerText = `${HOST_IP}:${PORT}`;

    new QRCode(document.getElementById("qrcode"), {
      text: currentHostUrl,
      width: 128,
      height: 128,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });

    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter;

    const engine = Engine.create({ gravity: { x: 0, y: 1.4 } });
    const container = document.getElementById('canvas-container');

    const render = Render.create({
      element: container,
      engine: engine,
      options: { width: 800, height: 500, wireframes: false, background: '#1e1e24' }
    });

    Render.run(render);
    const runner = Runner.create({ fps: 60 });
    Runner.run(runner, engine);

    let level = 1;
    let playersBodies = {};
    let keyBody = null;
    let doorBody = null;
    let hazardBody = null;
    let hasKey = false;
    let isPaused = false;

    function loadLevel(lvl) {
      level = lvl;
      document.getElementById('lblLevel').innerText = level;
      hasKey = false;
      document.getElementById('lblKeyStatus').innerText = "En el Mapa";

      // Limpiar completamente el mundo físico y el registro de jugadores
      Composite.clear(engine.world, false);
      playersBodies = {};

      const leftWall  = Bodies.rectangle(10, 250, 20, 500, { isStatic: true, render: { fillStyle: '#334155' } });
      const rightWall = Bodies.rectangle(790, 250, 20, 500, { isStatic: true, render: { fillStyle: '#334155' } });
      const ceiling   = Bodies.rectangle(400, 10, 800, 20, { isStatic: true, render: { fillStyle: '#334155' } });

      let levelBodies = [leftWall, rightWall, ceiling];

      if (level === 1) {
        const startGround = Bodies.rectangle(120, 480, 220, 30, { isStatic: true, render: { fillStyle: '#475569' } });
        const endGround   = Bodies.rectangle(680, 480, 220, 30, { isStatic: true, render: { fillStyle: '#475569' } });
        const plat1       = Bodies.rectangle(280, 415, 110, 20, { isStatic: true, render: { fillStyle: '#64748b' } });
        const plat2       = Bodies.rectangle(450, 345, 130, 20, { isStatic: true, render: { fillStyle: '#64748b' } });

        hazardBody = Bodies.rectangle(400, 495, 340, 15, { isStatic: true, isSensor: true, render: { fillStyle: '#ef4444' } });
        keyBody    = Bodies.rectangle(450, 300, 25, 25, { isStatic: true, isSensor: true, render: { fillStyle: '#eab308' } });
        doorBody   = Bodies.rectangle(730, 425, 40, 80, { isStatic: true, isSensor: true, render: { fillStyle: '#2563eb' } });

        levelBodies.push(startGround, endGround, plat1, plat2, hazardBody, keyBody, doorBody);

      } else if (level === 2) {
        const startGround = Bodies.rectangle(90, 480, 140, 30, { isStatic: true, render: { fillStyle: '#475569' } });
        const plat1       = Bodies.rectangle(220, 410, 90, 20,  { isStatic: true, render: { fillStyle: '#64748b' } });
        const plat2       = Bodies.rectangle(350, 320, 90, 20,  { isStatic: true, render: { fillStyle: '#64748b' } });
        const plat3       = Bodies.rectangle(490, 240, 110, 20, { isStatic: true, render: { fillStyle: '#64748b' } });
        const plat4       = Bodies.rectangle(630, 330, 90, 20,  { isStatic: true, render: { fillStyle: '#64748b' } });
        const endGround   = Bodies.rectangle(730, 480, 120, 30, { isStatic: true, render: { fillStyle: '#475569' } });

        hazardBody = Bodies.rectangle(410, 495, 500, 15, { isStatic: true, isSensor: true, render: { fillStyle: '#ef4444' } });
        keyBody    = Bodies.rectangle(490, 195, 25, 25, { isStatic: true, isSensor: true, render: { fillStyle: '#eab308' } });
        doorBody   = Bodies.rectangle(735, 425, 40, 80, { isStatic: true, isSensor: true, render: { fillStyle: '#2563eb' } });

        levelBodies.push(startGround, plat1, plat2, plat3, plat4, endGround, hazardBody, keyBody, doorBody);
      }

      Composite.add(engine.world, levelBodies);
      socket.emit('get_current_players');
    }

    // Actualización de movimiento de físicas
    Events.on(engine, 'beforeUpdate', () => {
      if (isPaused) return;

      for (let id in playersBodies) {
        const p = playersBodies[id];
        if (!p || !p.body) continue;

        let moveX = 0;
        if (p.inputs.left) moveX -= 4.5;
        if (p.inputs.right) moveX += 4.5;

        // Si no hay input activo, la velocidad X es 0 estricta
        Body.setVelocity(p.body, { x: moveX, y: p.body.velocity.y });

        if (p.inputs.jump && Math.abs(p.body.velocity.y) < 0.2) {
          Body.setVelocity(p.body, { x: p.body.velocity.x, y: -8.5 });
          p.inputs.jump = false;
        }
      }
    });

    Events.on(engine, 'collisionStart', (event) => {
      if (isPaused) return;

      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        if (bodyA === hazardBody || bodyB === hazardBody) {
          document.getElementById('lblKeyStatus').innerText = "💀 ¡Caíste en la lava!";
          setTimeout(() => {
            loadLevel(level);
          }, 150);
          return;
        }

        const isKeyA = bodyA === keyBody;
        const isKeyB = bodyB === keyBody;
        if ((isKeyA || isKeyB) && !hasKey) {
          const otherBody = isKeyA ? bodyB : bodyA;
          if (!otherBody.isStatic) {
            hasKey = true;
            document.getElementById('lblKeyStatus').innerText = "🔑 ¡Llave Obtenida!";
            Composite.remove(engine.world, keyBody);
          }
        }

        const isDoorA = bodyA === doorBody;
        const isDoorB = bodyB === doorBody;
        if ((isDoorA || isDoorB) && hasKey) {
          const otherBody = isDoorA ? bodyB : bodyA;
          if (!otherBody.isStatic) {
            checkWinCondition();
          }
        }
      });
    });

    function checkWinCondition() {
      let countNearDoor = 0;
      const playerKeys = Object.keys(playersBodies);

      playerKeys.forEach(id => {
        const p = playersBodies[id];
        if (Math.abs(p.body.position.x - doorBody.position.x) < 60) {
          countNearDoor++;
        }
      });

      if (countNearDoor >= playerKeys.length && playerKeys.length > 0) {
        if (level === 1) {
          alert(`🎉 ¡NIVEL 1 COMPLETADO! Pasando al Nivel 2...`);
          loadLevel(2);
        } else {
          alert(`🎉 ¡FELICITACIONES! Completaron el Nivel 2 y ganaron el juego.`);
          loadLevel(1);
        }
      }
    }

    // Sincronización estricta de jugadores enviados por el Servidor
    socket.on('players_updated', (serverPlayers) => {
      document.getElementById('lblPlayerCount').innerText = Object.keys(serverPlayers).length;

      // 1. Eliminar cuerpos de jugadores que ya no existen en el servidor
      for (let id in playersBodies) {
        if (!serverPlayers[id]) {
          Composite.remove(engine.world, playersBodies[id].body);
          delete playersBodies[id];
        }
      }

      // 2. Crear un único cuerpo por cada jugador activo
      for (let id in serverPlayers) {
        if (!playersBodies[id]) {
          const sp = serverPlayers[id];
          const playerBody = Bodies.rectangle(60 + (sp.playerIndex * 35), 400, 28, 38, {
            inertia: Infinity,
            friction: 0.05,
            render: { fillStyle: sp.color }
          });
          Composite.add(engine.world, playerBody);
          playersBodies[id] = { 
            body: playerBody, 
            color: sp.color, 
            inputs: { left: false, right: false, jump: false } 
          };
        }
      }
    });

    // Procesamiento de entradas (keydown / keyup)
    socket.on('host_process_input', (data) => {
      if (data.action === 'pause') {
        isPaused = !isPaused;
        const pauseBox = document.getElementById('pauseOverlay');
        if (pauseBox) {
          pauseBox.style.display = isPaused ? 'block' : 'none';
        }
        return;
      }

      if (isPaused) return;

      const p = playersBodies[data.socketId];
      if (!p) return;

      const isPressed = (data.eventType === 'keydown');

      if (data.action === 'left') {
        p.inputs.left = isPressed;
        if (!isPressed) p.inputs.left = false;
      }
      if (data.action === 'right') {
        p.inputs.right = isPressed;
        if (!isPressed) p.inputs.right = false;
      }
      if (data.action === 'jump') {
        if (isPressed) {
          p.inputs.jump = true;
        }
      }
    });

    socket.on('change_level', (newLevel) => {
      loadLevel(newLevel);
    });

    loadLevel(1);
  </script>
</body>
</html>