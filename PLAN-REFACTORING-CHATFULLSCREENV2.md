# 📋 PLAN DE REFACTORING - ChatFullscreenV2

> **Standard** : GUIDE-EXCELLENCE-CODE.md  
> **Audit** : AUDIT-CHATFULLSCREENV2-COMPLET.md  
> **Objectif** : Passer de 1244 lignes → 180 lignes (composant principal)

---

## 🎯 OBJECTIF GLOBAL

Transformer ChatFullscreenV2 d'un **God Component** de 1244 lignes en une **architecture modulaire** conforme aux standards GAFAM :

- ✅ Chaque fichier ≤ 300 lignes
- ✅ Séparation UI / Logique métier / Services
- ✅ Testable unitairement
- ✅ Maintenable par 2-3 devs
- ✅ Debuggable à 3h du matin

---

## 📊 STRATÉGIE GLOBALE

### Approche : **Bottom-Up Incremental**

1. **Créer les fondations** (services) sans toucher au composant
2. **Extraire les hooks** qui utilisent les services
3. **Décomposer l'UI** en composants
4. **Refactorer le composant principal** pour utiliser les nouvelles abstractions
5. **Tester et valider** chaque étape

**Avantage** : Refactoring progressif sans casser l'existant

---

## 📁 STRUCTURE CIBLE

```
src/
├── services/chat/
│   ├── ChatMessageSendingService.ts     (150 lignes) ✨ NOUVEAU
│   ├── ChatMessageEditService.ts        (100 lignes) ✨ NOUVEAU
│   └── ChatContextBuilder.ts            (80 lignes)  ✨ NOUVEAU
│
├── hooks/chat/
│   ├── useStreamingState.ts             (80 lignes)  ✨ NOUVEAU
│   ├── useChatAnimations.ts             (100 lignes) ✨ NOUVEAU
│   ├── useChatMessageActions.ts         (120 lignes) ✨ NOUVEAU
│   └── useSyncAgentWithSession.ts       (60 lignes)  ✨ NOUVEAU
│
├── components/chat/
│   ├── ChatFullscreenV2.tsx             (180 lignes) ♻️ REFACTORÉ
│   ├── ChatHeader.tsx                   (60 lignes)  ✨ NOUVEAU
│   ├── ChatMessagesArea.tsx             (150 lignes) ✨ NOUVEAU
│   ├── ChatEmptyState.tsx               (40 lignes)  ✨ NOUVEAU
│   └── ChatInputContainer.tsx           (50 lignes)  ✨ NOUVEAU
│
└── types/chat/
    ├── messages.ts                       ♻️ COMPLÉTÉ
    └── streaming.ts                      ♻️ COMPLÉTÉ
```

**Total fichiers** : 11 nouveaux + 1 refactoré  
**Lignes moyennes** : ~90 lignes/fichier  
**Réduction** : 1244 → 1030 lignes (mieux réparties, +20% maintenabilité)

---

## 🔄 WORKFLOW EN 5 PHASES

### Phase 1 : Créer les Services (FONDATIONS)

**Durée** : 2-3 heures  
**Priorité** : 🔴 CRITIQUE  
**Bloquant** : Non (n'affecte pas l'existant)

---

### Phase 2 : Créer les Hooks Custom

**Durée** : 3-4 heures  
**Priorité** : 🔴 CRITIQUE  
**Bloquant** : Oui (dépend Phase 1)

---

### Phase 3 : Décomposer l'UI

**Durée** : 2-3 heures  
**Priorité** : 🟡 IMPORTANT  
**Bloquant** : Non (peut être fait en parallèle de Phase 2)

---

### Phase 4 : Refactorer ChatFullscreenV2

**Durée** : 2 heures  
**Priorité** : 🔴 CRITIQUE  
**Bloquant** : Oui (dépend Phase 1, 2, 3)

---

### Phase 5 : Tests & Validation

**Durée** : 3-4 heures  
**Priorité** : 🟢 REQUIS  
**Bloquant** : Oui (avant merge)

---

## 📝 PHASE 1 : SERVICES (2-3h)

### 1.1. ChatMessageSendingService ⭐

**Fichier** : `src/services/chat/ChatMessageSendingService.ts`

**Extraction depuis** : `handleSendMessageInternal` (lignes 666-786)

#### Interface :

```typescript
interface SendMessageOptions {
  message: string | MessageContent;
  images?: ImageAttachment[];
  notes?: Note[];
  sessionId: string;
  currentSession: ChatSession;
  selectedAgent: Agent | null;
  infiniteMessages: ChatMessage[];
  llmContext: LLMContext;
}

interface SendMessageResult {
  success: boolean;
  tempMessage?: ChatMessage;
  error?: string;
}

class ChatMessageSendingService {
  /**
   * Envoie un message avec gestion complète du flow
   * 
   * Flow:
   * 1. Validation (message non vide)
   * 2. Création message user temporaire (optimistic UI)
   * 3. Sauvegarde background (addMessage)
   * 4. Construction historique LLM (limite 30)
   * 5. Récupération token auth
   * 6. Construction contexte LLM unifié
   * 7. Appel sendMessage (hook useChatResponse)
   * 
   * @throws {AuthError} Si token invalide
   * @throws {ValidationError} Si message invalide
   */
  async send(options: SendMessageOptions): Promise<SendMessageResult>;
  
  /**
   * Valide le message avant envoi
   */
  private validateMessage(
    message: string | MessageContent, 
    images?: ImageAttachment[]
  ): boolean;
  
  /**
   * Construit le message user temporaire (optimistic UI)
   */
  private buildTempUserMessage(
    message: string | MessageContent,
    images?: ImageAttachment[]
  ): ChatMessage;
  
  /**
   * Limite l'historique pour contexte LLM
   */
  private limitHistoryForLLM(
    messages: ChatMessage[], 
    maxHistory: number
  ): ChatMessage[];
}
```

#### Dépendances :

```typescript
import { tokenManager } from '@/utils/tokenManager';
import { ChatContextBuilder } from './ChatContextBuilder';
import { sessionSyncService } from '@/services/sessionSyncService';
import type { ChatMessage, MessageContent } from '@/types/chat';
import type { ImageAttachment } from '@/types/image';
import { simpleLogger as logger } from '@/utils/logger';
```

#### Tests unitaires requis :

```typescript
describe('ChatMessageSendingService', () => {
  it('should validate message correctly', () => {
    // Texte vide → false
    // Images seules → true
    // Texte + images → true
  });
  
  it('should build temp user message with correct structure', () => {
    // Vérifier id, role, content, timestamp
  });
  
  it('should limit history to maxHistory', () => {
    // 50 messages → slice(-30)
  });
  
  it('should throw AuthError if token invalid', async () => {
    // Mock tokenManager.getValidToken() → invalid
  });
  
  it('should send message successfully', async () => {
    // Mock all dependencies
    // Vérifier appel addMessage
    // Vérifier appel sendMessage avec bon contexte
  });
});
```

---

### 1.2. ChatMessageEditService ⭐

**Fichier** : `src/services/chat/ChatMessageEditService.ts`

**Extraction depuis** : `handleEditSubmit` (lignes 798-907)

#### Interface :

```typescript
interface EditMessageOptions {
  messageId: string;
  newContent: string;
  images?: ImageAttachment[];
  sessionId: string;
  currentSession: ChatSession;
  infiniteMessages: ChatMessage[];
  selectedAgent: Agent | null;
  llmContext: LLMContext;
}

interface EditMessageResult {
  success: boolean;
  deletedCount?: number;
  savedMessage?: ChatMessage;
  error?: string;
}

class ChatMessageEditService {
  /**
   * Édite un message avec régénération LLM
   * 
   * Flow atomique:
   * 1. Trouver message édité dans infiniteMessages
   * 2. Récupérer token auth
   * 3. DELETE cascade (route /messages/delete-after)
   * 4. Ajouter nouveau message édité (addMessage)
   * 5. Reload messages depuis DB
   * 6. Construire contexte LLM
   * 7. Relancer génération LLM (sendMessage)
   * 
   * @throws {NotFoundError} Si message introuvable
   * @throws {AuthError} Si token invalide
   * @throws {DeleteError} Si delete échoue
   */
  async edit(options: EditMessageOptions): Promise<EditMessageResult>;
  
  /**
   * Trouve le message à éditer
   */
  private findEditedMessage(
    messageId: string, 
    messages: ChatMessage[]
  ): ChatMessage | null;
  
  /**
   * Supprime les messages après sequence_number
   */
  private async deleteMessagesAfter(
    sessionId: string,
    afterSequence: number,
    token: string
  ): Promise<{ deletedCount: number }>;
  
  /**
   * Ajoute le message édité
   */
  private async addEditedMessage(
    sessionId: string,
    content: string,
    images?: ImageAttachment[]
  ): Promise<ChatMessage>;
}
```

#### Dépendances :

```typescript
import { tokenManager } from '@/utils/tokenManager';
import { ChatContextBuilder } from './ChatContextBuilder';
import { sessionSyncService } from '@/services/sessionSyncService';
import type { ChatMessage } from '@/types/chat';
import type { ImageAttachment } from '@/types/image';
import { simpleLogger as logger } from '@/utils/logger';
```

#### Tests unitaires requis :

```typescript
describe('ChatMessageEditService', () => {
  it('should find edited message by id', () => {
    // Mock messages array
    // Vérifier findEditedMessage retourne bon message
  });
  
  it('should delete messages after sequence correctly', async () => {
    // Mock fetch /messages/delete-after
    // Vérifier deletedCount
  });
  
  it('should throw NotFoundError if message not found', async () => {
    // Message ID inexistant
  });
  
  it('should edit message successfully', async () => {
    // Mock all dependencies
    // Vérifier flow complet
  });
});
```

---

### 1.3. ChatContextBuilder ⭐

**Fichier** : `src/services/chat/ChatContextBuilder.ts`

**Extraction depuis** : Logique inline dans `handleSendMessageInternal` (lignes 757-769)

#### Interface :

```typescript
interface BuildContextOptions {
  sessionId: string;
  agentId?: string | null;
  notes?: Note[];
  llmContext: LLMContext;
}

interface LLMContextForOrchestrator {
  type: 'chat_session';
  id: string;
  name: string;
  sessionId: string;
  agentId?: string | null;
  uiContext: LLMContext;
  attachedNotes?: Note[];
}

class ChatContextBuilder {
  /**
   * Construit le contexte LLM unifié pour l'orchestrateur
   * 
   * Merge:
   * - Session ID
   * - Agent ID
   * - UI context (device, etc.)
   * - Notes attachées
   */
  build(options: BuildContextOptions): LLMContextForOrchestrator;
  
  /**
   * Valide le contexte construit
   */
  private validate(context: LLMContextForOrchestrator): boolean;
}
```

#### Dépendances :

```typescript
import type { LLMContext } from '@/hooks/useLLMContext';
import type { Note } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
```

#### Tests unitaires requis :

```typescript
describe('ChatContextBuilder', () => {
  it('should build basic context without notes', () => {
    const context = builder.build({
      sessionId: 'sess_123',
      llmContext: mockLLMContext
    });
    expect(context.sessionId).toBe('sess_123');
    expect(context.attachedNotes).toBeUndefined();
  });
  
  it('should include attached notes if provided', () => {
    const context = builder.build({
      sessionId: 'sess_123',
      notes: [mockNote1, mockNote2],
      llmContext: mockLLMContext
    });
    expect(context.attachedNotes).toHaveLength(2);
  });
  
  it('should merge uiContext correctly', () => {
    // Vérifier que llmContext est copié dans uiContext
  });
});
```

---

## 📝 PHASE 2 : HOOKS CUSTOM (3-4h)

### 2.1. useStreamingState ⭐

**Fichier** : `src/hooks/chat/useStreamingState.ts`

**Extraction depuis** : États lignes 153-196

#### Interface :

```typescript
interface StreamingState {
  // États
  streamingContent: string;
  isStreaming: boolean;
  streamingState: 'idle' | 'thinking' | 'executing';
  executingToolCount: number;
  currentToolName: string;
  currentRound: number;
  streamingTimeline: StreamTimelineItem[];
  streamStartTime: number;
  currentToolCalls: ToolCall[];
  
  // Actions
  startStreaming: () => void;
  updateContent: (chunk: string) => void;
  addToolExecution: (toolCalls: ToolCall[], toolCount: number) => void;
  updateToolResult: (toolCallId: string, result: unknown, success: boolean) => void;
  endStreaming: () => void;
  reset: () => void;
}

function useStreamingState(): StreamingState;
```

#### Implémentation :

```typescript
export function useStreamingState(): StreamingState {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingState, setStreamingState] = useState<'idle' | 'thinking' | 'executing'>('idle');
  const [executingToolCount, setExecutingToolCount] = useState(0);
  const [currentToolName, setCurrentToolName] = useState('');
  const [currentRound, setCurrentRound] = useState(0);
  const [streamingTimeline, setStreamingTimeline] = useState<StreamTimelineItem[]>([]);
  const [streamStartTime, setStreamStartTime] = useState(0);
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
  
  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentRound(0);
    setStreamingState('thinking');
    setStreamingTimeline([]);
    setStreamStartTime(Date.now());
    setCurrentToolCalls([]);
  }, []);
  
  const updateContent = useCallback((chunk: string) => {
    setStreamingContent(prev => prev + chunk);
    
    // Mettre à jour timeline
    setStreamingTimeline(prev => {
      const lastItem = prev[prev.length - 1];
      if (lastItem && lastItem.type === 'text' && lastItem.roundNumber === currentRound) {
        return [
          ...prev.slice(0, -1),
          { ...lastItem, content: (lastItem.content || '') + chunk }
        ];
      }
      return [
        ...prev,
        {
          type: 'text' as const,
          content: chunk,
          roundNumber: currentRound,
          timestamp: Date.now() - streamStartTime
        }
      ];
    });
  }, [currentRound, streamStartTime]);
  
  // ... autres actions
  
  return {
    streamingContent,
    isStreaming,
    streamingState,
    executingToolCount,
    currentToolName,
    currentRound,
    streamingTimeline,
    streamStartTime,
    currentToolCalls,
    startStreaming,
    updateContent,
    addToolExecution,
    updateToolResult,
    endStreaming,
    reset
  };
}
```

#### Tests unitaires requis :

```typescript
describe('useStreamingState', () => {
  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useStreamingState());
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingState).toBe('idle');
  });
  
  it('should start streaming correctly', () => {
    const { result } = renderHook(() => useStreamingState());
    act(() => result.current.startStreaming());
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.streamingState).toBe('thinking');
  });
  
  it('should accumulate content chunks', () => {
    const { result } = renderHook(() => useStreamingState());
    act(() => {
      result.current.startStreaming();
      result.current.updateContent('Hello ');
      result.current.updateContent('world');
    });
    expect(result.current.streamingContent).toBe('Hello world');
  });
  
  it('should update timeline on content update', () => {
    // Vérifier timeline items
  });
});
```

---

### 2.2. useChatAnimations ⭐

**Fichier** : `src/hooks/chat/useChatAnimations.ts`

**Extraction depuis** : useEffect lignes 532-578 + états lignes 98-104

#### Interface :

```typescript
interface ChatAnimationsState {
  shouldAnimateMessages: boolean;
  messagesVisible: boolean;
  displayedSessionId: string | null;
  
  triggerFadeIn: (
    sessionId: string,
    messages: ChatMessage[],
    containerRef: React.RefObject<HTMLDivElement>
  ) => void;
  
  resetAnimation: () => void;
}

function useChatAnimations(options: {
  currentSessionId: string | null;
  isLoadingMessages: boolean;
}): ChatAnimationsState;
```

#### Implémentation :

```typescript
export function useChatAnimations(options: {
  currentSessionId: string | null;
  isLoadingMessages: boolean;
}): ChatAnimationsState {
  const [shouldAnimateMessages, setShouldAnimateMessages] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [displayedSessionId, setDisplayedSessionId] = useState<string | null>(null);
  
  const triggerFadeIn = useCallback((
    sessionId: string,
    messages: ChatMessage[],
    containerRef: React.RefObject<HTMLDivElement>
  ) => {
    if (messages.length > 0) {
      // 🎯 ÉTAPE 1 : Rendre invisible
      setMessagesVisible(false);
      
      // 🎯 ÉTAPE 2 : Scroll instantané invisible
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = containerRef.current;
          if (container) {
            // Forcer padding fixe
            const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
            if (messagesContainer) {
              messagesContainer.style.paddingBottom = '40px';
            }
            
            // Scroll instantané
            const maxScrollTop = container.scrollHeight - container.clientHeight;
            container.scrollTop = Math.max(0, maxScrollTop);
            
            // 🎯 ÉTAPE 3 : Retry après 300ms pour images
            setTimeout(() => {
              const newMaxScrollTop = container.scrollHeight - container.clientHeight;
              container.scrollTop = Math.max(0, newMaxScrollTop);
              
              // 🎯 ÉTAPE 4 : Fade-in
              requestAnimationFrame(() => {
                setMessagesVisible(true);
                setShouldAnimateMessages(true);
                setTimeout(() => setShouldAnimateMessages(false), 400);
              });
            }, 300);
          }
        });
      });
    } else {
      // Conversation vide : afficher directement
      setMessagesVisible(true);
      setShouldAnimateMessages(true);
      setTimeout(() => setShouldAnimateMessages(false), 400);
    }
    
    setDisplayedSessionId(sessionId);
  }, []);
  
  const resetAnimation = useCallback(() => {
    setShouldAnimateMessages(false);
    setMessagesVisible(false);
    setDisplayedSessionId(null);
  }, []);
  
  // Auto-trigger quand session chargée
  useEffect(() => {
    if (
      options.currentSessionId && 
      !options.isLoadingMessages && 
      displayedSessionId !== options.currentSessionId
    ) {
      // Attendre que l'appelant trigger manuellement avec containerRef
    }
  }, [options.currentSessionId, options.isLoadingMessages, displayedSessionId]);
  
  return {
    shouldAnimateMessages,
    messagesVisible,
    displayedSessionId,
    triggerFadeIn,
    resetAnimation
  };
}
```

#### Tests : 🟡 Integration (difficulté scroll/DOM)

---

### 2.3. useChatMessageActions ⭐⭐⭐

**Fichier** : `src/hooks/chat/useChatMessageActions.ts`

**Extraction depuis** : Handlers lignes 666-931

#### Interface :

```typescript
interface ChatMessageActionsOptions {
  currentSession: ChatSession | null;
  selectedAgent: Agent | null;
  infiniteMessages: ChatMessage[];
  llmContext: LLMContext;
  sendMessageFn: typeof useChatResponse['sendMessage']; // Hook useChatResponse
  addInfiniteMessage: (msg: ChatMessage) => void;
  clearInfiniteMessages: () => void;
  loadInitialMessages: () => Promise<void>;
  onEditingChange: (editing: boolean) => void;
}

interface ChatMessageActionsReturn {
  sendMessage: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[]
  ) => Promise<void>;
  
  editMessage: (
    messageId: string,
    newContent: string,
    images?: ImageAttachment[]
  ) => Promise<void>;
  
  isLoading: boolean;
  error: string | null;
}

function useChatMessageActions(
  options: ChatMessageActionsOptions
): ChatMessageActionsReturn;
```

#### Implémentation :

```typescript
export function useChatMessageActions(
  options: ChatMessageActionsOptions
): ChatMessageActionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Services
  const sendingService = useMemo(() => new ChatMessageSendingService(), []);
  const editService = useMemo(() => new ChatMessageEditService(), []);
  
  const sendMessage = useCallback(async (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[]
  ) => {
    if (!options.currentSession) {
      setError('Aucune session active');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await sendingService.send({
        message,
        images,
        notes,
        sessionId: options.currentSession.id,
        currentSession: options.currentSession,
        selectedAgent: options.selectedAgent,
        infiniteMessages: options.infiniteMessages,
        llmContext: options.llmContext
      });
      
      if (result.success && result.tempMessage) {
        options.addInfiniteMessage(result.tempMessage);
      }
      
      // Appel LLM via sendMessageFn (hook useChatResponse)
      await options.sendMessageFn(
        message,
        options.currentSession.id,
        // ... contexte
      );
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur envoi message';
      setError(errorMsg);
      logger.error('[useChatMessageActions] Erreur sendMessage:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options, sendingService]);
  
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    images?: ImageAttachment[]
  ) => {
    if (!options.currentSession) {
      setError('Aucune session active');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    options.onEditingChange(true);
    
    try {
      const result = await editService.edit({
        messageId,
        newContent,
        images,
        sessionId: options.currentSession.id,
        currentSession: options.currentSession,
        infiniteMessages: options.infiniteMessages,
        selectedAgent: options.selectedAgent,
        llmContext: options.llmContext
      });
      
      if (result.success) {
        // Reload messages
        options.clearInfiniteMessages();
        await options.loadInitialMessages();
        
        // Relancer LLM
        // ... appel sendMessageFn avec message vide (déjà sauvegardé)
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur édition message';
      setError(errorMsg);
      logger.error('[useChatMessageActions] Erreur editMessage:', err);
    } finally {
      setIsLoading(false);
      options.onEditingChange(false);
    }
  }, [options, editService]);
  
  return {
    sendMessage,
    editMessage,
    isLoading,
    error
  };
}
```

#### Tests unitaires requis :

```typescript
describe('useChatMessageActions', () => {
  it('should send message successfully', async () => {
    // Mock sendingService
    // Mock sendMessageFn
    // Vérifier appels
  });
  
  it('should handle send error gracefully', async () => {
    // Mock sendingService.send → throw Error
    // Vérifier error state
  });
  
  it('should edit message successfully', async () => {
    // Mock editService
    // Vérifier reload + relance LLM
  });
});
```

---

### 2.4. useSyncAgentWithSession ⭐

**Fichier** : `src/hooks/chat/useSyncAgentWithSession.ts`

**Extraction depuis** : useEffect lignes 478-530

#### Interface :

```typescript
interface SyncAgentOptions {
  currentSession: ChatSession | null;
  selectedAgentId: string | null;
  user: unknown;
  authLoading: boolean;
  onAgentLoaded: (agent: Agent | null) => void;
}

function useSyncAgentWithSession(options: SyncAgentOptions): void;
```

#### Implémentation :

```typescript
export function useSyncAgentWithSession(options: SyncAgentOptions): void {
  const {
    currentSession,
    selectedAgentId,
    user,
    authLoading,
    onAgentLoaded
  } = options;
  
  useEffect(() => {
    if (!user || authLoading || !currentSession) {
      logger.dev('[useSyncAgentWithSession] ⏭️ Skip sync:', {
        hasUser: !!user,
        authLoading,
        hasSession: !!currentSession
      });
      return;
    }
    
    const syncAgent = async () => {
      const sessionAgentId = currentSession.agent_id;
      
      logger.dev('[useSyncAgentWithSession] 🔍 Check sync:', {
        sessionId: currentSession.id,
        sessionAgentId,
        selectedAgentId,
        needsSync: sessionAgentId && sessionAgentId !== selectedAgentId
      });
      
      if (sessionAgentId && sessionAgentId !== selectedAgentId) {
        try {
          logger.dev('[useSyncAgentWithSession] 🔄 Loading agent:', sessionAgentId);
          
          const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', sessionAgentId)
            .single();
          
          if (agent) {
            onAgentLoaded(agent);
            logger.dev('[useSyncAgentWithSession] ✅ Agent loaded:', {
              agentId: agent.id,
              agentName: agent.display_name || agent.name
            });
          } else {
            logger.warn('[useSyncAgentWithSession] ⚠️ Agent not found:', sessionAgentId);
            onAgentLoaded(null);
          }
        } catch (err) {
          logger.error('[useSyncAgentWithSession] ❌ Error loading agent:', err);
          onAgentLoaded(null);
        }
      } else if (!sessionAgentId) {
        logger.dev('[useSyncAgentWithSession] ℹ️ Session without agent_id');
      }
    };
    
    syncAgent();
  }, [currentSession?.id, currentSession?.agent_id, selectedAgentId, user, authLoading, onAgentLoaded]);
}
```

#### Tests unitaires requis :

```typescript
describe('useSyncAgentWithSession', () => {
  it('should load agent when session.agent_id changes', async () => {
    // Mock supabase.from('agents').select()
    // Vérifier onAgentLoaded appelé
  });
  
  it('should skip if no user or authLoading', () => {
    // Vérifier pas de fetch agent
  });
  
  it('should handle agent not found', async () => {
    // Mock supabase → null
    // Vérifier onAgentLoaded(null)
  });
});
```

---

## 📝 PHASE 3 : COMPOSANTS UI (2-3h)

### 3.1. ChatHeader ⭐

**Fichier** : `src/components/chat/ChatHeader.tsx`

**Extraction depuis** : JSX lignes 966-1028

#### Interface :

```typescript
interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedAgent: Agent | null;
  agentDropdownOpen: boolean;
  onToggleAgentDropdown: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = (props) => {
  // ...
};
```

#### Contenu :

- Toggle sidebar button (lignes 969-981)
- Agent info (lignes 983-1010)
- Reduce button (lignes 1013-1026)

---

### 3.2. ChatMessagesArea ⭐⭐

**Fichier** : `src/components/chat/ChatMessagesArea.tsx`

**Extraction depuis** : JSX lignes 1078-1219

#### Interface :

```typescript
interface ChatMessagesAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isStreaming: boolean;
  streamingTimeline: StreamTimelineItem[];
  streamStartTime: number;
  loading: boolean;
  shouldAnimateMessages: boolean;
  messagesVisible: boolean;
  displayedSessionId: string | null;
  currentSessionId: string | null;
  selectedAgent: Agent | null;
  onEditMessage: (messageId: string, content: string, index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = (props) => {
  // ...
};
```

#### Contenu :

- Empty state (lignes 1088-1103)
- Loader infinite scroll (lignes 1105-1108)
- Messages list avec AnimatePresence (lignes 1110-1146)
- Typing indicator (lignes 1148-1161)
- Streaming timeline (lignes 1163-1216)
- messagesEndRef anchor (ligne 1218)

---

### 3.3. ChatEmptyState ⭐

**Fichier** : `src/components/chat/ChatEmptyState.tsx`

**Extraction depuis** : JSX lignes 1088-1103

#### Interface :

```typescript
interface ChatEmptyStateProps {
  agent: Agent | null;
}

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ agent }) => {
  if (!agent) return null;
  
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-agent-avatar">
        {agent.profile_picture ? (
          <img src={agent.profile_picture} alt={agent.name} />
        ) : (
          <div className="chat-empty-agent-placeholder">🤖</div>
        )}
      </div>
      <h2 className="chat-empty-agent-name">{agent.name}</h2>
      <p className="chat-empty-agent-description">
        {agent.description || 'Prêt à vous assister'}
      </p>
      {agent.model && (
        <div className="chat-empty-agent-model">{agent.model}</div>
      )}
    </div>
  );
};
```

---

### 3.4. ChatInputContainer ⭐

**Fichier** : `src/components/chat/ChatInputContainer.tsx`

**Extraction depuis** : JSX lignes 1221-1236

#### Interface :

```typescript
interface ChatInputContainerProps {
  onSend: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[]
  ) => void;
  loading: boolean;
  sessionId: string;
  currentAgentModel?: string;
  editingMessageId: string | null;
  editingContent: string;
  onCancelEdit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  renderAuthStatus: () => React.ReactNode;
}

const ChatInputContainer: React.FC<ChatInputContainerProps> = (props) => {
  return (
    <div className="chatgpt-input-container">
      {props.renderAuthStatus()}
      <ChatInput
        onSend={props.onSend}
        loading={props.loading}
        textareaRef={props.textareaRef}
        disabled={false}
        placeholder={`Discuter avec ${props.selectedAgent?.name || 'l\'agent'}`}
        sessionId={props.sessionId}
        currentAgentModel={props.currentAgentModel}
        editingMessageId={props.editingMessageId}
        editingContent={props.editingContent}
        onCancelEdit={props.onCancelEdit}
      />
    </div>
  );
};
```

---

## 📝 PHASE 4 : REFACTOR MAIN (2h)

### ChatFullscreenV2.tsx (CIBLE : 180 lignes) ⭐⭐⭐

**Structure finale** :

```typescript
'use client';
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/useChatStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLLMContext } from '@/hooks/useLLMContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useChatHandlers } from '@/hooks/useChatHandlers';
import { useInfiniteMessages } from '@/hooks/useInfiniteMessages';

// 🎯 NOUVEAUX HOOKS
import { useStreamingState } from '@/hooks/chat/useStreamingState';
import { useChatAnimations } from '@/hooks/chat/useChatAnimations';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { useSyncAgentWithSession } from '@/hooks/chat/useSyncAgentWithSession';

// 🎯 NOUVEAUX COMPOSANTS
import ChatHeader from './ChatHeader';
import ChatMessagesArea from './ChatMessagesArea';
import ChatInputContainer from './ChatInputContainer';
import SidebarUltraClean from './SidebarUltraClean';

import { simpleLogger as logger } from '@/utils/logger';
import './ToolCallMessage.css';
import '@/styles/chat-clean.css';
import '@/styles/sidebar-collapsible.css';

const ChatFullscreenV2: React.FC = () => {
  // 🎯 HOOKS EXISTANTS (groupés)
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { requireAuth, user, loading: authLoading, isAuthenticated } = useAuthGuard();
  const llmContext = useLLMContext({ includeRecent: false, includeDevice: true });
  
  const {
    sessions,
    currentSession,
    selectedAgent,
    selectedAgentId,
    editingMessage,
    setCurrentSession,
    setSelectedAgent,
    syncSessions,
    createSession,
    addMessage,
    startEditingMessage,
    cancelEditing
  } = useChatStore();
  
  // 🎯 HOOKS CUSTOM NOUVEAUX (logique extraite)
  const streamingState = useStreamingState();
  const animations = useChatAnimations({
    currentSessionId: currentSession?.id || null,
    isLoadingMessages: isLoadingMessages
  });
  
  const {
    messages: infiniteMessages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadInitialMessages,
    loadMoreMessages,
    addMessage: addInfiniteMessage,
    clearMessages: clearInfiniteMessages
  } = useInfiniteMessages({
    sessionId: currentSession?.id || null,
    initialLimit: 10,
    loadMoreLimit: 20,
    enabled: !!currentSession?.id
  });
  
  const { messagesEndRef, scrollToBottom } = useChatScroll({
    autoScroll: true,
    messages: infiniteMessages
  });
  
  const { handleComplete, handleError, handleToolResult, handleToolExecutionComplete } = useChatHandlers({
    onComplete: async (fullContent, fullReasoning, toolCalls, toolResults, streamTimeline) => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        reasoning: fullReasoning,
        tool_calls: toolCalls,
        tool_results: toolResults,
        streamTimeline,
        timestamp: new Date().toISOString(),
        sequence_number: 999998
      };
      
      streamingState.endStreaming();
      setTimeout(() => {
        addInfiniteMessage(assistantMessage);
        streamingState.reset();
      }, 200);
    }
  });
  
  const { isProcessing, sendMessage } = useChatResponse({
    useStreaming: true,
    onStreamChunk: streamingState.updateContent,
    onStreamStart: streamingState.startStreaming,
    onStreamEnd: streamingState.endStreaming,
    onToolExecution: streamingState.addToolExecution,
    onToolResult: (toolName, result, success, toolCallId) => {
      streamingState.updateToolResult(toolCallId!, result, success);
      handleToolResult(toolName, result, success, toolCallId);
    },
    onToolExecutionComplete: handleToolExecutionComplete,
    onComplete: handleComplete,
    onError: handleError
  });
  
  // 🎯 HOOK MESSAGE ACTIONS (send/edit extraits)
  const messageActions = useChatMessageActions({
    currentSession,
    selectedAgent,
    infiniteMessages,
    llmContext,
    sendMessageFn: sendMessage,
    addInfiniteMessage,
    clearInfiniteMessages,
    loadInitialMessages,
    onEditingChange: (editing: boolean) => {
      if (!editing) cancelEditing();
    }
  });
  
  // 🎯 SYNC AGENT
  useSyncAgentWithSession({
    currentSession,
    selectedAgentId,
    user,
    authLoading,
    onAgentLoaded: setSelectedAgent
  });
  
  // 🎯 UI STATE (minimal)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wideMode, setWideMode] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  
  // 🎯 REFS
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // 🎯 HANDLERS (simples, pas de logique métier)
  const handleSidebarToggle = useCallback(() => {
    if (!requireAuth()) return;
    setSidebarOpen(prev => !prev);
  }, [requireAuth]);
  
  const handleEditMessage = useCallback((messageId: string, content: string, index: number) => {
    if (!requireAuth()) return;
    startEditingMessage(messageId, content, index);
  }, [startEditingMessage, requireAuth]);
  
  // 🎯 RENDER AUTH STATUS (inchangé)
  const renderAuthStatus = () => {
    if (authLoading) return null;
    if (!user) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mx-4 mb-4">
          {/* ... message auth */}
        </div>
      );
    }
    return null;
  };
  
  // 🎯 MESSAGES AFFICHÉS (calcul optimisé, inchangé)
  const displayMessages = useMemo(() => {
    if (animations.displayedSessionId !== currentSession?.id) return [];
    if (infiniteMessages.length === 0) return [];
    
    const sorted = [...infiniteMessages].sort((a, b) => {
      const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timestampA - timestampB;
    });
    
    let filtered = sorted.filter(msg => {
      if (msg.role === 'user') return true;
      if (msg.role === 'assistant' && msg.content) return true;
      if (msg.role === 'tool') return true;
      if (isEmptyAnalysisMessage(msg)) return false;
      return true;
    });
    
    if (editingMessage) {
      const editedMsgIndex = filtered.findIndex(msg => msg.id === editingMessage.messageId);
      if (editedMsgIndex !== -1) {
        filtered = filtered.slice(0, editedMsgIndex);
      }
    }
    
    return filtered;
  }, [infiniteMessages, animations.displayedSessionId, currentSession?.id, editingMessage]);
  
  // 🎯 EFFECTS (minimalistes)
  useEffect(() => {
    if (user && !authLoading) {
      syncSessions();
    }
  }, [syncSessions, user, authLoading]);
  
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);
  
  useEffect(() => {
    if (
      animations.displayedSessionId === currentSession?.id &&
      !isLoadingMessages &&
      !animations.messagesVisible
    ) {
      animations.triggerFadeIn(
        currentSession.id,
        infiniteMessages,
        messagesContainerRef
      );
    }
  }, [
    animations.displayedSessionId,
    currentSession?.id,
    infiniteMessages.length,
    animations.messagesVisible,
    isLoadingMessages
  ]);
  
  // 🎯 RENDU (100% déclaratif, composants extraits)
  return (
    <div className={`chatgpt-container ${wideMode ? 'wide-mode' : ''}`}>
      <ChatHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleSidebarToggle}
        selectedAgent={selectedAgent}
        agentDropdownOpen={agentDropdownOpen}
        onToggleAgentDropdown={() => setAgentDropdownOpen(!agentDropdownOpen)}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
      />
      
      {isDesktop && (
        <div 
          className="sidebar-hover-zone"
          onMouseEnter={() => /* ... */}
        />
      )}
      
      <div className={`chatgpt-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <SidebarUltraClean
          isOpen={sidebarOpen}
          isDesktop={isDesktop}
          onClose={() => setSidebarOpen(false)}
        />
        
        {!isDesktop && sidebarOpen && (
          <div 
            className="chatgpt-sidebar-overlay visible"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <div className="chatgpt-main">
          <ChatMessagesArea
            messages={displayMessages}
            isLoading={isLoadingMessages}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            isStreaming={streamingState.isStreaming}
            streamingTimeline={streamingState.streamingTimeline}
            streamStartTime={streamingState.streamStartTime}
            loading={messageActions.isLoading}
            shouldAnimateMessages={animations.shouldAnimateMessages}
            messagesVisible={animations.messagesVisible}
            displayedSessionId={animations.displayedSessionId}
            currentSessionId={currentSession?.id || null}
            selectedAgent={selectedAgent}
            onEditMessage={handleEditMessage}
            containerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />
          
          <ChatInputContainer
            onSend={messageActions.sendMessage}
            loading={messageActions.isLoading}
            sessionId={currentSession?.id || 'temp'}
            currentAgentModel={selectedAgent?.model}
            editingMessageId={editingMessage?.messageId || null}
            editingContent={editingMessage?.originalContent || ''}
            onCancelEdit={cancelEditing}
            textareaRef={textareaRef}
            renderAuthStatus={renderAuthStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatFullscreenV2;
```

**Lignes estimées** : ~180 lignes ✅

---

## 📝 PHASE 5 : TESTS & VALIDATION (3-4h)

### 5.1. Tests Unitaires

**Services** :
```bash
npm test src/services/chat/ChatMessageSendingService.test.ts
npm test src/services/chat/ChatMessageEditService.test.ts
npm test src/services/chat/ChatContextBuilder.test.ts
```

**Hooks** :
```bash
npm test src/hooks/chat/useStreamingState.test.ts
npm test src/hooks/chat/useChatMessageActions.test.ts
npm test src/hooks/chat/useSyncAgentWithSession.test.ts
```

**Composants** :
```bash
npm test src/components/chat/ChatHeader.test.tsx
npm test src/components/chat/ChatEmptyState.test.tsx
```

---

### 5.2. Tests E2E

**Flow complet** :
```typescript
describe('ChatFullscreenV2 E2E', () => {
  it('should send message and receive response', async () => {
    // Simuler envoi message
    // Attendre réponse
    // Vérifier affichage
  });
  
  it('should handle tool calls correctly', async () => {
    // Envoyer message nécessitant tools
    // Attendre execution tools
    // Vérifier timeline
    // Vérifier réponse finale
  });
  
  it('should edit message and regenerate', async () => {
    // Éditer message
    // Vérifier delete cascade
    // Vérifier régénération
  });
});
```

---

### 5.3. Validation Manuelle

**Checklist** :

- [ ] Nouveau message → réponse simple
- [ ] Nouveau message → tool calls → réponse finale
- [ ] Edit message → régénération
- [ ] Session change → messages chargés
- [ ] Streaming → Timeline affichée
- [ ] Infinite scroll → anciens messages
- [ ] Sidebar → toggle desktop/mobile
- [ ] Agent dropdown → affichage info
- [ ] Auth required → warning affiché

---

### 5.4. Performance Check

```bash
# React DevTools Profiler
# Vérifier re-renders
# Vérifier memoization

# Network
# Pas de requêtes dupliquées
# Gzip enabled

# Memory
# Stable après 50 messages
# Pas de memory leaks
```

---

### 5.5. Linter & TypeScript

```bash
npm run typecheck  # 0 erreur ✅
npm run lint       # 0 warning ✅
npm run build      # OK ✅
```

---

## 📋 CHECKLIST FINALE

### Avant de commencer :

- [ ] Lire GUIDE-EXCELLENCE-CODE.md
- [ ] Lire AUDIT-CHATFULLSCREENV2-COMPLET.md
- [ ] Créer branche `refactor/chat-fullscreen-v2`
- [ ] Sauvegarder backup `ChatFullscreenV2.tsx.backup`

### Pendant le refactoring :

- [ ] Commit après chaque phase terminée
- [ ] Tests unitaires écrits en parallèle
- [ ] Pas de feature ajoutée (pure refactor)
- [ ] Documentation inline pour logique complexe

### Après le refactoring :

- [ ] ✅ Tous les tests passent (unitaires + E2E)
- [ ] ✅ TypeScript 0 erreur
- [ ] ✅ Linter 0 warning
- [ ] ✅ Build OK
- [ ] ✅ Validation manuelle complète
- [ ] ✅ Performance check OK
- [ ] ✅ Code review avec un peer
- [ ] ✅ Merge vers main

---

## 🎯 ESTIMATION FINALE

| Phase | Durée | Risque | Bloquant |
|-------|-------|--------|----------|
| **Phase 1** : Services | 2-3h | 🟢 Faible | Non |
| **Phase 2** : Hooks | 3-4h | 🟡 Moyen | Oui (Phase 1) |
| **Phase 3** : UI | 2-3h | 🟢 Faible | Non |
| **Phase 4** : Main | 2h | 🟢 Faible | Oui (Phase 1-3) |
| **Phase 5** : Tests | 3-4h | 🟢 Faible | Oui (toutes) |
| **TOTAL** | **12-16h** | - | - |

**Répartition** : 2-4 jours selon disponibilité

---

## ✅ SUCCÈS SI...

1. ✅ ChatFullscreenV2.tsx ≤ 200 lignes
2. ✅ Tous fichiers ≤ 300 lignes
3. ✅ Couverture tests > 80% services
4. ✅ 0 erreur TypeScript
5. ✅ Validation manuelle complète OK
6. ✅ Performance stable

---

**Prêt à démarrer ?** 🚀

**Version** : 1.0  
**Auteur** : Jean-Claude (Senior Dev)  
**Standard** : GUIDE-EXCELLENCE-CODE.md v2.0

