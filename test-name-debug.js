#!/usr/bin/env node

/**
 * 🧪 TEST NAME DEBUG
 * 
 * Ce script fait un appel simple pour déclencher un tool call
 * et voir les logs de debug du name.
 */

// Utiliser fetch natif de Node.js

console.log('🧪 TESTING NAME DEBUG LOGS...\n');

async function testToolCall() {
  try {
    // Simuler un appel de chat avec un tool call
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        sessionId: 'test-session',
        message: 'liste mes classeurs stp',
        agentId: 'test-agent'
      })
    });

    console.log('✅ Test envoyé !');
    console.log('📋 Regardez les logs du serveur pour voir les debug logs du name');
    console.log('🔍 Cherchez les logs avec 🔍 pour tracer le name');
    
  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

testToolCall(); 