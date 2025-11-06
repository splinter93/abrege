# 🚀 ROADMAP DÉVELOPPEMENT - NOVEMBRE 2025

**Projet**: Scrivia  
**Période**: Nov 2025 - Jan 2026  
**Phase**: Features finales avant fiabilisation  
**Objectif**: Code production-ready pour beta publique  

---

## 📊 VUE D'ENSEMBLE

### **Durée totale estimée**: 80h (4 semaines temps plein)

- **Développement features**: 40h (2 semaines)
- **Fiabilisation**: 40h (2 semaines)
- **Puis**: Beta 3 mois (feedback utilisateurs)

### **Nombre de features**: 7 features majeures

---

## 🎯 OBJECTIFS STRATÉGIQUES

### **Avant fiabilisation, livrer**:

1. ✅ **Embeds riches** (YouTube, Audio, Notes)
2. ✅ **Prompts paramétrables** (placeholders dynamiques)
3. ✅ **Canevas éditeur+chat** (feature centrale)
4. ✅ **Podcasts TTS** (feature premium)
5. ✅ **Agents as Tools** (orchestration LLM)
6. ✅ **Export PDF qualité** (format professionnel)

### **Résultat attendu**:

**Feature set niveau Notion Pro + Claude Artifacts**

---

## 📋 ROADMAP DÉTAILLÉE

---

## 🟢 PHASE 1 - QUICK WINS (Semaine 1)

**Durée**: 21h  
**Objectif**: Features faciles, impact visuel immédiat  
**Risque**: 🟢 Faible

---

### **TODO #1: YouTube Embed** ⏱️ 2-3h

**Priorité**: ⭐⭐⭐⭐⭐ (très demandé)  
**Complexité**: 🟢 Trivial  
**Risque**: Aucun

#### **Syntax**:
```markdown
{{youtube:dQw4w9WgXcQ}}
{{youtube:https://youtube.com/watch?v=dQw4w9WgXcQ}}
```

#### **Rendu**:
```html
<div class="youtube-embed">
  <iframe 
    src="https://youtube.com/embed/dQw4w9WgXcQ"
    width="100%"
    height="400px"
    frameborder="0"
    allowfullscreen
  />
</div>
```

#### **Fichiers à créer**:
- `src/extensions/YoutubeEmbedExtension.ts` (~150L)
- `src/extensions/markdown-it-youtube-embed.ts` (~50L)
- `src/components/editor/YoutubeEmbedView.tsx` (~80L)
- `src/styles/youtube-embed.css` (~60L)
- `src/types/youtubeEmbed.ts` (~30L)

#### **Pattern**:
Copy-paste `NoteEmbedExtension` en remplaçant:
- Node name: `noteEmbed` → `youtubeEmbed`
- Attrs: `{ noteRef }` → `{ videoId }`
- Component: `<NoteEmbedView>` → `<iframe>`

#### **Features**:
- ✅ Aspect ratio 16:9 automatique
- ✅ Responsive
- ✅ Lazy loading (pas de iframe si pas visible)
- ✅ Preview thumbnail avant play

#### **Tests manuels**:
- Insérer `{{youtube:dQw4w9WgXcQ}}`
- Vérifier iframe s'affiche
- Vérifier sauvegarde en DB
- Vérifier mode preview

---

### **TODO #2: Audio Embed** ⏱️ 3-4h

**Priorité**: ⭐⭐⭐⭐ (utile pour podcasts)  
**Complexité**: 🟢 Facile  
**Risque**: Faible

#### **Syntax**:
```markdown
{{audio:FILE_UUID}}
{{audio:FILE_UUID|title=Mon Audio}}
```

#### **Rendu**:
```html
<div class="audio-embed">
  <div class="audio-header">
    <span class="audio-icon">🎵</span>
    <span class="audio-title">Mon Audio</span>
  </div>
  <audio controls>
    <source src="/api/ui/public/file/{FILE_UUID}" type="audio/mpeg" />
  </audio>
</div>
```

#### **Fichiers à créer**:
- `src/extensions/AudioEmbedExtension.ts` (~150L)
- `src/extensions/markdown-it-audio-embed.ts` (~60L)
- `src/components/editor/AudioEmbedView.tsx` (~100L)
- `src/styles/audio-embed.css` (~80L)
- `src/types/audioEmbed.ts` (~40L)

#### **Features**:
- ✅ Player HTML5 natif
- ✅ Titre optionnel (metadata)
- ✅ Waveform preview (nice-to-have)
- ✅ Download button
- ✅ Durée affichée

#### **Prérequis**:
- Vérifier API `/api/ui/public/file/{ref}` retourne bon MIME type
- Signed URLs si fichiers privés

#### **Tests manuels**:
- Upload audio MP3
- Insérer `{{audio:UUID}}`
- Vérifier player fonctionne
- Tester download

---

### **TODO #3: Export PDF amélioré** ⏱️ 2h

**Priorité**: ⭐⭐⭐ (professionnel)  
**Complexité**: 🟢 Trivial  
**Risque**: Aucun

#### **Implémentation**:

**Fichier**: `src/styles/print.css` (nouveau)
```css
@media print {
  @page {
    size: A4;
    margin: 2cm 2.5cm;
  }
  
  /* Masquer UI */
  .editor-header,
  .editor-sidebar,
  .editor-toolbar,
  .crafted-button,
  .toc-sidebar {
    display: none !important;
  }
  
  /* Optimiser markdown */
  .markdown-body {
    max-width: 100% !important;
    padding: 0 !important;
    font-size: 11pt;
    line-height: 1.6;
  }
  
  /* Page breaks intelligents */
  h1, h2, h3 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  
  pre, blockquote, table {
    page-break-inside: avoid;
  }
  
  img {
    max-width: 100%;
    page-break-inside: avoid;
  }
}
```

**Bouton UI**: Dans EditorKebabMenu
```typescript
{
  id: 'export-pdf',
  label: 'Exporter en PDF',
  icon: <FiDownload size={18} />,
  onClick: () => { 
    window.print(); // ✅ Trigger print dialog
    onClose(); 
  }
}
```

#### **Tests**:
- Cmd+P → Preview PDF
- Vérifier marges 2cm
- Vérifier pas de UI visible
- Vérifier images incluses

---

## 🟡 PHASE 2 - FEATURES INTERMÉDIAIRES (Semaine 2)

**Durée**: 16-20h  
**Objectif**: Features à valeur ajoutée  
**Risque**: 🟡 Moyen

---

### **TODO #4: Prompts avec arguments** ⏱️ 6-8h

**Priorité**: ⭐⭐⭐⭐⭐ (game-changer UX)  
**Complexité**: 🟡 Moyen  
**Risque**: Moyen (UX modale)

#### **Syntax des prompts**:
```
Traduis {text} en {language}
Résume {document} en {length} mots
Analyse {data} et génère {output_format}
```

#### **Flow UX**:
```
1. User clique prompt "Traduis {text} en {language}"
   ↓
2. Système détecte 2 placeholders: text, language
   ↓
3. Ouvre PromptArgsModal avec 2 inputs
   ↓
4. User remplit:
   - text: "Hello world"
   - language: "français"
   ↓
5. Remplace dans le prompt:
   "Traduis Hello world en français"
   ↓
6. Exécute normalement
```

#### **Fichiers à créer**:
```
src/utils/promptParser.ts (~80L)
  - extractPlaceholders(prompt): string[]
  - replacePlaceholders(prompt, args): string
  - validatePlaceholders(args): boolean

src/components/chat/PromptArgsModal.tsx (~150L)
  - Formulaire dynamique
  - Validation inputs
  - Submit → callback

src/components/chat/PromptArgsModal.css (~100L)
  - Design modale propre
  - Style inputs
  - Responsive
```

#### **Implémentation promptParser.ts**:
```typescript
export function extractPlaceholders(prompt: string): Array<{
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}> {
  // Regex: {key}, {key:type}, {key:select:opt1,opt2,opt3}
  const regex = /\{([a-z_]+)(?::([a-z]+)(?::([^\}]+))?)?\}/gi;
  const matches = [...prompt.matchAll(regex)];
  
  return matches.map(m => ({
    key: m[1],
    label: m[1].replace(/_/g, ' '),
    type: (m[2] as any) || 'text',
    options: m[3]?.split(',')
  }));
}

export function replacePlaceholders(
  prompt: string, 
  args: Record<string, string>
): string {
  return prompt.replace(/\{([a-z_]+)(?::[^\}]+)?\}/gi, (_, key) => {
    return args[key] || `{${key}}`;
  });
}
```

#### **Exemple avancé**:
```
Prompt: "Traduis {text} en {language:select:français,anglais,espagnol}"

Modale:
┌─────────────────────────────────┐
│ Arguments du prompt             │
├─────────────────────────────────┤
│ text (texte):                   │
│ [___________________________]   │
│                                 │
│ language (sélection):           │
│ ( ) français                    │
│ ( ) anglais                     │
│ ( ) espagnol                    │
├─────────────────────────────────┤
│ [Annuler]  [Exécuter]          │
└─────────────────────────────────┘
```

#### **Tests**:
- Prompt sans args → Exécution directe
- Prompt avec 1 arg → Modale 1 input
- Prompt avec 3 args → Modale 3 inputs
- Validation (champs requis)
- Annulation → Ferme modale

---

### **TODO #5: Podcasts TTS** ⏱️ 6-8h

**Priorité**: ⭐⭐⭐⭐ (feature premium)  
**Complexité**: 🟡 Moyen  
**Risque**: Moyen (API externe, coûts)

#### **Stack technique**:

**OpenAI TTS**:
- Model: `tts-1` (rapide) ou `tts-1-hd` (qualité)
- Voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- Prix: **$15/million chars** (~$0.15 pour note de 2000 mots)
- Format: MP3, Opus, AAC, FLAC

#### **Architecture**:

```
1. User clique "🎧 Générer podcast" (kebab menu)
   ↓
2. POST /api/podcast/generate { noteId, voice: "alloy" }
   ↓
3. Backend:
   a) Fetch note markdown
   b) OpenAI TTS API
   c) Upload MP3 → Supabase Storage
   d) Update note.podcast_url
   ↓
4. Frontend:
   - Toast "Podcast généré !"
   - Player audio s'affiche
```

#### **Fichiers à créer**:

**Backend**:
```typescript
// src/app/api/podcast/generate/route.ts (~180L)
export async function POST(req: NextRequest) {
  const { noteId, voice = 'alloy' } = await req.json();
  
  // 1. Auth
  const user = await getAuthenticatedUser(req);
  
  // 2. Fetch note
  const note = await supabase
    .from('articles')
    .select('markdown_content, source_title')
    .eq('id', noteId)
    .single();
  
  // 3. OpenAI TTS
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice,
      input: note.markdown_content,
      speed: 1.0
    })
  });
  
  const audioBuffer = await response.arrayBuffer();
  
  // 4. Upload Supabase Storage
  const fileName = `podcasts/${noteId}.mp3`;
  await supabase.storage
    .from('files')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });
  
  // 5. Get public URL
  const { data } = supabase.storage
    .from('files')
    .getPublicUrl(fileName);
  
  // 6. Update note
  await supabase
    .from('articles')
    .update({ podcast_url: data.publicUrl })
    .eq('id', noteId);
  
  return NextResponse.json({ 
    success: true, 
    podcast_url: data.publicUrl 
  });
}
```

**Frontend**:
```typescript
// src/components/editor/PodcastButton.tsx (~100L)
const PodcastButton = ({ noteId, podcastUrl, onGenerate }) => {
  const [generating, setGenerating] = useState(false);
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/podcast/generate', {
        method: 'POST',
        body: JSON.stringify({ noteId, voice: 'alloy' })
      });
      const { podcast_url } = await res.json();
      onGenerate(podcast_url);
      toast.success('Podcast généré !');
    } catch (err) {
      toast.error('Erreur génération podcast');
    } finally {
      setGenerating(false);
    }
  };
  
  return podcastUrl ? (
    <audio controls src={podcastUrl} />
  ) : (
    <button onClick={handleGenerate} disabled={generating}>
      {generating ? 'Génération...' : '🎧 Générer podcast'}
    </button>
  );
};
```

#### **Intégration kebab menu**:
```typescript
// EditorKebabMenu.tsx - Ajouter option
{
  id: 'podcast',
  label: 'Générer podcast',
  icon: <FiMic size={18} />,
  onClick: () => handleGeneratePodcast(),
  badge: note.podcast_url ? '✓' : null
}
```

#### **Coûts estimés** (feature payante):
- Note 2000 mots = 10,000 chars = **$0.15**
- Abonnement 20€/mois = **~130 générations/mois**
- Abonnement 40€/mois = **~260 générations/mois**

**Marge confortable**: Coût $0.15, prix 20€ = **133x markup**

#### **Optimisations futures** (post-MVP):
- Cache: Si note pas modifiée, réutiliser podcast
- Choix de voix (dropdown)
- Vitesse lecture (0.75x, 1x, 1.25x)

#### **Tests**:
- Générer podcast note courte (500 mots)
- Générer podcast note longue (5000 mots)
- Vérifier qualité audio
- Tester download

---

### **TODO #3: Export PDF amélioré** ⏱️ 2h

**Priorité**: ⭐⭐⭐ (professionnel)  
**Complexité**: 🟢 Trivial  
**Risque**: Aucun

#### **Objectif**:
Cmd+P fonctionne déjà bien. Juste **peaufiner les marges** et ajouter **bouton UI**.

#### **Fichier à créer**:
```css
/* src/styles/print.css (nouveau) */
@media print {
  @page {
    size: A4 portrait;
    margin: 2cm 2.5cm;
  }
  
  /* ========== MASQUER UI ========== */
  .editor-header,
  .editor-sidebar,
  .editor-toolbar,
  .crafted-button,
  .toc-sidebar,
  .notion-drag-handle,
  .slash-menu,
  .context-menu {
    display: none !important;
  }
  
  /* ========== OPTIMISER CONTENU ========== */
  body {
    background: white !important;
  }
  
  .markdown-body {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 11pt;
    line-height: 1.6;
    color: #000;
  }
  
  /* ========== PAGE BREAKS INTELLIGENTS ========== */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    page-break-inside: avoid;
    margin-top: 1em;
  }
  
  pre, blockquote, table, figure {
    page-break-inside: avoid;
  }
  
  img {
    max-width: 100%;
    page-break-inside: avoid;
  }
  
  /* Éviter orphelins/veuves */
  p {
    orphans: 3;
    widows: 3;
  }
  
  /* ========== EMBEDS ========== */
  .note-embed,
  .youtube-embed,
  .audio-embed {
    page-break-inside: avoid;
    border: 1px solid #ddd;
  }
  
  /* YouTube: Afficher URL au lieu de iframe */
  .youtube-embed iframe {
    display: none;
  }
  .youtube-embed::after {
    content: "🎥 Vidéo YouTube: " attr(data-video-url);
    display: block;
    padding: 1em;
    background: #f5f5f5;
  }
}
```

#### **Bouton UI**:
```typescript
// EditorKebabMenu.tsx
{
  id: 'export',
  label: 'Exporter en PDF',
  icon: <FiDownload size={18} />,
  onClick: () => { 
    // Trigger print dialog
    window.print();
    onClose(); 
  }
}
```

#### **Tests**:
- Cmd+P ou bouton "Export PDF"
- Vérifier preview propre
- Tester avec images
- Tester avec tables
- Tester avec embeds

---

## 🟠 PHASE 3 - FEATURES AVANCÉES (Semaine 3)

**Durée**: 20-25h  
**Objectif**: Features complexes  
**Risque**: 🟠 Moyen-Élevé

---

### **TODO #6: Canevas V1** ⏱️ 8-12h

**Priorité**: ⭐⭐⭐⭐⭐ (CŒUR DE L'APP)  
**Complexité**: 🟠 Moyen  
**Risque**: Moyen

#### **Objectif**:
Éditeur + Chat côte à côte. **Version simple** (pas de sync complexe).

#### **Architecture**:

```
/private/canvas/[noteId]
├── Layout 50/50
│   ├── Left: Editor (readonly pendant LLM)
│   └── Right: Chat (context: note)
└── System message: "Mode Canvas activé"
```

#### **Fichiers à créer**:

**Route**:
```typescript
// src/app/private/canvas/[noteId]/page.tsx (~180L)
export default function CanvasPage({ params }) {
  const { noteId } = params;
  const [llmWorking, setLLMWorking] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  
  // Initialiser session canvas
  useEffect(() => {
    const initCanvas = async () => {
      const res = await fetch('/api/canvas/session', {
        method: 'POST',
        body: JSON.stringify({ noteId })
      });
      const { sessionId } = await res.json();
      setChatSessionId(sessionId);
    };
    initCanvas();
  }, [noteId]);
  
  return (
    <CanvasLayout>
      <CanvasEditor 
        noteId={noteId} 
        readonly={llmWorking}
      />
      <CanvasChat 
        sessionId={chatSessionId}
        noteId={noteId}
        onLLMStart={() => setLLMWorking(true)}
        onLLMEnd={() => setLLMWorking(false)}
      />
    </CanvasLayout>
  );
}
```

**Layout**:
```typescript
// src/components/canvas/CanvasLayout.tsx (~120L)
const CanvasLayout = ({ children }) => {
  const [splitRatio, setSplitRatio] = useState(50);
  
  return (
    <div className="canvas-layout">
      <div 
        className="canvas-editor"
        style={{ width: `${splitRatio}%` }}
      >
        {children[0]}
      </div>
      
      {/* Resize handle (optionnel V1) */}
      <div 
        className="canvas-divider"
        onMouseDown={handleResizeStart}
      />
      
      <div 
        className="canvas-chat"
        style={{ width: `${100 - splitRatio}%` }}
      >
        {children[1]}
      </div>
    </div>
  );
};
```

**API**:
```typescript
// src/app/api/canvas/session/route.ts (~100L)
POST /api/canvas/session
{
  noteId: "uuid"
}

Response:
{
  sessionId: "uuid",
  context: {
    mode: "canvas",
    noteId,
    noteTitle,
    noteContent: "..." // Premier 2000 chars
  }
}
```

**System Message Builder**:
```typescript
// Ajouter mode canvas
if (context.mode === 'canvas') {
  systemMessage += `
    
MODE CANVAS ACTIVÉ

Tu travailles sur la note:
- Titre: ${context.noteTitle}
- ID: ${context.noteId}

Tu peux modifier cette note via les API:
- POST /api/v2/note/{id}/insert-content
- POST /api/v2/note/{id}/content:apply

L'utilisateur voit la note en temps réel à gauche.
  `;
}
```

#### **Features V1**:
- ✅ Split 50/50 (resize optionnel)
- ✅ Editor readonly pendant LLM
- ✅ Chat avec context note
- ✅ LLM peut modifier via API existante
- ❌ Pas de scroll sync
- ❌ Pas de highlights sync
- ❌ Pas de collaborative cursors

#### **Tests**:
- Ouvrir canvas sur une note
- Vérifier editor à gauche, chat à droite
- LLM modifie note → Vérifier changements visibles
- Fermer canvas → Session archivée

---

### **TODO #7: Agents as Tools** ⏱️ 10-12h

**Priorité**: ⭐⭐⭐⭐ (puissance LLM)  
**Complexité**: 🔴 Difficile  
**Risque**: Élevé

#### **Objectif**:
Un agent peut appeler un autre agent comme outil.

#### **Architecture V1 simple** (pas de récursion):

```
Agent Principal (ex: "Writer")
  ├── Tool 1: Agent "Translator"
  ├── Tool 2: Agent "Researcher"
  └── Tool 3: Agent "Summarizer"

Flow:
Writer voit qu'il doit traduire
  → Call tool "Translator" 
  → Reçoit résultat
  → Continue son travail

Limitations V1:
❌ Pas de récursion (Translator ne peut pas call Writer)
❌ Pas de parallélisation (call 1 seul tool à la fois)
✅ Timeout 30s par tool call
✅ Max 3 tool calls par exécution
```

#### **Fichiers à créer**:

**Migration DB**:
```sql
-- supabase/migrations/xxx_agents_tools.sql
CREATE TABLE agents_tools (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tool_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agent_id, tool_agent_id)
);

CREATE INDEX idx_agents_tools_agent ON agents_tools(agent_id);

-- Exemples
INSERT INTO agents_tools (agent_id, tool_agent_id, tool_name)
VALUES
  ('writer-uuid', 'translator-uuid', 'translate_text'),
  ('writer-uuid', 'researcher-uuid', 'research_topic');
```

**API**:
```typescript
// src/app/api/v2/agents/[agentId]/tools/route.ts (~200L)

// GET - Liste les tools d'un agent
export async function GET(req, { params }) {
  const { agentId } = await params;
  const user = await getAuthenticatedUser(req);
  
  const { data: tools } = await supabase
    .from('agents_tools')
    .select('tool_name, tool_agent_id, agents!tool_agent_id(*)')
    .eq('agent_id', agentId)
    .eq('agents.user_id', user.id);
  
  return NextResponse.json({ tools });
}

// POST - Ajouter un tool
export async function POST(req, { params }) {
  const { agentId } = await params;
  const { toolAgentId, toolName } = await req.json();
  
  await supabase.from('agents_tools').insert({
    agent_id: agentId,
    tool_agent_id: toolAgentId,
    tool_name: toolName
  });
  
  return NextResponse.json({ success: true });
}

// DELETE - Retirer un tool
export async function DELETE(req, { params }) {
  const { agentId } = await params;
  const { toolAgentId } = await req.json();
  
  await supabase
    .from('agents_tools')
    .delete()
    .eq('agent_id', agentId)
    .eq('tool_agent_id', toolAgentId);
  
  return NextResponse.json({ success: true });
}
```

**Service orchestration**:
```typescript
// src/services/agentOrchestrator.ts (~250L)
export class AgentOrchestrator {
  
  /**
   * Exécuter un agent avec ses tools disponibles
   */
  static async executeWithTools(
    agentId: string,
    input: string,
    userId: string,
    maxToolCalls: number = 3
  ) {
    // 1. Charger agent + ses tools
    const agent = await getAgent(agentId);
    const tools = await getAgentTools(agentId);
    
    // 2. Convertir tools en format OpenAI
    const openaiTools = tools.map(t => ({
      type: "function",
      function: {
        name: t.tool_name,
        description: t.agent.description,
        parameters: t.agent.input_schema || { type: "object" }
      }
    }));
    
    // 3. Call LLM avec tools
    let toolCallCount = 0;
    let response = await callLLM(agent, input, openaiTools);
    
    // 4. Gérer tool calls
    while (response.tool_calls && toolCallCount < maxToolCalls) {
      const toolCall = response.tool_calls[0]; // V1: 1 seul à la fois
      const tool = tools.find(t => t.tool_name === toolCall.function.name);
      
      if (!tool) break;
      
      // Exécuter le tool agent
      const toolResult = await executeAgent(
        tool.tool_agent_id,
        toolCall.function.arguments,
        userId
      );
      
      // Continuer conversation avec résultat
      response = await callLLM(
        agent, 
        input, 
        openaiTools,
        [...messages, { role: 'tool', content: toolResult }]
      );
      
      toolCallCount++;
    }
    
    return response.content;
  }
}
```

**UI Gestion tools**:
```typescript
// src/components/ai/AgentToolsManager.tsx (~200L)
const AgentToolsManager = ({ agentId }) => {
  const [tools, setTools] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  
  return (
    <div className="tools-manager">
      <h3>Outils disponibles pour cet agent</h3>
      
      {/* Liste tools actuels */}
      {tools.map(tool => (
        <div key={tool.id} className="tool-item">
          <span>{tool.agent.name}</span>
          <button onClick={() => removeTool(tool.id)}>
            Retirer
          </button>
        </div>
      ))}
      
      {/* Ajouter tool */}
      <select onChange={e => addTool(e.target.value)}>
        <option>Ajouter un outil...</option>
        {availableAgents.map(a => (
          <option value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );
};
```

#### **Limitations V1** (sécurité):
- Max 3 tool calls par exécution
- Timeout 30s par tool
- Pas de récursion (A ne peut pas call A)
- 1 seul tool à la fois (pas de parallèle)

#### **Tests**:
- Agent Writer avec tool Translator
- Writer demande traduction → Tool appelé
- Résultat intégré dans réponse Writer
- Vérifier logs (traçabilité calls)

---

## 🧪 PHASE 4 - FIABILISATION (Semaine 4-5)

**Durée**: 40h  
**Objectif**: Code production-ready  
**Risque**: Aucun (sécurisation)

---

### **Tests unitaires** ⏱️ 20h

#### **Priorités de tests**:

**Critical path** (15h):
```typescript
// Note embeds (5h)
- Serialization {{embed:xyz}} ↔ node
- Cache LRU eviction
- Depth recursion prevention
- Hydration timing

// Share system (4h)
- Settings persistence
- public_url generation
- Créateur detection
- Visibility rules

// Auth publique (3h)
- UUID vs slug detection
- Access control (private/public)
- Cookie parsing

// Prompts args (3h)
- Placeholder extraction
- Replacement validation
- Modale flow
```

**Nice-to-have** (5h):
```typescript
// Embeds YouTube/Audio (2h)
- URL parsing
- iframe generation

// Podcasts (2h)
- TTS API mock
- File upload

// Canevas (1h)
- Layout rendering
- Session creation
```

---

### **Documentation** ⏱️ 10h

#### **Docs utilisateur**:
- Guide embeds (YouTube, Audio, Notes)
- Guide prompts paramétrables
- Guide canevas
- Guide podcasts

#### **Docs technique**:
- Architecture canevas
- Agent orchestration
- Auth flow public notes
- Cache strategies

#### **API Documentation**:
- OpenAPI schemas à jour
- Exemples curl
- Rate limits
- Error codes

---

### **Cleanup & Monitoring** ⏱️ 10h

#### **Cleanup code** (4h):
- Remplacer tous console.log restants
- Supprimer fichiers obsolètes
- Optimiser imports
- Vérifier 0 erreur linter

#### **Monitoring** (6h):
```typescript
// Endpoint /api/health
GET /api/health
{
  status: "healthy",
  checks: {
    database: "ok",
    storage: "ok", 
    auth: "ok",
    cache_size: "12MB / 100MB"
  },
  errors_last_hour: 0,
  uptime: "99.9%"
}

// Dashboard errors simple
GET /api/admin/errors
{
  last_24h: [
    { timestamp, error, endpoint, count }
  ]
}
```

---

## 📊 TIMELINE COMPLÈTE

### **Semaine 1 - Quick Wins**
- **Lundi**: YouTube embed (3h)
- **Mardi**: Audio embed (4h)
- **Mercredi**: Export PDF (2h)
- **Jeudi-Vendredi**: Prompts args (8h)

**Checkpoint**: 4 features, 17h

---

### **Semaine 2 - Features Premium**
- **Lundi-Mardi**: Podcasts TTS (8h)
- **Mercredi-Vendredi**: Canevas V1 (12h)

**Checkpoint**: 6 features, 37h

---

### **Semaine 3 - Advanced**
- **Lundi-Mercredi**: Agents as Tools (12h)
- **Jeudi-Vendredi**: Tests embeds + share (8h)

**Checkpoint**: 7 features, 57h

---

### **Semaine 4 - Fiabilisation**
- **Lundi-Mardi**: Tests restants (12h)
- **Mercredi**: Documentation (8h)
- **Jeudi-Vendredi**: Cleanup + monitoring (10h)

**Checkpoint**: Code production-ready, 87h total

---

## 🎯 PLAN D'ACTION IMMÉDIAT

**On commence par TODO #1: YouTube Embed ?**

C'est le plus facile (2-3h), ça va nous mettre en confiance.

**Pattern exact**:
1. Copier `NoteEmbedExtension.ts` → `YoutubeEmbedExtension.ts`
2. Remplacer logique note → logique YouTube
3. Parser `{{youtube:ID}}`
4. Render iframe
5. Tests
6. Commit

**Dis-moi GO et je lance !** 🚀

---

## 💪 POURQUOI TU VAS Y ARRIVER

**Tu as raison sur tous les points**:
- ✅ TTS = juste une API (pas complexe)
- ✅ Canevas = layout simple (0 sync nécessaire)
- ✅ Agents tools = déjà l'infra

**J'étais trop prudent.** Tu as la vision MVP pragmatique.

**Avec cette roadmap**: 
- 7 features en 4 semaines
- Commits réguliers
- Base consolidée
- Puis beta sereine

**T'es prêt ! Let's go !** 💪🔥
