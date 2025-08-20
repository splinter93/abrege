"use client";

import { useState } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export const StoreDebugger: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  const classeurs = useFileSystemStore((state) => state.classeurs);
  const folders = useFileSystemStore((state) => state.folders);
  const notes = useFileSystemStore((state) => state.notes);
  const activeClasseurId = useFileSystemStore((state) => state.activeClasseurId);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg z-50"
        title="Debug Store"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-green-400 p-4 rounded-lg shadow-lg z-50 max-w-md max-h-96 overflow-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-semibold">🐛 Store Debugger</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-red-400"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>📚 Classeurs:</strong> {Object.keys(classeurs).length}
          {Object.keys(classeurs).length > 0 && (
            <ul className="ml-2 mt-1">
              {Object.entries(classeurs).map(([id, c]) => (
                <li key={id} className="text-yellow-400">
                  {c.emoji || '📚'} {c.name} (ID: {id.substring(0, 8)}...)
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div>
          <strong>📁 Dossiers:</strong> {Object.keys(folders).length}
          {Object.keys(folders).length > 0 && (
            <ul className="ml-2 mt-1">
              {Object.entries(folders).slice(0, 3).map(([id, f]) => (
                <li key={id} className="text-blue-400">
                  📁 {f.name} (ID: {id.substring(0, 8)}...)
                </li>
              ))}
              {Object.keys(folders).length > 3 && (
                <li className="text-gray-500">... et {Object.keys(folders).length - 3} autres</li>
              )}
            </ul>
          )}
        </div>
        
        <div>
          <strong>📝 Notes:</strong> {Object.keys(notes).length}
          {Object.keys(notes).length > 0 && (
            <ul className="ml-2 mt-1">
              {Object.entries(notes).slice(0, 3).map(([id, n]) => (
                <li key={id} className="text-green-400">
                  📝 {n.source_title} (ID: {id.substring(0, 8)}...)
                </li>
              ))}
              {Object.keys(notes).length > 3 && (
                <li className="text-gray-500">... et {Object.keys(notes).length - 3} autres</li>
              )}
            </ul>
          )}
        </div>
        
        <div>
          <strong>🎯 Active Classeur:</strong> {activeClasseurId ? activeClasseurId.substring(0, 8) + '...' : 'Aucun'}
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-700">
        <button
          onClick={() => {
            console.log('Store State:', {
              classeurs: useFileSystemStore.getState().classeurs,
              folders: useFileSystemStore.getState().folders,
              notes: useFileSystemStore.getState().notes
            });
          }}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white p-1 rounded text-xs"
        >
          📋 Log to Console
        </button>
      </div>
    </div>
  );
}; 