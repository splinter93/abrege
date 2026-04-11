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
      virtualKeyboard.overlaysContent = true;

      const handleGeometryChange = () => {
        const height = normalizeHeight(virtualKeyboard.boundingRect.height);

        if (height > 0) {
          setVirtualKeyboardDriving(true);

          // Pendant une fermeture, geometrychange peut continuer à émettre des hauteurs
          // positives jusqu'au dernier frame. On les accepte pour suivre le clavier sans
          // requalifier l'état comme une réouverture.
          if (phase === 'closing') {
            applyHeight(height);
            return;
          }

          if (!expectedVisible) {
            notifyOpenStart();
          }

          expectedVisible = true;
          phase = phase === 'open' ? 'open' : 'opening';
          applyHeight(height);
          return;
        }

        if (!virtualKeyboardDriving) {
          return;
        }

        // Ignore les zéros parasites tant qu'on est toujours dans un cycle d'ouverture.
        if (expectedVisible && phase !== 'closing') {
          return;
        }

        expectedVisible = false;
        phase = 'closed';
        setVirtualKeyboardDriving(false);
        applyHeight(0);
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

    if (!virtualKeyboardDriving) {
      applyHeight(info.keyboardHeight ?? 0);
    }
  });

  const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
    if (!expectedVisible || phase === 'closing') {
      return;
    }

    phase = 'open';

    if (!virtualKeyboardDriving) {
      applyHeight(info.keyboardHeight ?? 0);
    }
  });

  const willHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
    expectedVisible = false;
    phase = 'closing';

    if (!virtualKeyboardDriving) {
      applyHeight(0);
    }
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
