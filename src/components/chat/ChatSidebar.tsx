'use client';

import React, { useState } from 'react';
import { useChatStore, type ChatSession } from '../../store/useChatStore';
import { useSessionSync } from '../../hooks/useSessionSync';
import { chatPollingService } from '../../services/chatPollingService';
import RenameInput from '../RenameInput';
import './chat.css';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [agentsExpanded, setAgentsExpanded] = useState(false);
  
  const {
    sessions,
    currentSession,
    setCurrentSession,
    deleteSession,
    closeWidget,
    syncSessions
  } = useChatStore();

  const { createSession } = useSessionSync();

  // Debug: afficher le nombre de sessions
  console.log('[ChatSidebar] 📊 Sessions dans le store:', sessions.length);
  console.log('[ChatSidebar] 📋 Sessions:', sessions);

  const handleSessionClick = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const handleNewChat = async () => {
    console.log('[ChatSidebar] ➕ Création nouvelle session...');
    
    try {
      // Créer directement une vraie session en DB
      const result = await createSession('Nouvelle conversation') as any;
      console.log('[ChatSidebar] 📋 Résultat createSession:', result);
      
      if (!result) {
        console.error('[ChatSidebar] ❌ createSession a retourné undefined');
        return;
      }
      
      if (!result?.success) {
        console.error('[ChatSidebar] ❌ Erreur création session:', result?.error);
        return;
      }
      
      console.log('[ChatSidebar] ✅ Session créée en DB:', result.session);
      
      // Forcer la synchronisation pour rafraîchir la sidebar
      console.log('[ChatSidebar] 🔄 Synchronisation des sessions...');
      await syncSessions();
      console.log('[ChatSidebar] ✅ Sessions synchronisées');
    } catch (error) {
      console.error('[ChatSidebar] ❌ Erreur dans handleNewChat:', error);
    }
  };

  const handleStartRename = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (!newName.trim()) return;
    
    // Vérifier si c'est une session temporaire
    const isTempSession = sessionId.startsWith('temp-');
    
    if (isTempSession) {
      console.log('[ChatSidebar] ⚠️ Session temporaire, renommage local uniquement');
      // Mise à jour optimiste immédiate pour les sessions temporaires
      const { setSessions } = useChatStore.getState();
      const currentSessions = useChatStore.getState().sessions;
      const updatedSessions = currentSessions.map(s => 
        s.id === sessionId ? { ...s, name: newName.trim() } : s
      );
      setSessions(updatedSessions);
      console.log('[ChatSidebar] ✅ Nom de session temporaire mis à jour localement');
      setRenamingSessionId(null);
      return;
    }
    
    // Mise à jour optimiste immédiate
    const { setSessions } = useChatStore.getState();
    const currentSessions = useChatStore.getState().sessions;
    const updatedSessions = currentSessions.map(s => 
      s.id === sessionId ? { ...s, name: newName.trim() } : s
    );
    setSessions(updatedSessions);
    console.log('[ChatSidebar] ✅ Nom de session mis à jour immédiatement');
    
    // Mise à jour en DB (en arrière-plan)
    try {
      // Récupérer le token d'authentification
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Token d\'authentification manquant');
      }
      
      console.log('[ChatSidebar] 🔐 Token trouvé, appel API...');
      console.log('[ChatSidebar] 📤 Données envoyées:', { sessionId, newName: newName.trim() });
      
      const response = await fetch(`/api/v1/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      
      console.log('[ChatSidebar] 📥 Réponse reçue:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('[ChatSidebar] ❌ Erreur API:', errorData);
        throw new Error(`Erreur lors du renommage: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
      }
      
      const responseData = await response.json();
      console.log('[ChatSidebar] ✅ Session renommée en DB:', responseData);
      
      // Déclencher un polling après renommage
      await chatPollingService.triggerPolling('renommage session');
    } catch (error) {
      console.error('[ChatSidebar] ❌ Erreur renommage:', error);
      // Revenir à l'ancien nom en cas d'erreur
      const { setSessions } = useChatStore.getState();
      const currentSessions = useChatStore.getState().sessions;
      const session = currentSessions.find(s => s.id === sessionId);
      if (session) {
        const updatedSessions = currentSessions.map(s => 
          s.id === sessionId ? { ...s, name: session.name } : s
        );
        setSessions(updatedSessions);
        console.log('[ChatSidebar] 🔄 Nom restauré après erreur');
      }
    } finally {
      setRenamingSessionId(null);
    }
  };

  const handleCancelRename = () => {
    setRenamingSessionId(null);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      // Vérifier si c'est une session temporaire
      const isTempSession = sessionId.startsWith('temp-');
      
      if (isTempSession) {
        console.log('[ChatSidebar] ⚠️ Suppression session temporaire, pas de DB');
        // Supprimer immédiatement de l'UI
        const { setSessions, setCurrentSession } = useChatStore.getState();
        const currentSessions = useChatStore.getState().sessions;
        const updatedSessions = currentSessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);
        
        // Si la session supprimée était la session courante, sélectionner la première
        if (useChatStore.getState().currentSession?.id === sessionId) {
          setCurrentSession(updatedSessions[0] || null);
        }
        
        console.log('[ChatSidebar] ✅ Session temporaire supprimée');
        return;
      }
      
      // Supprimer immédiatement de l'UI
      const { setSessions, setCurrentSession } = useChatStore.getState();
      const currentSessions = useChatStore.getState().sessions;
      const updatedSessions = currentSessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      
      // Si la session supprimée était la session courante, sélectionner la première
      if (useChatStore.getState().currentSession?.id === sessionId) {
        setCurrentSession(updatedSessions[0] || null);
      }
      
      console.log('[ChatSidebar] ✅ Session supprimée immédiatement');
      
      // Supprimer en DB (en arrière-plan)
      await deleteSession(sessionId);
      
      // Déclencher un polling après suppression de session
      await chatPollingService.triggerPolling('suppression session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getLastMessage = (session: ChatSession) => {
    if (!session.thread || session.thread.length === 0) {
      return 'Nouvelle conversation';
    }
    const lastMessage = session.thread[session.thread.length - 1];
    return lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  return (
    <>
      {/* Overlay pour fermer la sidebar */}
      {isOpen && (
        <div className="chat-sidebar-overlay" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <div className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header de la sidebar */}
        <div className="chat-sidebar-header">
          <button
            onClick={handleNewChat}
            className="chat-sidebar-new-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            New Chat
          </button>
          <button
            onClick={onClose}
            className="chat-sidebar-close"
            aria-label="Fermer la sidebar"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Menu déroulant Mes Agents */}
        <div className="chat-sidebar-agents">
          <div 
            className="chat-sidebar-agents-header"
            onClick={() => setAgentsExpanded(!agentsExpanded)}
          >
            <span>Mes Agents</span>
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              viewBox="0 0 24 24"
              style={{ 
                transform: agentsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </div>
          {agentsExpanded && (
            <div className="chat-sidebar-agents-content">
              <div className="chat-sidebar-agent-item">
                <span>Assistant Général</span>
              </div>
              <div className="chat-sidebar-agent-item">
                <span>Expert Technique</span>
              </div>
              <div className="chat-sidebar-agent-item">
                <span>Rédacteur</span>
              </div>
            </div>
          )}
        </div>

        {/* Section Conversations */}
        <div className="chat-sidebar-conversations-section">
          <div className="chat-sidebar-section-title">Conversations</div>
          <div className="chat-sidebar-conversations">
            {sessions.length === 0 ? (
              <div className="chat-sidebar-empty">
                <p>Aucune conversation</p>
                <p>Commencez une nouvelle conversation</p>
              </div>
            ) : (
              // Trier les sessions par updated_at (plus récent en premier)
              sessions
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .map((session) => (
                <div
                  key={session.id}
                  className={`chat-sidebar-item ${currentSession?.id === session.id ? 'active' : ''} ${sessions.indexOf(session) === 0 ? 'most-recent' : ''}`}
                  onClick={() => handleSessionClick(session)}
                  title={`${session.name} - ${formatDate(session.updated_at)}`}
                >
                  <div className="chat-sidebar-item-content">
                    <div className="chat-sidebar-item-title">
                      {renamingSessionId === session.id ? (
                        <RenameInput
                          initialValue={session.name}
                          onSubmit={(newName: string) => handleRenameSession(session.id, newName)}
                          onCancel={handleCancelRename}
                          autoFocus={true}
                        />
                      ) : (
                        <span 
                          onDoubleClick={(e) => handleStartRename(session.id, e)}
                          style={{ cursor: 'pointer' }}
                        >
                          {session.name}
                        </span>
                      )}
                    </div>
                    <div className="chat-sidebar-item-preview">
                      {getLastMessage(session)}
                    </div>
                    <div className="chat-sidebar-item-date">
                      {formatDate(session.updated_at)}
                    </div>
                  </div>
                  <div className="chat-sidebar-item-actions">
                    <button
                      className="chat-sidebar-item-delete"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      aria-label="Supprimer la conversation"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer de la sidebar */}
        <div className="chat-sidebar-footer">
          <button
            onClick={() => console.log('Settings clicked')}
            className="chat-sidebar-settings-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Settings
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar; 