import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

/**
 * FileSystemLiveView
 * Exemple minimal d'intégration temps réel avec useRealtime (WebSocket)
 * - Affiche une liste de notes en temps réel
 * - Gère note.created, note.deleted, note.renamed
 * - Affiche tous les événements reçus en mode debug
 *
 * À adapter pour tester le flux WebSocket brut dans l'app.
 */
export default function FileSystemLiveView({ wsUrl, token, debug = false }: { wsUrl: string, token: string, debug?: boolean }) {
  const [notes, setNotes] = useState<{ id: string, title: string }[]>([]);

  const { /* subscribe, unsubscribe, ... */ } = useRealtime({
    type: 'websocket',
    wsUrl,
    token,
    debug,
    onEvent: (event) => {
      if (debug) console.log('[WS EVENT]', event);
      switch (event.type) {
        case 'note.created':
          setNotes(prev => prev.some(n => n.id === event.payload.id)
            ? prev
            : [...prev, { id: event.payload.id, title: event.payload.title || event.payload.source_title || 'Nouvelle note' }]
          );
          break;
        case 'note.deleted':
          setNotes(prev => prev.filter(n => n.id !== event.payload.id));
          break;
        case 'note.renamed':
          setNotes(prev => prev.map(n => n.id === event.payload.id ? { ...n, title: event.payload.title || event.payload.source_title || n.title } : n));
          break;
        // Ajoute d'autres cas si besoin
        default:
          // Ignorer les autres events
          break;
      }
    }
  });

  return (
    <div style={{ maxWidth: 420, margin: '32px auto', padding: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Notes (temps réel)</h2>
      {notes.length === 0 ? (
        <div style={{ color: '#aaa', fontStyle: 'italic' }}>Aucune note pour l’instant…</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notes.map(note => (
            <li key={note.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontWeight: 500 }}>{note.title}</span>
              <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>({note.id.slice(0, 6)})</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 18, fontSize: 13, color: '#888' }}>
        <b>Debug&nbsp;:</b> tous les événements WebSocket sont affichés dans la console.<br />
        <b>Exemple minimal</b> pour tester le flux temps réel.
      </div>
    </div>
  );
} 