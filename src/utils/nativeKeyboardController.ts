type KeyboardPhase = 'closed' | 'opening' | 'open' | 'closing';

interface VirtualKeyboardApi extends EventTarget {
  overlaysContent: boolean;
  boundingRect: DOMRectReadOnly;
}

export interface NativeKeyboardControllerOptions {
  platform: string;
  onHeightChange: (height: number) => void;
  onOpenStart?: () => void;
  onVirtualKeyboardActiveChange?: (active: boolean) => void;
}

function getVirtualKeyboardApi(): VirtualKeyboardApi | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const navigatorWithVirtualKeyboard = navigator as Navigator & {
    virtualKeyboard?: VirtualKeyboardApi;
  };

  return navigatorWithVirtualKeyboard.virtualKeyboard ?? null;
}

function normalizeHeight(height: number): number {
  return Math.max(0, Math.round(height));
}

export async function attachNativeKeyboardController(
  options: NativeKeyboardControllerOptions
): Promise<() => void> {
  const { platform, onHeightChange, onOpenStart, onVirtualKeyboardActiveChange } = options;

  let expectedVisible = false;
  let phase: KeyboardPhase = 'closed';
  let virtualKeyboardDriving = false;
  let removeVirtualKeyboardListener = () => {};

  const setVirtualKeyboardDriving = (active: boolean) => {
    if (virtualKeyboardDriving === active) {
      return;
    }

    virtualKeyboardDriving = active;
    onVirtualKeyboardActiveChange?.(active);
  };

  const applyHeight = (height: number) => {
    onHeightChange(normalizeHeight(height));
  };

  const notifyOpenStart = () => {
    onOpenStart?.();
  };

  const virtualKeyboard = platform === 'android' ? getVirtualKeyboardApi() : null;
  if (virtualKeyboard) {
    try {
      // overlaysContent = true empêche le WebView de se redimensionner quand le clavier
      // s'ouvre (nécessaire avec adjustNothing). L'animation est entièrement gérée par la
      // CSS transition — geometrychange sert uniquement à la détection et à confirmer la
      // fermeture complète.
      virtualKeyboard.overlaysContent = true;

      const handleGeometryChange = () => {
        const height = normalizeHeight(virtualKeyboard.boundingRect.height);

        if (height > 0) {
          setVirtualKeyboardDriving(true);

          // Pendant l'ouverture ou la fermeture, la CSS transition gère l'animation.
          // On n'applique pas les hauteurs intermédiaires pour éviter les saccades.
          if (phase === 'opening' || phase === 'closing') {
            return;
          }

          if (phase === 'closed') {
            // Premier signal d'ouverture avant keyboardWillShow (Android 16).
            // On notifie uniquement ; keyboardWillShow appliquera la hauteur finale.
            notifyOpenStart();
            expectedVisible = true;
            phase = 'opening';
          }

          // phase === 'open' : le clavier était déjà ouvert, hauteur qui change
          // (ex. barre de suggestions). On met à jour.
          if (phase === 'open') {
            applyHeight(height);
          }
          return;
        }

        // height === 0 : clavier entièrement fermé.
        if (!virtualKeyboardDriving) return;

        // Confirme la fin de fermeture et nettoie l'état VK.
        // keyboardWillHide a déjà appliqué 0 pour démarrer la CSS transition.
        expectedVisible = false;
        phase = 'closed';
        setVirtualKeyboardDriving(false);
      };

      virtualKeyboard.addEventListener('geometrychange', handleGeometryChange);
      removeVirtualKeyboardListener = () => {
        virtualKeyboard.removeEventListener('geometrychange', handleGeometryChange);
      };
    } catch {
      setVirtualKeyboardDriving(false);
    }
  }

  const { Keyboard } = await import('@capacitor/keyboard');

  const willShowHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
    if (!expectedVisible) {
      notifyOpenStart();
    }

    expectedVisible = true;
    phase = 'opening';

    // Toujours appliquer la hauteur ici pour déclencher la CSS transition au bon moment,
    // même si la VirtualKeyboard API est active (elle ne pilote plus l'animation).
    applyHeight(info.keyboardHeight ?? 0);
  });

  const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
    if (!expectedVisible || phase === 'closing') {
      return;
    }

    phase = 'open';
    // Correction de la hauteur finale si keyboardWillShow avait une valeur imprécise.
    applyHeight(info.keyboardHeight ?? 0);
  });

  const willHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
    expectedVisible = false;
    phase = 'closing';

    // Toujours appliquer 0 ici pour déclencher la CSS transition au début de la fermeture,
    // quelle que soit la source (VirtualKeyboard API ou non).
    applyHeight(0);
  });

  const didHideHandle = await Keyboard.addListener('keyboardDidHide', () => {
    if (expectedVisible) {
      return;
    }

    phase = 'closed';
    setVirtualKeyboardDriving(false);
    applyHeight(0);
  });

  return () => {
    removeVirtualKeyboardListener();
    willShowHandle.remove();
    didShowHandle.remove();
    willHideHandle.remove();
    didHideHandle.remove();
    setVirtualKeyboardDriving(false);
    applyHeight(0);
  };
}
