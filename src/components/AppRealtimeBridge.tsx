import { useRealtime } from '@/hooks/useRealtime';
import { handleRealtimeEvent } from '@/realtime/dispatcher';

/**
 * AppRealtimeBridge
 * Pont logique entre le WebSocket (useRealtime) et le store Zustand (useFileSystemStore)
 * N'affiche rien, mais synchronise le store en temps réel.
 *
 * Utilisation :
 *   <AppRealtimeBridge wsUrl="wss://ton-backend/ws" token={monTokenJWT} debug={true} />
 */
export default function AppRealtimeBridge({ wsUrl, token, debug = false }: { wsUrl?: string, token: string, debug?: boolean }) {
  useRealtime({
    type: 'websocket',
    wsUrl: wsUrl || process.env.NEXT_PUBLIC_WS_URL || '',
    token,
    debug: true, // Temporairement activé pour debug
    onEvent: (event) => handleRealtimeEvent(event, true) // Temporairement activé pour debug
  });
  return null;
} 