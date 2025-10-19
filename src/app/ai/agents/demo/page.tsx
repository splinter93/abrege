/**
 * Page de démonstration du système de templates d'agents
 * Permet de tester et valider le fonctionnement des templates
 */

import React from 'react';
import AgentTemplateDemo from '@/components/agents/AgentTemplateDemo';

export default function AgentTemplateDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎯 Démonstration du Système de Templates d'Agents
          </h1>
          <p className="text-lg text-gray-600">
            Testez et configurez vos agents avec des templates personnalisés
          </p>
          <div className="mt-4">
            <a 
              href="/agents" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              ← Retour à la gestion des agents
            </a>
          </div>
        </div>
        
        <AgentTemplateDemo />
      </div>
    </div>
  );
} 