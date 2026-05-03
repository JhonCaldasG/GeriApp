import { useState } from 'react';
import { Alert } from 'react-native';
import { useToast } from '../context/ToastContext';

export function useEliminar() {
  const [eliminando, setEliminando] = useState(false);
  const { showToast } = useToast();

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
            showToast('', 'error');
            if (onExito) onExito();
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
      showToast('', 'error');
    } catch {
      setEliminando(false);
    }
  }

  return { eliminando, exito: false, ejecutarEliminacion, conFeedback };
}
