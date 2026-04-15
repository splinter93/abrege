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
  // Dernière hauteur envoyée à onHeightChange — permet de détecter la direction
  // du clavier via geometrychange (hausse = ouverture, baisse = fermeture).
  let lastAppliedHeight = 0;
  let removeVirtualKeyboardListener = () => {};

  const setVirtualKeyboardDriving = (active: boolean) => {
    if (virtualKeyboardDriving === active) {
      return;
    }

    virtualKeyboardDriving = active;
    onVirtualKeyboardActiveChange?.(active);
  };

  const applyHeight = (height: number) => {
    const normalized = normalizeHeight(height);
    lastAppliedHeight = normalized;
    onHeightChange(normalized);
  };

  const notifyOpenStart = () => {
    onOpenStart?.();
  };

  const virtualKeyboard = platform === 'android' ? getVirtualKeyboardApi() : null;
  if (virtualKeyboard) {
    try {
      // overlaysContent = true empêche le WebView de se redimensionner (nécessaire
      // avec adjustNothing sur Android 15+). L'animation reste gérée par la CSS
      // transition ; geometrychange sert à la détection précise du début de fermeture.
      virtualKeyboard.overlaysContent = true;

      const handleGeometryChange = () => {
        const height = normalizeHeight(virtualKeyboard.boundingRect.height);

        if (height > 0) {
          setVirtualKeyboardDriving(true);

          // Pendant opening/closing, la CSS transition est déjà en route.
          // Ne pas interférer avec des hauteurs intermédiaires.
          if (phase === 'opening' || phase === 'closing') {
            return;
          }

          if (phase === 'closed') {
            // Signal d'ouverture avant keyboardWillShow (Android 15/16).
            // Notifie le scroll-to-bottom ; keyboardWillShow appliquera la hauteur.
            notifyOpenStart();
            expectedVisible = true;
            phase = 'opening';
            return;
          }

          if (phase === 'open') {
            // Détection précise du début de fermeture via la baisse de hauteur VK.
            // Sur Android, keyboardWillHide peut arriver APRÈS que le clavier a
            // déjà bougé (saccade). geometrychange donne le premier frame exact.
            if (height < lastAppliedHeight - 20) {
              expectedVisible = false;
              phase = 'closing';
              applyHeight(0); // Déclenche la CSS transition immédiatement.
            } else {
              // Mise à jour pendant que le clavier est ouvert (ex. barre de suggestions).
              applyHeight(height);
            }
          }
          return;
        }

        // height === 0 : clavier entièrement fermé.
        if (!virtualKeyboardDriving) return;

        // Clôture de l'état VK. applyHeight(0) a déjà été appelé (par la détection
        // de fermeture ci-dessus ou par keyboardWillHide en fallback).
        expectedVisible = false;
        phase = 'closed';
        setVirtualKeyboardDriving(false);
        if (lastAppliedHeight > 0) {
          applyHeight(0); // Filet de sécurité si applyHeight(0) n'a pas encore eu lieu.
        }
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
    // Applique la hauteur pour déclencher la CSS transition. Même si la VK API
    // a déjà détecté l'ouverture, seul keyboardWillShow connaît la hauteur finale.
    applyHeight(info.keyboardHeight ?? 0);
  });

  const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
    // Guard strict : si le phase a changé suite à un open/close rapide, ignorer.
    // Bug 2 fix : `phase !== 'opening'` empêche un keyboardDidShow tardif (d'un
    // cycle précédent) de plaquer une hauteur > 0 alors que le clavier est fermé.
    if (phase !== 'opening') {
      return;
    }

    phase = 'open';
    // Hauteur finale confirmée — corrige d'éventuelles imprécisions de keyboardWillShow.
    applyHeight(info.keyboardHeight ?? 0);
  });

  const willHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
    // Si geometrychange a déjà détecté et déclenché la fermeture, pas de doublon.
    if (phase === 'closing' || phase === 'closed') {
      return;
    }

    expectedVisible = false;
    phase = 'closing';
    applyHeight(0);
  });

  const didHideHandle = await Keyboard.addListener('keyboardDidHide', () => {
    // Ignorer si le clavier a été rouvert entre temps.
    if (expectedVisible || phase === 'opening' || phase === 'open') {
      return;
    }

    phase = 'closed';
    setVirtualKeyboardDriving(false);
    // Filet de sécurité : garantit que la hauteur est bien à 0.
    if (lastAppliedHeight > 0) {
      applyHeight(0);
    }
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
