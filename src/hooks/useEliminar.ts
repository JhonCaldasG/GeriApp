import { useState } from 'react';
import { Alert } from 'react-native';

export function useEliminar() {
  const [eliminando, setEliminando] = useState(false);
  const [exito, setExito] = useState(false);

  function mostrarExito() {
    setExito(true);
    setTimeout(() => setExito(false), 1800);
  }

  function ejecutarEliminacion(
    titulo: string,
    mensaje: string,
    accion: () => Promise<void>,
    onExito?: () => void,
  ) {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setEliminando(true);
          try {
            await accion();
            setEliminando(false);
            if (onExito) {
              onExito();
            } else {
              mostrarExito();
            }
          } catch {
            setEliminando(false);
          }
        },
      },
    ]);
  }

  async function conFeedback(accion: () => Promise<void>) {
    setEliminando(true);
    try {
      await accion();
      setEliminando(false);
      mostrarExito();
    } catch {
      setEliminando(false);
    }
  }

  return { eliminando, exito, ejecutarEliminacion, conFeedback };
}
