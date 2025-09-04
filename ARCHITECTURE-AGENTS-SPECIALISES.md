# 🤖 Architecture Agents Spécialisés - Documentation Complète

## 🎯 **VISION GÉNÉRALE**

Système d'agents IA spécialisés avec une architecture unifiée permettant de créer, gérer et utiliser des agents via une route unique. Chaque agent a un rôle spécifique et des outils limités pour garantir la simplicité et la maintenabilité.

---

## 🏗️ **ARCHITECTURE TECHNIQUE**

### **Principe Fondamental**
- **1 Agent = 1 Rôle = 1 Endpoint**
- **Route unique** : `/api/v2/agents/{agentId}`
- **Configuration** : Entièrement en base de données
- **Scalabilité** : Ajout d'agents sans modification de code

### **Avantages**
- ✅ **Simplicité** : Code fixe, configuration dynamique
- ✅ **Maintenabilité** : 1 route pour tous les agents
- ✅ **Évolutivité** : Empilage d'agents sans complexité
- ✅ **Performance** : Route optimisée une fois pour tous

---

## 📊 **STRUCTURE DE BASE DE DONNÉES**

### **Table `agents`**
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR UNIQUE NOT NULL,                    -- "johnny", "formatter", "vision"
  display_name VARCHAR NOT NULL,                   -- "Johnny Query", "Formateur", "Vision"
  description TEXT,                                -- Description de l'agent
  is_chat_agent BOOLEAN DEFAULT false,            -- Visible dans le chat ?
  is_endpoint_agent BOOLEAN DEFAULT true,         -- A un endpoint dédié ?
  model VARCHAR NOT NULL,                          -- "gpt-4", "claude-3", etc.
  system_prompt TEXT NOT NULL,                     -- Prompt système de l'agent
  tools JSONB DEFAULT '[]',                        -- Tools autorisés
  settings JSONB DEFAULT '{}',                     -- Paramètres spécifiques
  
  -- Schémas pour l'OpenAPI
  input_schema JSONB NOT NULL,                     -- Schéma d'entrée
  output_schema JSONB NOT NULL,                    -- Schéma de sortie
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Exemples de Configuration**

#### **Agent Johnny (Query)**
```sql
INSERT INTO agents (
  slug, display_name, description, model, system_prompt,
  input_schema, output_schema, tools
) VALUES (
  'johnny',
  'Johnny Query',
  'Agent spécialisé dans les questions sur les notes',
  'gpt-4',
  'Tu es Johnny, un assistant spécialisé dans l''analyse de notes. Tu réponds de manière précise et concise aux questions sur le contenu des notes.',
  '{
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à analyser"},
      "query": {"type": "string", "description": "Question à poser sur la note"}
    },
    "required": ["noteId", "query"]
  }',
  '{
    "type": "object",
    "properties": {
      "answer": {"type": "string", "description": "Réponse à la question"}
    }
  }',
  '["get_note", "search_notes"]'
);
```

#### **Agent Formateur**
```sql
INSERT INTO agents (
  slug, display_name, description, model, system_prompt,
  input_schema, output_schema, tools
) VALUES (
  'formatter',
  'Formateur',
  'Agent spécialisé dans la mise en forme des notes',
  'gpt-4',
  'Tu es un expert en mise en forme de documents. Tu reformates le contenu markdown selon les instructions données.',
  '{
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à formater"},
      "formatInstruction": {"type": "string", "description": "Instructions de mise en forme"}
    },
    "required": ["noteId", "formatInstruction"]
  }',
  '{
    "type": "object",
    "properties": {
      "success": {"type": "boolean", "description": "Succès de l''opération"}
    }
  }',
  '["get_note", "update_note"]'
);
```

---

## 🛠️ **IMPLÉMENTATION TECHNIQUE**

### **1. Route Unique pour les Agents**

#### **Fichier : `src/app/api/v2/agents/[agentId]/route.ts`**
```typescript
import { AgentManager } from '@/services/agentManager';

const agentManager = new AgentManager();

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const body = await request.json();

  try {
    // Validation basique
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Exécution de l'agent
    const result = await agentManager.executeAgent(agentId, body);
    
    return Response.json(result);
  } catch (error) {
    console.error(`[Agent ${agentId}] Error:`, error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET pour récupérer les infos de l'agent
export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  try {
    const schema = agentManager.getAgentSchema(agentId);
    if (!schema) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    return Response.json(schema);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### **2. Service Agent Manager**

#### **Fichier : `src/services/agentManager.ts`**
```typescript
import { supabase } from '@/supabaseClient';
import { Agent } from './agents/BaseAgent';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    const agents = await this.loadAgentsFromDatabase();
    agents.forEach(agent => {
      this.agents.set(agent.slug, new Agent(agent));
    });

    this.initialized = true;
  }

  async executeAgent(agentId: string, input: any): Promise<any> {
    await this.initialize();
    
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return await agent.execute(input);
  }

  getAgentSchema(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return {
      name: agent.config.display_name,
      description: agent.config.description,
      input_schema: agent.config.input_schema,
      output_schema: agent.config.output_schema
    };
  }

  private async loadAgentsFromDatabase() {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('is_endpoint_agent', true);

    return data || [];
  }
}
```

### **3. Classe Agent de Base**

#### **Fichier : `src/services/agents/BaseAgent.ts`**
```typescript
export interface AgentConfig {
  id: string;
  slug: string;
  display_name: string;
  description: string;
  model: string;
  system_prompt: string;
  tools: string[];
  input_schema: any;
  output_schema: any;
}

export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<any>;
}

export abstract class BaseAgent {
  constructor(
    public config: AgentConfig,
    public tools: Tool[]
  ) {}

  abstract execute(input: any): Promise<any>;

  protected async callLLM(messages: any[]): Promise<string> {
    // Appel LLM avec le modèle configuré
    return await this.llmService.call(this.config.model, messages);
  }

  protected async executeTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Tool ${toolName} not available`);
    
    return await tool.execute(params);
  }
}
```

---

## 🎨 **INTERFACE DE GESTION**

### **API UI pour la Gestion des Agents**

#### **Endpoints UI :**
```
GET    /api/ui/agents           → Liste tous les agents
GET    /api/ui/agents/{id}      → Détails d'un agent
POST   /api/ui/agents           → Créer un agent
PUT    /api/ui/agents/{id}      → Modifier un agent
DELETE /api/ui/agents/{id}      → Supprimer un agent
```

### **1. Route GET (Liste)**

#### **Fichier : `src/app/api/ui/agents/route.ts`**
```typescript
import { supabase } from '@/supabaseClient';

export async function GET() {
  try {
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    return Response.json(agents);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### **2. Route POST (Création)**

#### **Fichier : `src/app/api/ui/agents/route.ts`**
```typescript
export async function POST(request: Request) {
  try {
    const agentData = await request.json();
    
    // Validation basique
    if (!agentData.slug || !agentData.display_name) {
      return Response.json({ error: 'slug and display_name required' }, { status: 400 });
    }

    const { data: agent } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    return Response.json(agent);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### **3. Route PUT (Modification)**

#### **Fichier : `src/app/api/ui/agents/[id]/route.ts`**
```typescript
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();

    const { data: agent } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    return Response.json(agent);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### **4. Interface Utilisateur**

#### **Page de Gestion des Agents**
```tsx
// src/app/private/agents/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const response = await fetch('/api/ui/agents');
    const data = await response.json();
    setAgents(data);
  };

  const handleSaveAgent = async (agentData) => {
    if (agentData.id) {
      // Update
      await fetch(`/api/ui/agents/${agentData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });
    } else {
      // Create
      await fetch('/api/ui/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });
    }
    
    fetchAgents();
    setEditingAgent(null);
  };

  return (
    <div className="agents-management">
      <h1>Gestion des Agents IA</h1>
      
      {/* Liste des agents */}
      <div className="agents-list">
        {agents.map(agent => (
          <AgentCard 
            key={agent.id} 
            agent={agent}
            onEdit={() => setEditingAgent(agent)}
            onDelete={() => deleteAgent(agent.id)}
          />
        ))}
      </div>

      {/* Bouton créer */}
      <button onClick={() => setEditingAgent({})}>
        + Créer un nouvel agent
      </button>

      {/* Modal d'édition */}
      {editingAgent && (
        <AgentEditModal 
          agent={editingAgent}
          onSave={handleSaveAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
```

#### **Composant d'Édition**
```tsx
// src/components/AgentEditModal.tsx
export function AgentEditModal({ agent, onSave, onClose }) {
  const [formData, setFormData] = useState(agent);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Slug (identifiant unique)</label>
          <input 
            value={formData.slug || ''}
            onChange={(e) => setFormData({...formData, slug: e.target.value})}
            placeholder="ex: johnny, formatter, vision"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Nom d'affichage</label>
          <input 
            value={formData.display_name || ''}
            onChange={(e) => setFormData({...formData, display_name: e.target.value})}
            placeholder="ex: Johnny Query, Formateur, Vision"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Description de l'agent"
          />
        </div>
        
        <div className="form-group">
          <label>Modèle LLM</label>
          <select 
            value={formData.model || 'gpt-4'}
            onChange={(e) => setFormData({...formData, model: e.target.value})}
          >
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3">Claude 3</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Prompt système</label>
          <textarea 
            value={formData.system_prompt || ''}
            onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
            placeholder="Instructions pour l'agent"
            rows={6}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Tools autorisés</label>
          <input 
            value={JSON.stringify(formData.tools || [])}
            onChange={(e) => {
              try {
                const tools = JSON.parse(e.target.value);
                setFormData({...formData, tools});
              } catch (err) {
                // Gérer l'erreur JSON
              }
            }}
            placeholder='["get_note", "update_note"]'
          />
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit">Sauvegarder</button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 📋 **SCHÉMA OPENAPI DYNAMIQUE**

### **Génération Automatique**
```typescript
// src/app/api/v2/openapi-schema/route.ts
export async function GET() {
  const agentManager = new AgentManager();
  await agentManager.initialize();

  const agents = await getAgentsFromDatabase();
  
  const agentEndpoints = agents
    .filter(agent => agent.is_endpoint_agent)
    .map(agent => ({
      [`/api/v2/agents/${agent.slug}`]: {
        post: {
          summary: agent.display_name,
          description: agent.description,
          requestBody: {
            content: {
              'application/json': {
                schema: agent.input_schema
              }
            }
          },
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: agent.output_schema
                }
              }
            }
          }
        }
      }
    }));

  return Response.json({
    openapi: '3.0.0',
    paths: Object.assign({}, ...agentEndpoints),
    // ... reste du schéma
  });
}
```

---

## 🚀 **EXEMPLES D'UTILISATION**

### **Agent Johnny (Query)**
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

### **Agent Formateur**
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
  "success": true
}
```

---

## 🤖 **CONCEPT D'AUTO-CRÉATION D'AGENTS**

### **Agent "Créateur d'Agents"**
```sql
INSERT INTO agents (
  slug, display_name, description, model, system_prompt,
  input_schema, output_schema, tools
) VALUES (
  'agent-creator',
  'Créateur d''Agents',
  'Agent qui crée d''autres agents spécialisés',
  'gpt-4',
  'Tu es un expert en création d''agents IA. Tu peux analyser les besoins et créer de nouveaux agents spécialisés avec les bons outils et prompts.',
  '{
    "type": "object",
    "properties": {
      "agentName": {"type": "string", "description": "Nom de l''agent à créer"},
      "description": {"type": "string", "description": "Description de l''agent"},
      "specialization": {"type": "string", "description": "Spécialisation de l''agent"},
      "useCase": {"type": "string", "description": "Cas d''usage spécifique"}
    },
    "required": ["agentName", "description", "specialization"]
  }',
  '{
    "type": "object",
    "properties": {
      "agentCreated": {"type": "boolean"},
      "agentId": {"type": "string"},
      "endpoint": {"type": "string"}
    }
  }',
  '["create_agent", "get_agents"]'
);
```

### **Tool "create_agent"**
```typescript
const createAgentTool = {
  name: 'create_agent',
  description: 'Crée un nouvel agent dans le système',
  parameters: {
    type: 'object',
    properties: {
      slug: { type: 'string' },
      display_name: { type: 'string' },
      description: { type: 'string' },
      model: { type: 'string' },
      system_prompt: { type: 'string' },
      tools: { type: 'array' },
      input_schema: { type: 'object' },
      output_schema: { type: 'object' }
    },
    required: ['slug', 'display_name', 'model', 'system_prompt']
  },
  execute: async (params) => {
    const { data: agent } = await supabase
      .from('agents')
      .insert(params)
      .select()
      .single();
    
    return { 
      success: true, 
      agentId: agent.id,
      endpoint: `/api/v2/agents/${agent.slug}`
    };
  }
};
```

### **Exemple d'Usage dans le Chat**
```
User: "J'ai besoin d'un agent qui traduit mes notes en espagnol"

Assistant: "Je vais créer un agent traducteur spécialisé pour vous !"

[L'assistant utilise l'outil create_agent avec les paramètres :]
{
  "slug": "translator-es",
  "display_name": "Traducteur Espagnol",
  "description": "Agent spécialisé dans la traduction de notes en espagnol",
  "model": "gpt-4",
  "system_prompt": "Tu es un expert en traduction français-espagnol. Tu traduis le contenu des notes de manière précise et naturelle.",
  "tools": ["get_note", "update_note"],
  "input_schema": {
    "type": "object",
    "properties": {
      "noteId": {"type": "string"},
      "targetLanguage": {"type": "string", "default": "es"}
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "translatedContent": {"type": "string"}
    }
  }
}

Assistant: "Parfait ! J'ai créé l'agent 'translator-es' qui peut traduire vos notes en espagnol. Vous pouvez maintenant l'utiliser avec l'endpoint /api/v2/agents/translator-es"
```

---

## 🎯 **AVANTAGES DE CETTE ARCHITECTURE**

### **✅ Simplicité**
- **1 route** pour tous les agents
- **Configuration** en base de données
- **Code fixe** qui ne grossit jamais

### **✅ Maintenabilité**
- **1 point de défaillance** : La route unique
- **1 point de test** : Le service unique
- **1 point de debug** : Le manager unique

### **✅ Évolutivité**
- **Empilage** : Ajouter 100 agents sans stress
- **Performance** : Route optimisée une fois
- **Cache** : Gestion centralisée

### **✅ Flexibilité**
- **Interface** : Gestion visuelle des agents
- **Auto-création** : LLM qui crée des LLM
- **Spécialisation** : Agents dédiés à des tâches précises

---

## 📈 **SCALABILITÉ**

### **Comparaison des Approches**

| Approche | 10 Agents | 50 Agents | 100 Agents |
|----------|-----------|-----------|------------|
| **Classique** | 30 fichiers | 150 fichiers | 300 fichiers |
| **Notre approche** | 2 fichiers | 2 fichiers | 2 fichiers |

### **Ajout d'un Agent**
```sql
-- Une seule ligne pour ajouter un agent
INSERT INTO agents (slug, display_name, description, model, system_prompt, input_schema, output_schema, tools) 
VALUES ('nouvel-agent', 'Nouvel Agent', 'Description', 'gpt-4', 'Prompt', '{}', '{}', '[]');
```

**L'endpoint `/api/v2/agents/nouvel-agent` est immédiatement disponible !**

---

## 🔮 **POTENTIEL FUTUR**

### **Auto-Création d'Agents**
- **LLM qui crée des LLM** : Concept révolutionnaire
- **Spécialisation automatique** : Agents adaptés aux besoins
- **Évolutivité infinie** : Système auto-évolutif

### **Intégration avec ChatGPT**
- **Endpoints exposés** : ChatGPT peut créer des agents
- **Collaboration** : IA qui améliore l'IA
- **Innovation** : Nouvelles possibilités d'automatisation

### **Écosystème d'Agents**
- **Agents spécialisés** : Chaque tâche a son agent
- **Collaboration** : Agents qui travaillent ensemble
- **Optimisation** : Performance et coût optimisés

---

## 🎉 **CONCLUSION**

Cette architecture d'agents spécialisés offre :

- **Simplicité maximale** : 1 route pour tous les agents
- **Maintenabilité parfaite** : Code fixe, configuration dynamique
- **Évolutivité infinie** : Empilage d'agents sans complexité
- **Innovation** : Concept d'auto-création d'agents

**Le système permet de créer un écosystème d'agents IA spécialisés, maintenable et évolutif, avec la possibilité révolutionnaire de laisser les LLM créer eux-mêmes de nouveaux agents pour Scrivia.**

---

*Documentation créée le : $(date)*
*Version : 1.0*
*Architecture : Agents Spécialisés Unifiés*
