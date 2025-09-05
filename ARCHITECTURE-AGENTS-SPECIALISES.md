# 🤖 Architecture Agents Spécialisés - Documentation Complète

## 🎯 **VISION GÉNÉRALE**

Extension du système d'agents existant avec une architecture unifiée permettant de créer, gérer et utiliser des agents spécialisés via une route unique. Chaque agent a un rôle spécifique tout en conservant la richesse de l'infrastructure actuelle.

**Approche Évolutive** : Extension de l'existant plutôt que refonte complète.

---

## 🏗️ **ARCHITECTURE TECHNIQUE**

### **Principe Fondamental**
- **1 Agent = 1 Rôle = 1 Endpoint** (nouveau)
- **Route unique** : `/api/v2/agents/{agentId}` (nouveau)
- **Configuration** : Extension de la table `agents` existante
- **Compatibilité** : Conservation de l'infrastructure actuelle (GroqOrchestrator, templates, etc.)

### **Avantages**
- ✅ **Simplicité** : Route unifiée pour les agents spécialisés
- ✅ **Maintenabilité** : Extension sans casser l'existant
- ✅ **Évolutivité** : Ajout d'agents sans modification de code
- ✅ **Performance** : Réutilisation de l'infrastructure optimisée

---

## 📊 **EXTENSION DE LA TABLE EXISTANTE**

### **Migration : Ajout des Colonnes Manquantes**
```sql
-- Extension de la table agents existante (20+ colonnes déjà présentes)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_name VARCHAR;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_chat_agent BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_endpoint_agent BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS input_schema JSONB;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS output_schema JSONB;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_is_endpoint_agent ON agents(is_endpoint_agent);
CREATE INDEX IF NOT EXISTS idx_agents_is_chat_agent ON agents(is_chat_agent);
```

### **Structure Complète (Existant + Nouveau)**
```sql
-- Table agents (structure actuelle + nouvelles colonnes)
CREATE TABLE agents (
  -- Colonnes existantes (conservées)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,                           -- Nom existant
  provider VARCHAR NOT NULL,                       -- Provider existant
  model VARCHAR NOT NULL,                          -- Modèle existant
  system_instructions TEXT,                        -- Instructions existantes
  context_template TEXT,                           -- Template existant
  api_config JSONB DEFAULT '{}',                   -- Config API existante
  capabilities JSONB DEFAULT '[]',                 -- Capacités existantes
  api_v2_capabilities TEXT[],                      -- Capacités API v2 existantes
  temperature DECIMAL DEFAULT 0.7,                 -- Température existante
  max_tokens INTEGER DEFAULT 4000,                 -- Max tokens existant
  is_active BOOLEAN DEFAULT true,                  -- Statut existant
  priority INTEGER DEFAULT 0,                      -- Priorité existante
  -- ... autres colonnes existantes ...
  
  -- Nouvelles colonnes pour les agents spécialisés
  slug VARCHAR UNIQUE,                             -- "johnny", "formatter", "vision"
  display_name VARCHAR,                            -- "Johnny Query", "Formateur", "Vision"
  description TEXT,                                -- Description de l'agent
  is_chat_agent BOOLEAN DEFAULT false,            -- Visible dans le chat ?
  is_endpoint_agent BOOLEAN DEFAULT true,         -- A un endpoint dédié ?
  input_schema JSONB,                              -- Schéma d'entrée OpenAPI
  output_schema JSONB,                             -- Schéma de sortie OpenAPI
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Exemples de Configuration**

#### **Agent Johnny (Query) - Configuration Complète**
```sql
INSERT INTO agents (
  -- Colonnes existantes (conservées)
  name, provider, model, system_instructions, temperature, max_tokens,
  is_active, priority, capabilities, api_v2_capabilities,
  
  -- Nouvelles colonnes pour agents spécialisés
  slug, display_name, description, is_endpoint_agent, is_chat_agent,
  input_schema, output_schema
) VALUES (
  -- Configuration existante
  'Johnny Query', 'groq', 'deepseek-chat', 
  'Tu es Johnny, un assistant spécialisé dans l''analyse de notes. Tu réponds de manière précise et concise aux questions sur le contenu des notes.',
  0.7, 4000, true, 10,
  '["text", "function_calling"]'::jsonb,
  ARRAY['get_note', 'search_notes', 'list_notes'],
  
  -- Configuration spécialisée
  'johnny', 'Johnny Query', 'Agent spécialisé dans les questions sur les notes',
  true, false,
  '{
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à analyser"},
      "query": {"type": "string", "description": "Question à poser sur la note"}
    },
    "required": ["noteId", "query"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "answer": {"type": "string", "description": "Réponse à la question"}
    }
  }'::jsonb
);
```

#### **Agent Formateur - Configuration Complète**
```sql
INSERT INTO agents (
  -- Colonnes existantes (conservées)
  name, provider, model, system_instructions, temperature, max_tokens,
  is_active, priority, capabilities, api_v2_capabilities,
  
  -- Nouvelles colonnes pour agents spécialisés
  slug, display_name, description, is_endpoint_agent, is_chat_agent,
  input_schema, output_schema
) VALUES (
  -- Configuration existante
  'Formateur', 'groq', 'deepseek-chat',
  'Tu es un expert en mise en forme de documents. Tu reformates le contenu markdown selon les instructions données.',
  0.5, 6000, true, 8,
  '["text", "function_calling"]'::jsonb,
  ARRAY['get_note', 'update_note', 'search_notes'],
  
  -- Configuration spécialisée
  'formatter', 'Formateur', 'Agent spécialisé dans la mise en forme des notes',
  true, false,
  '{
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à formater"},
      "formatInstruction": {"type": "string", "description": "Instructions de mise en forme"}
    },
    "required": ["noteId", "formatInstruction"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "success": {"type": "boolean", "description": "Succès de l''opération"},
      "formattedContent": {"type": "string", "description": "Contenu formaté"}
    }
  }'::jsonb
);
```

---

## 🛠️ **IMPLÉMENTATION TECHNIQUE**

### **1. Route Unique pour les Agents Spécialisés**

#### **Fichier : `src/app/api/v2/agents/[agentId]/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GroqOrchestrator } from '@/services/llm/services/GroqOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

// Client Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const body = await request.json();

  try {
    logger.info(`[Agent ${agentId}] 🚀 Exécution d'un agent spécialisé`);

    // 1. Récupérer l'agent (par slug ou ID)
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .or(`slug.eq.${agentId},id.eq.${agentId}`)
      .eq('is_endpoint_agent', true)
      .eq('is_active', true)
      .single();

    if (error || !agent) {
      logger.warn(`[Agent ${agentId}] ❌ Agent non trouvé`);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Validation du schéma d'entrée
    if (agent.input_schema) {
      const validation = validateInputSchema(body, agent.input_schema);
      if (!validation.valid) {
        return NextResponse.json({ 
          error: 'Invalid input', 
          details: validation.errors 
        }, { status: 400 });
      }
    }

    // 3. Utiliser l'infrastructure existante (GroqOrchestrator)
    const orchestrator = new GroqOrchestrator();
    
    // Préparer le message avec le contexte de l'agent
    const systemMessage = agent.system_instructions || agent.description || '';
    const userMessage = `Tâche spécialisée: ${JSON.stringify(body)}`;
    
    // Exécuter via l'orchestrateur existant
    const result = await orchestrator.executeRound({
      message: userMessage,
      sessionHistory: [],
      agentConfig: agent,
      userToken: 'system', // Token système pour les agents
      sessionId: `agent-${agentId}-${Date.now()}`
    });

    // 4. Formater la réponse selon le schéma de sortie
    const formattedResult = formatOutput(result, agent.output_schema);

    logger.info(`[Agent ${agentId}] ✅ Exécution réussie`);
    return NextResponse.json(formattedResult);

  } catch (error) {
    logger.error(`[Agent ${agentId}] ❌ Erreur:`, error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET pour récupérer les infos de l'agent
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  try {
    const { data: agent } = await supabase
      .from('agents')
      .select('slug, display_name, description, input_schema, output_schema, model, is_active')
      .or(`slug.eq.${agentId},id.eq.${agentId}`)
      .eq('is_endpoint_agent', true)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: agent.display_name,
      description: agent.description,
      model: agent.model,
      input_schema: agent.input_schema,
      output_schema: agent.output_schema,
      is_active: agent.is_active
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Fonctions utilitaires
function validateInputSchema(input: any, schema: any): { valid: boolean; errors: string[] } {
  // Validation basique du schéma JSON
  const errors: string[] = [];
  
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in input)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function formatOutput(result: any, outputSchema: any): any {
  // Formater la réponse selon le schéma de sortie
  if (outputSchema && outputSchema.properties) {
    const formatted: any = {};
    
    // Extraire les propriétés attendues du résultat
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      if (result.content && typeof result.content === 'string') {
        // Pour les agents simples, mettre le contenu dans la première propriété
        if (key === 'answer' || key === 'result' || key === 'response') {
          formatted[key] = result.content;
        }
      }
    }
    
    return formatted;
  }
  
  return { result: result.content || result };
}
```

### **2. Extension du Service Agent Manager Existant**

#### **Fichier : `src/services/agentManager.ts` (Extension)**
```typescript
import { supabase } from '@/supabaseClient';
import { GroqOrchestrator } from './llm/services/GroqOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

export class SpecializedAgentManager {
  private orchestrator: GroqOrchestrator;

  constructor() {
    this.orchestrator = new GroqOrchestrator();
  }

  /**
   * Exécuter un agent spécialisé via l'infrastructure existante
   */
  async executeSpecializedAgent(agentId: string, input: any, userToken: string): Promise<any> {
    try {
      // 1. Récupérer l'agent
      const agent = await this.getAgentByIdOrSlug(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // 2. Préparer le contexte spécialisé
      const systemMessage = this.buildSpecializedSystemMessage(agent, input);
      const userMessage = `Exécution de tâche spécialisée: ${JSON.stringify(input)}`;

      // 3. Utiliser l'orchestrateur existant
      const result = await this.orchestrator.executeRound({
        message: userMessage,
        sessionHistory: [],
        agentConfig: agent,
        userToken,
        sessionId: `specialized-${agentId}-${Date.now()}`
      });

      // 4. Formater selon le schéma de sortie
      return this.formatSpecializedOutput(result, agent.output_schema);

    } catch (error) {
      logger.error(`[SpecializedAgentManager] ❌ Erreur exécution ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un agent par ID ou slug
   */
  private async getAgentByIdOrSlug(agentId: string) {
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .or(`slug.eq.${agentId},id.eq.${agentId}`)
      .eq('is_endpoint_agent', true)
      .eq('is_active', true)
      .single();

    return agent;
  }

  /**
   * Construire le message système spécialisé
   */
  private buildSpecializedSystemMessage(agent: any, input: any): string {
    let systemMessage = agent.system_instructions || agent.description || '';
    
    // Ajouter le contexte spécialisé
    if (agent.input_schema && agent.input_schema.properties) {
      systemMessage += `\n\nContexte de la tâche spécialisée:\n`;
      for (const [key, schema] of Object.entries(agent.input_schema.properties)) {
        if (input[key]) {
          systemMessage += `- ${key}: ${input[key]}\n`;
        }
      }
    }

    return systemMessage;
  }

  /**
   * Formater la sortie selon le schéma
   */
  private formatSpecializedOutput(result: any, outputSchema: any): any {
    if (!outputSchema || !outputSchema.properties) {
      return { result: result.content || result };
    }

    const formatted: any = {};
    
    // Mapper les propriétés du schéma
    for (const [key, schema] of Object.entries(outputSchema.properties)) {
      if (key === 'answer' || key === 'result' || key === 'response') {
        formatted[key] = result.content || result.message || 'Tâche exécutée';
      } else if (key === 'success') {
        formatted[key] = result.success !== false;
      }
    }

    return formatted;
  }
}
```

### **3. Interface Agent Spécialisé (Extension de l'Existant)**

#### **Fichier : `src/types/specializedAgents.ts` (Nouveau)**
```typescript
export interface SpecializedAgentConfig {
  // Colonnes existantes (conservées)
  id: string;
  name: string;
  provider: string;
  model: string;
  system_instructions?: string;
  context_template?: string;
  api_config: Record<string, any>;
  capabilities: string[];
  api_v2_capabilities?: string[];
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  priority: number;
  
  // Nouvelles colonnes pour agents spécialisés
  slug?: string;
  display_name?: string;
  description?: string;
  is_chat_agent?: boolean;
  is_endpoint_agent?: boolean;
  input_schema?: any;
  output_schema?: any;
}

export interface SpecializedAgentRequest {
  agentId: string;
  input: any;
  userToken: string;
}

export interface SpecializedAgentResponse {
  success: boolean;
  result?: any;
  error?: string;
}
```

---

## 🎨 **INTERFACE DE GESTION**

### **Extension de l'API UI Existante**

#### **Endpoints UI (Existant + Extension) :**
```
GET    /api/ui/agents                    → Liste tous les agents (existant)
GET    /api/ui/agents/{id}               → Détails d'un agent (existant)
POST   /api/ui/agents                    → Créer un agent (existant)
PUT    /api/ui/agents/{id}               → Modifier un agent (existant)
DELETE /api/ui/agents/{id}               → Supprimer un agent (existant)

# Nouveaux endpoints pour agents spécialisés
GET    /api/ui/agents/specialized        → Liste des agents spécialisés
POST   /api/ui/agents/specialized        → Créer un agent spécialisé
PUT    /api/ui/agents/specialized/{id}   → Modifier un agent spécialisé
```

### **1. Extension de la Route GET (Liste)**

#### **Fichier : `src/app/api/ui/agents/route.ts` (Extension)**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialized = searchParams.get('specialized') === 'true';

    logger.info(`[Agents API] 🚀 Récupération des agents${specialized ? ' spécialisés' : ''}`);

    let query = supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Filtrer les agents spécialisés si demandé
    if (specialized) {
      query = query.eq('is_endpoint_agent', true);
    }

    const { data: agents, error } = await query;

    if (error) {
      logger.error('[Agents API] ❌ Erreur récupération agents:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des agents' },
        { status: 500 }
      );
    }

    logger.info(`[Agents API] ✅ ${agents?.length || 0} agents récupérés`);
    
    return NextResponse.json({
      success: true,
      agents: agents || [],
      specialized: specialized
    });

  } catch (error) {
    logger.error('[Agents API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
```

### **2. Extension de la Route POST (Création)**

#### **Fichier : `src/app/api/ui/agents/route.ts` (Extension)**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, model, system_instructions, provider = 'groq',
      // Nouvelles propriétés pour agents spécialisés
      slug, display_name, description, is_endpoint_agent = false,
      input_schema, output_schema, is_chat_agent = false
    } = body;

    logger.info('[Agents API] 🚀 Création d\'un agent');
    
    // Validation basique
    if (!name || !model || !system_instructions) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['name', 'model', 'system_instructions'] },
        { status: 400 }
      );
    }

    // Validation des agents spécialisés
    if (is_endpoint_agent && (!slug || !display_name)) {
      return NextResponse.json(
        { error: 'Pour les agents spécialisés, slug et display_name sont requis' },
        { status: 400 }
      );
    }

    const agentData = {
      // Propriétés existantes
      name,
      model,
      provider,
      system_instructions,
      is_active: true,
      priority: 1,
      temperature: 0.7,
      max_tokens: 8000,
      capabilities: ['text', 'function_calling'],
      api_v2_capabilities: ['get_note', 'update_note', 'search_notes'],
      
      // Nouvelles propriétés pour agents spécialisés
      slug: slug || null,
      display_name: display_name || name,
      description: description || null,
      is_endpoint_agent: is_endpoint_agent || false,
      is_chat_agent: is_chat_agent || false,
      input_schema: input_schema || null,
      output_schema: output_schema || null
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) {
      logger.error('[Agents API] ❌ Erreur création agent:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'agent' },
        { status: 500 }
      );
    }

    logger.info(`[Agents API] ✅ Agent créé: ${agent.name} (ID: ${agent.id})`);
    
    return NextResponse.json({
      success: true,
      agent
    });

  } catch (error) {
    logger.error('[Agents API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
```

### **3. Route Spécialisée pour les Agents Endpoint**

#### **Fichier : `src/app/api/ui/agents/specialized/route.ts` (Nouveau)**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    logger.info('[Specialized Agents API] 🚀 Récupération des agents spécialisés');

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_endpoint_agent', true)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      logger.error('[Specialized Agents API] ❌ Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des agents spécialisés' },
        { status: 500 }
      );
    }

    logger.info(`[Specialized Agents API] ✅ ${agents?.length || 0} agents spécialisés récupérés`);
    
    return NextResponse.json({
      success: true,
      agents: agents || []
    });

  } catch (error) {
    logger.error('[Specialized Agents API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      slug, display_name, description, model, system_instructions,
      input_schema, output_schema, provider = 'groq'
    } = body;

    logger.info('[Specialized Agents API] 🚀 Création d\'un agent spécialisé');

    // Validation spécifique aux agents spécialisés
    if (!slug || !display_name || !model || !system_instructions) {
      return NextResponse.json(
        { 
          error: 'Paramètres manquants', 
          required: ['slug', 'display_name', 'model', 'system_instructions'] 
        },
        { status: 400 }
      );
    }

    const agentData = {
      // Configuration de base
      name: display_name, // Utiliser display_name comme name pour compatibilité
      slug,
      display_name,
      description,
      model,
      provider,
      system_instructions,
      
      // Configuration spécialisée
      is_endpoint_agent: true,
      is_chat_agent: false,
      is_active: true,
      priority: 10, // Priorité élevée pour les agents spécialisés
      temperature: 0.7,
      max_tokens: 4000,
      capabilities: ['text', 'function_calling'],
      api_v2_capabilities: ['get_note', 'update_note', 'search_notes'],
      
      // Schémas OpenAPI
      input_schema: input_schema || {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Données d\'entrée' }
        }
      },
      output_schema: output_schema || {
        type: 'object',
        properties: {
          result: { type: 'string', description: 'Résultat de l\'agent' }
        }
      }
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) {
      logger.error('[Specialized Agents API] ❌ Erreur création:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'agent spécialisé' },
        { status: 500 }
      );
    }

    logger.info(`[Specialized Agents API] ✅ Agent spécialisé créé: ${agent.slug} (ID: ${agent.id})`);
    
    return NextResponse.json({
      success: true,
      agent,
      endpoint: `/api/v2/agents/${agent.slug}`
    });

  } catch (error) {
    logger.error('[Specialized Agents API] ❌ Erreur fatale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
```

### **4. Interface Utilisateur Enrichie**

#### **Page de Gestion des Agents (Extension)**
```tsx
// src/app/private/agents/page.tsx (Extension)
'use client';

import { useState, useEffect } from 'react';
import { useAgentManager } from '@/hooks/useAgentManager';

export default function AgentsPage() {
  const { agents, loading, createAgent, updateAgent } = useAgentManager();
  const [editingAgent, setEditingAgent] = useState(null);
  const [showSpecialized, setShowSpecialized] = useState(false);

  const fetchSpecializedAgents = async () => {
    const response = await fetch('/api/ui/agents/specialized');
    const data = await response.json();
    return data.agents || [];
  };

  const handleSaveAgent = async (agentData) => {
    try {
    if (agentData.id) {
      // Update
        await updateAgent(agentData.id, agentData);
    } else {
      // Create
        await createAgent(agentData);
      }
      setEditingAgent(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleCreateSpecialized = async (agentData) => {
    try {
      const response = await fetch('/api/ui/agents/specialized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });
    
      if (response.ok) {
        const result = await response.json();
        console.log('Agent spécialisé créé:', result.endpoint);
    setEditingAgent(null);
      }
    } catch (error) {
      console.error('Erreur création agent spécialisé:', error);
    }
  };

  return (
    <div className="agents-management">
      <div className="header">
      <h1>Gestion des Agents IA</h1>
        <div className="controls">
          <button 
            className={showSpecialized ? 'active' : ''}
            onClick={() => setShowSpecialized(!showSpecialized)}
          >
            {showSpecialized ? 'Tous les agents' : 'Agents spécialisés'}
          </button>
          <button onClick={() => setEditingAgent({})}>
            + Créer un agent
          </button>
          <button onClick={() => setEditingAgent({ isSpecialized: true })}>
            + Créer un agent spécialisé
          </button>
        </div>
      </div>
      
      {/* Liste des agents */}
      <div className="agents-list">
        {agents.map(agent => (
          <AgentCard 
            key={agent.id} 
            agent={agent}
            isSpecialized={showSpecialized}
            onEdit={() => setEditingAgent(agent)}
            onDelete={() => deleteAgent(agent.id)}
          />
        ))}
      </div>

      {/* Modal d'édition */}
      {editingAgent && (
        <AgentEditModal 
          agent={editingAgent}
          isSpecialized={editingAgent.isSpecialized}
          onSave={editingAgent.isSpecialized ? handleCreateSpecialized : handleSaveAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
```

#### **Composant d'Édition Enrichi**
```tsx
// src/components/AgentEditModal.tsx (Extension)
export function AgentEditModal({ agent, isSpecialized = false, onSave, onClose }) {
  const [formData, setFormData] = useState({
    // Propriétés existantes
    name: agent.name || '',
    model: agent.model || 'deepseek-chat',
    provider: agent.provider || 'groq',
    system_instructions: agent.system_instructions || '',
    temperature: agent.temperature || 0.7,
    max_tokens: agent.max_tokens || 4000,
    
    // Nouvelles propriétés pour agents spécialisés
    slug: agent.slug || '',
    display_name: agent.display_name || agent.name || '',
    description: agent.description || '',
    is_endpoint_agent: agent.is_endpoint_agent || isSpecialized,
    is_chat_agent: agent.is_chat_agent || false,
    input_schema: agent.input_schema || null,
    output_schema: agent.output_schema || null,
    
    // Propriétés existantes
    ...agent
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>{isSpecialized ? 'Créer un Agent Spécialisé' : 'Modifier l\'Agent'}</h2>
        
        {/* Configuration de base */}
        <div className="form-section">
          <h3>Configuration de base</h3>
          
          <div className="form-group">
            <label>Nom de l'agent</label>
            <input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="ex: Assistant IA"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Modèle LLM</label>
            <select 
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
            >
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="deepseek-vision">DeepSeek Vision</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Instructions système</label>
            <textarea 
              value={formData.system_instructions}
              onChange={(e) => setFormData({...formData, system_instructions: e.target.value})}
              placeholder="Instructions pour l'agent"
              rows={4}
              required
            />
          </div>
        </div>

        {/* Configuration spécialisée */}
        {isSpecialized && (
          <div className="form-section">
            <h3>Configuration spécialisée</h3>
            
        <div className="form-group">
          <label>Slug (identifiant unique)</label>
          <input 
                value={formData.slug}
            onChange={(e) => setFormData({...formData, slug: e.target.value})}
            placeholder="ex: johnny, formatter, vision"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Nom d'affichage</label>
          <input 
                value={formData.display_name}
            onChange={(e) => setFormData({...formData, display_name: e.target.value})}
            placeholder="ex: Johnny Query, Formateur, Vision"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea 
                value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description de l'agent spécialisé"
                rows={3}
          />
        </div>
        
        <div className="form-group">
              <label>Schéma d'entrée (JSON)</label>
          <textarea 
                value={JSON.stringify(formData.input_schema || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value);
                    setFormData({...formData, input_schema: schema});
                  } catch (err) {
                    // Gérer l'erreur JSON
                  }
                }}
                placeholder='{"type": "object", "properties": {"input": {"type": "string"}}}'
            rows={6}
          />
        </div>
        
        <div className="form-group">
              <label>Schéma de sortie (JSON)</label>
              <textarea 
                value={JSON.stringify(formData.output_schema || {}, null, 2)}
            onChange={(e) => {
              try {
                    const schema = JSON.parse(e.target.value);
                    setFormData({...formData, output_schema: schema});
              } catch (err) {
                // Gérer l'erreur JSON
              }
            }}
                placeholder='{"type": "object", "properties": {"result": {"type": "string"}}}'
                rows={6}
          />
        </div>
          </div>
        )}
        
        <div className="form-actions">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit">
            {isSpecialized ? 'Créer l\'agent spécialisé' : 'Sauvegarder'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 📋 **SCHÉMA OPENAPI DYNAMIQUE**

### **Extension du Schéma OpenAPI Existant**
```typescript
// src/app/api/v2/openapi-schema/route.ts (Extension)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Récupérer les agents spécialisés
    const { data: specializedAgents } = await supabase
      .from('agents')
      .select('slug, display_name, description, input_schema, output_schema, model')
      .eq('is_endpoint_agent', true)
      .eq('is_active', true);

    // 2. Générer les endpoints pour les agents spécialisés
    const agentEndpoints = {};
    
    if (specializedAgents) {
      specializedAgents.forEach(agent => {
        agentEndpoints[`/api/v2/agents/${agent.slug}`] = {
        post: {
            summary: agent.display_name || agent.slug,
            description: agent.description || `Agent spécialisé: ${agent.slug}`,
            tags: ['Agents Spécialisés'],
          requestBody: {
              required: true,
            content: {
              'application/json': {
                  schema: agent.input_schema || {
                    type: 'object',
                    properties: {
                      input: { type: 'string', description: 'Données d\'entrée' }
                    }
                  }
              }
            }
          },
          responses: {
            '200': {
                description: 'Réponse de l\'agent spécialisé',
              content: {
                'application/json': {
                    schema: agent.output_schema || {
                      type: 'object',
                      properties: {
                        result: { type: 'string', description: 'Résultat de l\'agent' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Erreur de validation des paramètres'
              },
              '404': {
                description: 'Agent non trouvé'
              },
              '500': {
                description: 'Erreur interne du serveur'
              }
            }
          },
          get: {
            summary: `Informations sur ${agent.display_name || agent.slug}`,
            description: `Récupère les informations et le schéma de l'agent ${agent.slug}`,
            tags: ['Agents Spécialisés'],
            responses: {
              '200': {
                description: 'Informations de l\'agent',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        model: { type: 'string' },
                        input_schema: { type: 'object' },
                        output_schema: { type: 'object' },
                        is_active: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        };
      });
    }

    // 3. Intégrer avec le schéma existant
    const existingSchema = await getExistingOpenAPISchema();

  return Response.json({
      ...existingSchema,
      paths: {
        ...existingSchema.paths,
        ...agentEndpoints
      },
      info: {
        ...existingSchema.info,
        title: 'Abrège API v2 - Agents Spécialisés',
        description: 'API complète avec agents spécialisés et fonctionnalités existantes'
      }
    });

  } catch (error) {
    console.error('Erreur génération schéma OpenAPI:', error);
    return Response.json({ error: 'Erreur génération schéma' }, { status: 500 });
  }
}

// Fonction pour récupérer le schéma existant
async function getExistingOpenAPISchema() {
  // Récupérer le schéma existant depuis l'endpoint actuel
  // ou le reconstruire avec les endpoints existants
  return {
    openapi: '3.0.0',
    info: {
      title: 'Abrège API v2',
      version: '2.0.0',
      description: 'API complète pour Abrège'
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        description: 'Serveur de production'
      }
    ],
    paths: {} // Sera rempli par les endpoints existants
  };
}
```

---

## 🚀 **EXEMPLES D'UTILISATION**

### **Agent Johnny (Query) - Utilisation via l'Infrastructure Existante**
```bash
curl -X POST /api/v2/agents/johnny \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "123e4567-e89b-12d3-a456-426614174000",
    "query": "Quelle est la marque des fenêtres mentionnée dans ce devis ?"
  }'
```

**Réponse :**
```json
{
  "answer": "La marque des fenêtres mentionnée dans le devis est Velux, modèle VELUX INTEGRA® GGL."
}
```

### **Agent Formateur - Utilisation via l'Infrastructure Existante**
```bash
curl -X POST /api/v2/agents/formatter \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "123e4567-e89b-12d3-a456-426614174000",
    "formatInstruction": "Transforme ce devis en format professionnel avec des sections claires et une mise en page soignée"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "formattedContent": "# Devis Professionnel\n\n## Section 1: Fenêtres\n- Marque: Velux\n- Modèle: VELUX INTEGRA® GGL\n\n## Section 2: Prix\n- Montant total: 2,500€\n\n..."
}
```

### **Agent Vision - Exemple avec Image**
```bash
curl -X POST /api/v2/agents/vision \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "task": "Analyse cette image et extrais les informations textuelles"
  }'
```

**Réponse :**
```json
{
  "analysis": "L'image contient un document avec les informations suivantes...",
  "extractedText": "Devis pour fenêtres Velux...",
  "confidence": 0.95
}
```

### **Utilisation dans le Chat Existant**
```typescript
// Dans le chat, l'utilisateur peut appeler des agents spécialisés
const response = await fetch('/api/v2/agents/johnny', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    noteId: selectedNote.id,
    query: userQuestion
  })
});

const result = await response.json();
// Afficher result.answer dans l'interface
```

---

## 🤖 **CONCEPT D'AUTO-CRÉATION D'AGENTS**

### **Agent "Créateur d'Agents" - Configuration Complète**
```sql
INSERT INTO agents (
  -- Configuration existante
  name, provider, model, system_instructions, temperature, max_tokens,
  is_active, priority, capabilities, api_v2_capabilities,
  
  -- Configuration spécialisée
  slug, display_name, description, is_endpoint_agent, is_chat_agent,
  input_schema, output_schema
) VALUES (
  -- Configuration existante
  'Créateur d''Agents', 'groq', 'deepseek-chat',
  'Tu es un expert en création d''agents IA. Tu peux analyser les besoins et créer de nouveaux agents spécialisés avec les bons outils et prompts. Tu utilises l''API v2 pour créer des agents via l''outil create_specialized_agent.',
  0.3, 8000, true, 15,
  '["text", "function_calling"]'::jsonb,
  ARRAY['create_specialized_agent', 'get_agents', 'list_agents'],
  
  -- Configuration spécialisée
  'agent-creator', 'Créateur d''Agents', 'Agent qui crée d''autres agents spécialisés',
  true, true, -- Visible dans le chat ET a un endpoint
  '{
    "type": "object",
    "properties": {
      "agentName": {"type": "string", "description": "Nom de l''agent à créer"},
      "description": {"type": "string", "description": "Description de l''agent"},
      "specialization": {"type": "string", "description": "Spécialisation de l''agent"},
      "useCase": {"type": "string", "description": "Cas d''usage spécifique"},
      "model": {"type": "string", "description": "Modèle LLM à utiliser", "default": "deepseek-chat"}
    },
    "required": ["agentName", "description", "specialization"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "agentCreated": {"type": "boolean"},
      "agentId": {"type": "string"},
      "slug": {"type": "string"},
      "endpoint": {"type": "string"},
      "message": {"type": "string"}
    }
  }'::jsonb
);
```

### **Tool "create_specialized_agent" - Intégration API v2**
```typescript
// src/services/llm/tools/createSpecializedAgentTool.ts
export const createSpecializedAgentTool = {
  name: 'create_specialized_agent',
  description: 'Crée un nouvel agent spécialisé dans le système via l\'API v2',
  parameters: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'Identifiant unique de l\'agent' },
      display_name: { type: 'string', description: 'Nom d\'affichage de l\'agent' },
      description: { type: 'string', description: 'Description de l\'agent' },
      model: { type: 'string', description: 'Modèle LLM à utiliser' },
      system_instructions: { type: 'string', description: 'Instructions système' },
      input_schema: { type: 'object', description: 'Schéma d\'entrée OpenAPI' },
      output_schema: { type: 'object', description: 'Schéma de sortie OpenAPI' },
      api_v2_capabilities: { type: 'array', description: 'Capacités API v2' }
    },
    required: ['slug', 'display_name', 'description', 'model', 'system_instructions']
  },
  execute: async (params: any) => {
    try {
      // Appeler l'API v2 pour créer l'agent spécialisé
      const response = await fetch('/api/ui/agents/specialized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Erreur création agent: ${response.statusText}`);
      }

      const result = await response.json();
      
      return { 
        success: true, 
        agentId: result.agent.id,
        slug: result.agent.slug,
        endpoint: result.endpoint,
        message: `Agent '${result.agent.slug}' créé avec succès ! Endpoint: ${result.endpoint}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Erreur lors de la création de l'agent: ${error.message}`
      };
    }
  }
};
```

### **Exemple d'Usage dans le Chat Existant**
```
User: "J'ai besoin d'un agent qui traduit mes notes en espagnol"

Assistant: "Je vais créer un agent traducteur spécialisé pour vous !"

[L'assistant utilise l'outil create_specialized_agent avec les paramètres :]
{
  "slug": "translator-es",
  "display_name": "Traducteur Espagnol",
  "description": "Agent spécialisé dans la traduction de notes en espagnol",
  "model": "deepseek-chat",
  "system_instructions": "Tu es un expert en traduction français-espagnol. Tu traduis le contenu des notes de manière précise et naturelle. Tu utilises les outils API v2 pour récupérer et modifier les notes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à traduire"},
      "targetLanguage": {"type": "string", "description": "Langue cible", "default": "es"}
    },
    "required": ["noteId"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "translatedContent": {"type": "string", "description": "Contenu traduit"},
      "success": {"type": "boolean", "description": "Succès de la traduction"}
    }
  },
  "api_v2_capabilities": ["get_note", "update_note", "search_notes"]
}

Assistant: "Parfait ! J'ai créé l'agent 'translator-es' qui peut traduire vos notes en espagnol. Vous pouvez maintenant l'utiliser avec l'endpoint /api/v2/agents/translator-es ou directement dans le chat en mentionnant @translator-es"
```

### **Intégration avec le Système de Chat Existant**
```typescript
// Extension du GroqOrchestrator pour supporter l'auto-création
// Dans src/services/llm/services/GroqOrchestrator.ts

// Ajouter l'outil create_specialized_agent aux outils disponibles
const specializedAgentTools = [
  createSpecializedAgentTool,
  // ... autres outils spécialisés
];

// L'agent créateur peut être appelé depuis le chat normal
// en utilisant le système de tool calling existant
```

---

## 🎯 **AVANTAGES DE CETTE ARCHITECTURE ÉVOLUTIVE**

### **✅ Compatibilité Totale**
- **Infrastructure existante** : Conservation de GroqOrchestrator, templates, etc.
- **Migration douce** : Extension sans casser l'existant
- **Fonctionnalités préservées** : Toutes les capacités actuelles maintenues

### **✅ Simplicité d'Extension**
- **1 route** pour tous les agents spécialisés
- **Configuration** en base de données
- **Code minimal** : Réutilisation de l'infrastructure existante

### **✅ Maintenabilité Optimale**
- **1 point d'extension** : La route `/api/v2/agents/{agentId}`
- **Tests simplifiés** : Réutilisation des tests existants
- **Debug facilité** : Logs centralisés et cohérents

### **✅ Évolutivité Maximale**
- **Empilage** : Ajouter 100 agents sans stress
- **Performance** : Réutilisation de l'infrastructure optimisée
- **Cache** : Gestion centralisée via l'existant

### **✅ Flexibilité Révolutionnaire**
- **Interface unifiée** : Gestion des agents classiques ET spécialisés
- **Auto-création** : LLM qui crée des LLM via l'API v2
- **Spécialisation** : Agents dédiés à des tâches précises

---

## 📈 **SCALABILITÉ COMPARÉE**

### **Comparaison des Approches**

| Approche | 10 Agents | 50 Agents | 100 Agents | Migration |
|----------|-----------|-----------|------------|-----------|
| **Refonte complète** | 30 fichiers | 150 fichiers | 300 fichiers | ❌ Complexe |
| **Notre approche évolutive** | 2 fichiers | 2 fichiers | 2 fichiers | ✅ Simple |

### **Ajout d'un Agent Spécialisé**
```sql
-- Une seule ligne pour ajouter un agent spécialisé
INSERT INTO agents (
  name, provider, model, system_instructions, is_endpoint_agent,
  slug, display_name, description, input_schema, output_schema
) VALUES (
  'Nouvel Agent', 'groq', 'deepseek-chat', 'Instructions...', true,
  'nouvel-agent', 'Nouvel Agent', 'Description', '{}', '{}'
);
```

**L'endpoint `/api/v2/agents/nouvel-agent` est immédiatement disponible !**

---

## 🔮 **POTENTIEL FUTUR**

### **Auto-Création d'Agents Révolutionnaire**
- **LLM qui crée des LLM** : Concept révolutionnaire intégré au chat existant
- **Spécialisation automatique** : Agents adaptés aux besoins via conversation
- **Évolutivité infinie** : Système auto-évolutif sans intervention

### **Intégration ChatGPT Parfaite**
- **Endpoints exposés** : ChatGPT peut créer des agents via l'API v2
- **Collaboration IA** : IA qui améliore l'IA en temps réel
- **Innovation continue** : Nouvelles possibilités d'automatisation

### **Écosystème d'Agents Unifié**
- **Agents classiques** : Chat, templates, fonctionnalités existantes
- **Agents spécialisés** : Endpoints dédiés, schémas OpenAPI
- **Collaboration** : Agents qui travaillent ensemble via l'API v2

---

## 🚀 **PLAN D'IMPLÉMENTATION**

### **Phase 1 : Migration de Base (1-2 jours)**
1. ✅ Ajouter les colonnes manquantes à la table `agents`
2. ✅ Créer la route `/api/v2/agents/[agentId]`
3. ✅ Tester avec un agent spécialisé simple

### **Phase 2 : Interface de Gestion (2-3 jours)**
1. ✅ Étendre l'API UI existante
2. ✅ Enrichir l'interface de gestion des agents
3. ✅ Ajouter la création d'agents spécialisés

### **Phase 3 : Auto-Création (3-4 jours)**
1. ✅ Implémenter l'outil `create_specialized_agent`
2. ✅ Intégrer l'agent créateur au chat existant
3. ✅ Tester le cycle complet de création

### **Phase 4 : Optimisation (1-2 jours)**
1. ✅ Améliorer les performances
2. ✅ Ajouter la documentation OpenAPI
3. ✅ Tests de charge et validation

---

## 🎉 **CONCLUSION**

Cette architecture évolutive d'agents spécialisés offre :

- **Compatibilité totale** : Extension sans casser l'existant
- **Simplicité maximale** : 1 route pour tous les agents spécialisés
- **Maintenabilité parfaite** : Réutilisation de l'infrastructure optimisée
- **Évolutivité infinie** : Empilage d'agents sans complexité
- **Innovation révolutionnaire** : Concept d'auto-création d'agents

**Le système permet de créer un écosystème d'agents IA spécialisés, maintenable et évolutif, avec la possibilité révolutionnaire de laisser les LLM créer eux-mêmes de nouveaux agents pour Abrège, tout en conservant la richesse de l'infrastructure existante.**

---

*Documentation adaptée le : $(date)*
*Version : 2.0 - Approche Évolutive*
*Architecture : Agents Spécialisés Unifiés + Infrastructure Existante*
