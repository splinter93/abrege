'use client';

import React from 'react';

/**
 * Composant de test pour vérifier que Tailwind fonctionne correctement
 */
export default function TailwindTest() {
  return (
    <div className="p-8 bg-chat-bg-primary text-chat-text-primary min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-chat-accent">
          🎉 Tailwind CSS Setup Test
        </h1>
        
        {/* Test des couleurs du chat */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-effect p-6 rounded-chat-xl">
            <h3 className="text-xl font-semibold mb-3 text-chat-text-primary">
              Glassmorphism
            </h3>
            <p className="text-chat-text-secondary">
              Effet glassmorphism avec backdrop-blur et transparence
            </p>
          </div>
          
          <div className="glass-effect-subtle p-6 rounded-chat-xl">
            <h3 className="text-xl font-semibold mb-3 text-chat-text-primary">
              Glassmorphism Subtle
            </h3>
            <p className="text-chat-text-secondary">
              Version plus subtile de l'effet glassmorphism
            </p>
          </div>
          
          <div className="glass-effect-soft p-6 rounded-chat-xl">
            <h3 className="text-xl font-semibold mb-3 text-chat-text-primary">
              Glassmorphism Soft
            </h3>
            <p className="text-chat-text-secondary">
              Version douce de l'effet glassmorphism
            </p>
          </div>
        </div>
        
        {/* Test des boutons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button className="btn-chat-primary">
            Bouton Primaire
          </button>
          <button className="btn-chat-secondary">
            Bouton Secondaire
          </button>
          <button className="btn-chat-ghost">
            Bouton Ghost
          </button>
        </div>
        
        {/* Test des messages chat */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-end">
            <div className="chat-message-bubble-user">
              Message utilisateur avec Tailwind
            </div>
          </div>
          
          <div className="flex justify-start">
            <div className="chat-message-bubble-assistant">
              <div className="chat-markdown">
                <h2>Message Assistant</h2>
                <p>Ceci est un <strong>message d'assistant</strong> avec du <code>code inline</code> et des styles markdown.</p>
                <ul>
                  <li>Liste à puces</li>
                  <li>Avec Tailwind CSS</li>
                  <li>Fonctionnel</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Test de l'input chat */}
        <div className="chat-input-area">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <textarea 
                className="chat-input-textarea"
                placeholder="Testez l'input chat avec Tailwind..."
                rows={3}
              />
            </div>
            <button className="btn-chat-primary">
              Envoyer
            </button>
          </div>
        </div>
        
        {/* Test des animations */}
        <div className="mt-8 text-center">
          <div className="inline-block animate-pulse-chat bg-chat-error text-white px-4 py-2 rounded-chat-lg">
            Animation de pulsation
          </div>
        </div>
        
        {/* Status */}
        <div className="mt-8 p-4 bg-chat-success/10 border border-chat-success/20 rounded-chat-lg">
          <p className="text-chat-success font-medium">
            ✅ Tailwind CSS est correctement configuré et fonctionnel !
          </p>
        </div>
      </div>
    </div>
  );
}
