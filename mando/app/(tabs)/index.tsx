import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, StatusBar } from 'react-native';
import { io } from 'socket.io-client';

const socket = io('http://10.56.2.33:3000');

export default function GamepadScreen() {
  const [btnActivo, setBtnActivo] = useState<string | null>(null);

  const enviarAccion = (tipo: string, estado: string) => {
    setBtnActivo(estado === 'PRESS' ? tipo : null);
    socket.emit('accion', { tipo, estado });
  };

  const seleccionarNivel = (num: number) => {
    socket.emit('cambiar_nivel', num);
  };

  const controlarMenu = () => {
    // Envía la orden para abrir el menú principal o salir de la pantalla de victoria
    socket.emit('abrir_menu');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      {/* BARRA SUPERIOR EN EL CELULAR: MENÚ Y NIVELES */}
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
      </View>

      {/* CONTROLES DE MOVIMIENTO Y SALTO */}
      <View style={styles.controlsArea}>
        <View style={styles.leftZone}>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.bigBtn, styles.btnLeft, btnActivo === 'IZQUIERDA' && styles.btnActive]} 
            onPressIn={() => enviarAccion('IZQUIERDA', 'PRESS')}
            onPressOut={() => enviarAccion('IZQUIERDA', 'RELEASE')}
          >
            <Text style={styles.btnText}>◄</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.bigBtn, styles.btnRight, btnActivo === 'DERECHA' && styles.btnActive]} 
            onPressIn={() => enviarAccion('DERECHA', 'PRESS')}
            onPressOut={() => enviarAccion('DERECHA', 'RELEASE')}
          >
            <Text style={styles.btnText}>►</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightZone}>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.bigBtn, styles.btnJump, btnActivo === 'SALTAR' && styles.btnJumpActive]} 
            onPressIn={() => enviarAccion('SALTAR', 'PRESS')}
            onPressOut={() => enviarAccion('SALTAR', 'RELEASE')}
          >
            <Text style={styles.jumpText}>SALTAR</Text>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000',
  },
  topMenu: {
    height: 55,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderColor: '#334155',
    paddingHorizontal: 10,
  },
  btnNav: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnNavText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  separator: {
    width: 2,
    height: 30,
    backgroundColor: '#475569',
    marginHorizontal: 6,
  },
  btnLevel: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnLevelText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  controlsArea: {
    flex: 1,
    flexDirection: 'row',
  },
  leftZone: {
    flex: 1,
    flexDirection: 'row',
  },
  rightZone: {
    flex: 1,
  },
  bigBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLeft: {
    backgroundColor: '#1e293b',
    borderRightWidth: 2,
    borderColor: '#0f172a',
  },
  btnRight: {
    backgroundColor: '#334155',
  },
  btnJump: {
    backgroundColor: '#dc2626',
  },
  btnActive: {
    backgroundColor: '#2563eb',
  },
  btnJumpActive: {
    backgroundColor: '#991b1b',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 50,
    fontWeight: 'bold',
  },
  jumpText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
});