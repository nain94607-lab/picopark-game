import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { io } from 'socket.io-client';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  const [ipAddress, setIpAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Mantener la pantalla encendida
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => { deactivateKeepAwakeAsync(); };
  }, []);

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
    });

    newSocket.on('error_message', (msg) => {
      alert(msg);
      newSocket.disconnect();
    });
  };

  // Transmisión de Eventos keydown / keyup
  const sendInput = (action, type) => {
    if (socket && connected) {
      socket.emit('player_input', { action, eventType: type });
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
    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Se requieren permisos de cámara</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Conceder Permisos</Text>
          </TouchableOpacity>
        </View>
      );
    }

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
            placeholder="Ej: 192.168.1.15:3000"
            placeholderTextColor="#888"
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.btn} onPress={() => connectToServer(ipAddress)}>
            <Text style={styles.btnText}>Conectar Manualmente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.qrBtn]} onPress={() => setScanning(true)}>
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

      {/* HEADER DE ESTADO Y LED VIRTUAL */}
      <View style={styles.header}>
        <View style={styles.statusGroup}>
          <View style={[styles.led, { backgroundColor: connected ? '#00FF66' : '#FF0000' }]} />
          <Text style={styles.statusText}>
            {connected ? `Jugador ${playerInfo?.playerIndex || ''} Conectado` : 'Desconectado'}
          </Text>
        </View>

        <TouchableOpacity style={styles.disconnectBtn} onPress={() => socket?.disconnect()}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* CONTROLES TÁCTILES */}
      <View style={styles.controlsArea}>
        {/* D-PAD A LA IZQUIERDA */}
        <View style={styles.dpad}>
          <TouchableOpacity
            style={styles.dpadBtn}
            onPressIn={() => sendInput('left', 'keydown')}
            onPressOut={() => sendInput('left', 'keyup')}
          >
            <Text style={styles.arrowText}>◄</Text>
          </TouchableOpacity>

          <View style={styles.dpadSpacer} />

          <TouchableOpacity
            style={styles.dpadBtn}
            onPressIn={() => sendInput('right', 'keydown')}
            onPressOut={() => sendInput('right', 'keyup')}
          >
            <Text style={styles.arrowText}>►</Text>
          </TouchableOpacity>
        </View>

        {/* BOTÓN A (SALTO) A LA DERECHA */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPressIn={() => sendInput('jump', 'keydown')}
            onPressOut={() => sendInput('jump', 'keyup')}
          >
            <Text style={styles.actionBtnText}>A</Text>
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Salto</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', justifyContent: 'center', alignItems: 'center', padding: 20 },
  gamepadContainer: { flex: 1, padding: 15, justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 30 },
  ipBox: { width: '100%', maxWidth: 320, backgroundColor: '#1e1e24', padding: 20, borderRadius: 10 },
  label: { color: '#CCC', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#2b2b36', color: '#FFF', padding: 12, borderRadius: 6, marginBottom: 15, fontSize: 16 },
  btn: { backgroundColor: '#007bff', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
  qrBtn: { backgroundColor: '#28a745' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#dc3545', padding: 15, borderRadius: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8 },
  statusGroup: { flexDirection: 'row', alignItems: 'center' },
  led: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { color: '#FFF', fontWeight: 'bold' },
  disconnectBtn: { backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  controlsArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  dpad: { flexDirection: 'row', alignItems: 'center' },
  dpadBtn: { width: 85, height: 85, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 42, borderWidth: 2, borderColor: '#FFF' },
  dpadSpacer: { width: 15 },
  arrowText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  actionGroup: { alignItems: 'center' },
  actionBtn: { width: 110, height: 110, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderRadius: 55, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  actionLabel: { color: '#FFF', marginTop: 5, fontWeight: 'bold', textTransform: 'uppercase' },
  text: { color: '#FFF', fontSize: 16, marginBottom: 10 }
});