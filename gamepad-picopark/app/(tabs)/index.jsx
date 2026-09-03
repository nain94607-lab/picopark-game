import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { io } from 'socket.io-client';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import { CameraView } from 'expo-camera';

export default function App() {
  const [ipAddress, setIpAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [btnActivo, setBtnActivo] = useState(null);

  // Mantener la pantalla encendida
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => { deactivateKeepAwakeAsync(); };
  }, []);

  // Solicitar permisos de cámara
  const requestCameraPermission = async () => {
    const { status } = await CameraView.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      setScanning(true);
    } else {
      alert('Se requieren permisos de cámara para escanear el QR');
    }
  };

  // Conectar al Servidor WebSocket
  const connectToServer = (targetIp) => {
    if (!targetIp) return alert('Ingresa una dirección IP válida');
    
    const formattedUrl = targetIp.startsWith('http') 
      ? targetIp 
      : `http://${targetIp.includes(':') ? targetIp : targetIp + ':3000'}`;

    const newSocket = io(formattedUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 5000
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setSocket(newSocket);
      setScanning(false);
    });

    newSocket.on('init_player', (data) => {
      setPlayerInfo(data.player);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      setPlayerInfo(null);
      setSocket(null);
    });

    newSocket.on('error_message', (msg) => {
      alert(msg);
      newSocket.disconnect();
    });
  };

  // Transmisión de Eventos keydown / keyup para movimiento
  const sendInput = (action, type) => {
    setBtnActivo(type === 'keydown' ? action : null);
    if (socket && connected) {
      // Envía compatible con tu servidor viejo y nuevo
      socket.emit('player_input', { action, eventType: type });
      socket.emit('accion', { tipo: action.toUpperCase(), estado: type === 'keydown' ? 'PRESS' : 'RELEASE' });
    }
  };

  // Cambiar de Nivel o Menú desde el celular
  const seleccionarNivel = (num) => {
    if (socket && connected) {
      socket.emit('cambiar_nivel', num);
    }
  };

  const controlarMenu = () => {
    if (socket && connected) {
      socket.emit('abrir_menu');
    }
  };

  // Lectura de QR
  const handleBarCodeScanned = ({ data }) => {
    setScanning(false);
    setIpAddress(data);
    connectToServer(data);
  };

  // MODO ESCÁNER DE CÓDIGO QR
  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <TouchableOpacity style={styles.closeBtn} onPress={() => setScanning(false)}>
          <Text style={styles.btnText}>❌ Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // PANTALLA DE EMPAREJAMIENTO (DESCONECTADO)
  if (!connected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar hidden />
        <Text style={styles.title}>🎮 Pico Park Gamepad</Text>
        
        <View style={styles.ipBox}>
          <Text style={styles.label}>Ingresa la IP del Host (LAN):</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 10.56.2.33:3000"
            placeholderTextColor="#888"
            value={ipAddress}
            onChangeText={setIpAddress}
          />

          <TouchableOpacity style={styles.btn} onPress={() => connectToServer(ipAddress)}>
            <Text style={styles.btnText}>Conectar Manualmente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.qrBtn]} onPress={requestCameraPermission}>
            <Text style={styles.btnText}>📷 Escanear Código QR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // PANTALLA DEL GAMEPAD (CONECTADO)
  return (
    <SafeAreaView style={[styles.gamepadContainer, { backgroundColor: playerInfo?.color || '#18181c' }]}>
      <StatusBar hidden />

      {/* BARRA SUPERIOR: MENÚ Y NIVELES */}
      <View style={styles.topMenu}>
        <TouchableOpacity style={styles.btnNav} onPress={controlarMenu}>
          <Text style={styles.btnNavText}>⏸ MENÚ</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.btnLevel} onPress={() => seleccionarNivel(1)}>
          <Text style={styles.btnLevelText}>N1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnLevel} onPress={() => seleccionarNivel(2)}>
          <Text style={styles.btnLevelText}>N2</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnLevel} onPress={() => seleccionarNivel(3)}>
          <Text style={styles.btnLevelText}>N3</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.disconnectBtn} onPress={() => socket?.disconnect()}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* ZONA DE CONTROLES */}
      <View style={styles.controlsArea}>
        <View style={styles.dpad}>
          <TouchableOpacity
            style={[styles.dpadBtn, btnActivo === 'left' && styles.btnActive]}
            onPressIn={() => sendInput('left', 'keydown')}
            onPressOut={() => sendInput('left', 'keyup')}
          >
            <Text style={styles.arrowText}>◄</Text>
          </TouchableOpacity>

          <View style={styles.dpadSpacer} />

          <TouchableOpacity
            style={[styles.dpadBtn, btnActivo === 'right' && styles.btnActive]}
            onPressIn={() => sendInput('right', 'keydown')}
            onPressOut={() => sendInput('right', 'keyup')}
          >
            <Text style={styles.arrowText}>►</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={[styles.actionBtn, btnActivo === 'jump' && styles.btnJumpActive]}
            onPressIn={() => sendInput('jump', 'keydown')}
            onPressOut={() => sendInput('jump', 'keyup')}
          >
            <Text style={styles.actionBtnText}>SALTAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', justifyContent: 'center', alignItems: 'center', padding: 20 },
  gamepadContainer: { flex: 1, justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 30 },
  ipBox: { width: '100%', maxWidth: 320, backgroundColor: '#1e1e24', padding: 20, borderRadius: 10 },
  label: { color: '#CCC', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#2b2b36', color: '#FFF', padding: 12, borderRadius: 6, marginBottom: 15, fontSize: 16 },
  btn: { backgroundColor: '#007bff', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
  qrBtn: { backgroundColor: '#28a745' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#dc3545', padding: 15, borderRadius: 8 },
  topMenu: {
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnNav: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnNavText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 11,
  },
  separator: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  btnLevel: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnLevelText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  disconnectBtn: { backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 },
  controlsArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  dpad: { flexDirection: 'row', alignItems: 'center' },
  dpadBtn: { width: 85, height: 85, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 42, borderWidth: 2, borderColor: '#FFF' },
  dpadSpacer: { width: 15 },
  arrowText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  actionGroup: { alignItems: 'center' },
  actionBtn: { width: 130, height: 130, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderRadius: 65, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  btnActive: { backgroundColor: '#2563eb' },
  btnJumpActive: { backgroundColor: '#991b1b' }
});