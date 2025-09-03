"use client";

import React from 'react';
import { TrashItem } from '@/types/supabase';

interface TestTrashButtonsProps {
  item: TrashItem;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
}

export default function TestTrashButtons({ item, onRestore, onDelete }: TestTrashButtonsProps) {
  const handleRestore = () => {
    console.log('🧪 TEST: Bouton Restaurer cliqué pour:', item);
    onRestore(item);
  };

  const handleDelete = () => {
    console.log('🧪 TEST: Bouton Supprimer cliqué pour:', item);
    onDelete(item);
  };

  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
      <h3>🧪 TEST BOUTONS CORBEILLE</h3>
      <p>Item: {item.name} ({item.type})</p>
      <button 
        onClick={handleRestore}
        style={{ 
          padding: '10px', 
          margin: '5px', 
          backgroundColor: 'green', 
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        🔄 TEST RESTAURER
      </button>
      <button 
        onClick={handleDelete}
        style={{ 
          padding: '10px', 
          margin: '5px', 
          backgroundColor: 'red', 
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        🗑️ TEST SUPPRIMER
      </button>
    </div>
  );
}
