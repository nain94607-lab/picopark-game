import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { io } from 'socket.io-client';
import { useKeepAwake } from 'expo-keep-awake';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  useKeepAwake();

  const [ipAddress, setIpAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [btnActivo, setBtnActivo] = useState(null);

  const requestCameraPermission = async () => {
    if (!permission || !permission.granted) {
      const result = await requestPermission();
      if (result.granted) {
        setScanning(true);
      } else {
        alert('Se requieren permisos de cámara para escanear el QR');
      }
    } else {
      setScanning(true);
    }
  };

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
  };

  // Función para desconectarse y volver al menú de IP
  const disconnectFromServer = () => {
    if (socket) {
      socket.disconnect();
    }
    setConnected(false);
    setPlayerInfo(null);
    setSocket(null);
  };

  const sendInput = (action, type) => {
    setBtnActivo(type === 'keydown' ? action : null);
    if (socket && connected) {
      socket.emit('player_input', { action, eventType: type });
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setScanning(false);
    setIpAddress(data);
    connectToServer(data);
  };

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

  return (
    <SafeAreaView style={[styles.gamepadContainer, { backgroundColor: playerInfo?.color || '#18181c' }]}>
      <StatusBar hidden />
      
      {/* Barra superior: 1. Desconectar (Salir), 2. Pausa, 3. Niveles */}
      <View style={styles.topUtilityBar}>
        <TouchableOpacity 
          style={styles.topDisconnectBtn} 
          onPress={disconnectFromServer}
        >
          <Text style={styles.utilityText}>🔌 SALIR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.topPauseBtn} 
          onPress={() => sendInput('pause', 'click')}
        >
          <Text style={styles.utilityText}>⏸ PAUSA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.topLevelBtn} onPress={() => socket?.emit('cambiar_nivel', 1)}>
          <Text style={styles.utilityText}>N1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topLevelBtn} onPress={() => socket?.emit('cambiar_nivel', 2)}>
          <Text style={styles.utilityText}>N2</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topLevelBtn} onPress={() => socket?.emit('cambiar_nivel', 3)}>
          <Text style={styles.utilityText}>N3</Text>
        </TouchableOpacity>
      </View>

      {/* DISEÑO TIPO MANDO DE PLAY: Movimiento a la izquierda y Saltar a la derecha */}
      <View style={styles.controllerLayout}>
        
        {/* ZONA IZQUIERDA: Izquierda y Derecha lado a lado */}
        <View style={styles.dpadSection}>
          <TouchableOpacity
            style={[styles.padBtn, btnActivo === 'left' && styles.boxActive]}
            onPressIn={() => sendInput('left', 'keydown')}
            onPressOut={() => sendInput('left', 'keyup')}
          >
            <Text style={styles.boxText}>◄ IZQ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.padBtn, btnActivo === 'right' && styles.boxActive]}
            onPressIn={() => sendInput('right', 'keydown')}
            onPressOut={() => sendInput('right', 'keyup')}
          >
            <Text style={styles.boxText}>DER ►</Text>
          </TouchableOpacity>
        </View>

        {/* ZONA DERECHA: Botón de Saltar */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.jumpPadBtn, btnActivo === 'jump' && styles.jumpBoxActive]}
            onPressIn={() => sendInput('jump', 'keydown')}
            onPressOut={() => sendInput('jump', 'keyup')}
          >
            <Text style={styles.jumpText}>▲ SALTAR</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', justifyContent: 'center', alignItems: 'center', padding: 20 },
  gamepadContainer: { flex: 1, padding: 10, justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 30 },
  ipBox: { width: '100%', maxWidth: 320, backgroundColor: '#1e1e24', padding: 20, borderRadius: 10 },
  label: { color: '#CCC', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#2b2b36', color: '#FFF', padding: 12, borderRadius: 6, marginBottom: 15, fontSize: 16 },
  btn: { backgroundColor: '#007bff', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
  qrBtn: { backgroundColor: '#28a745' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#dc3545', padding: 15, borderRadius: 8 },

  // Barra superior de utilidad
  topUtilityBar: { flexDirection: 'row', height: 42, gap: 6, marginBottom: 8 },
  topDisconnectBtn: { flex: 1.5, backgroundColor: '#4b5563', justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },
  topPauseBtn: { flex: 1.5, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },
  topLevelBtn: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },
  utilityText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  // Estilo de mando horizontal tipo consola
  controllerLayout: { flex: 1, flexDirection: 'row', gap: 15, alignItems: 'stretch' },
  dpadSection: { flex: 1.2, flexDirection: 'row', gap: 10 },
  actionSection: { flex: 1 },

  padBtn: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 2, borderColor: '#FFF' },
  jumpPadBtn: { flex: 1, backgroundColor: 'rgba(153, 27, 27, 0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 2, borderColor: '#FFF' },

  boxText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  jumpText: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  boxActive: { backgroundColor: '#2563eb' },
  jumpBoxActive: { backgroundColor: '#b91c1c' }
});