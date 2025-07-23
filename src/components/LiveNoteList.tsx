"use client";
import React from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
// Sélecteur Zustand typé, stable, conforme à la directive Jean-Claude
const selectNotes = (s: FileSystemState) => s.notes;

/**
 * LiveNoteList
 * Affiche dynamiquement la liste des notes du store Zustand (useFileSystemStore)
 * L'UI se met à jour en temps réel via les événements WebSocket reçus par AppRealtimeBridge
 *
 * Utilisation :
 *   <LiveNoteList />
 */
export default function LiveNoteList() {
  // Utilisation du sélecteur stable, aucune logique de cache/local state/effect
  const notesObj = useFileSystemStore(selectNotes);
  const noteList = React.useMemo(() => Object.values(notesObj), [notesObj]);
  return (
    <div style={{ maxWidth: 420, margin: '32px auto', padding: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Notes (Zustand + WebSocket)</h2>
      {noteList.length === 0 ? (
        <div style={{ color: '#aaa', fontStyle: 'italic' }}>Aucune note pour l’instant…</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {noteList.map(note => (
            <li key={note.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontWeight: 500 }}>{note.title}</span>
              <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>({note.id.slice(0, 6)})</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 18, fontSize: 13, color: '#888' }}>
        <b>Live</b> : toute modification reçue via WebSocket est reflétée ici en temps réel.<br />
        <b>Exemple Zustand</b> : lecture dynamique du store.
      </div>
    </div>
  );
} 