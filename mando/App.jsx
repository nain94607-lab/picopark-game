import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { io } from 'socket.io-client';

// REEMPLAZA CON LA IP LOCAL DE TU PC
const socket = io('http://10.56.2.33:3000');

export default function App() {
  const enviarAccion = (direccion) => {
    socket.emit('movimiento', direccion);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.btn} 
        onPress={() => enviarAccion('IZQUIERDA')}
      >
        <Text style={styles.txt}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.btn, styles.btnSaltar]} 
        onPress={() => enviarAccion('SALTAR')}
      >
        <Text style={styles.txt}>SALTAR</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.btn} 
        onPress={() => enviarAccion('DERECHA')}
      >
        <Text style={styles.txt}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1a1a1a' 
  },
  btn: { 
    backgroundColor: '#333', 
    padding: 25, 
    margin: 10, 
    borderRadius: 12 
  },
  btnSaltar: { 
    backgroundColor: '#007AFF' 
  },
  txt: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  }
});