'use client';

import React, { useState } from 'react';
import { useChatStore, type ChatSession } from '../../store/useChatStore';
import { chatPollingService } from '@/services/chatPollingService';
import RenameInput from '../RenameInput';
import './ChatSidebar.css';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  
  const {
    sessions,
    currentSession,
    setCurrentSession,
    createSession,
    deleteSession,
    closeWidget
  } = useChatStore();

  // Debug: afficher le nombre de sessions
  console.log('[ChatSidebar] 📊 Sessions dans le store:', sessions.length);
  console.log('[ChatSidebar] 📋 Sessions:', sessions);

  const handleSessionClick = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const handleNewChat = async () => {
    // Créer une session temporaire immédiatement
    const tempSession: ChatSession = {
      id: `temp-${Date.now()}`,
      name: 'Nouvelle conversation',
      thread: [],
      history_limit: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Ajouter immédiatement dans l'UI
    const { setSessions, setCurrentSession } = useChatStore.getState();
    const currentSessions = useChatStore.getState().sessions;
    const updatedSessions = [tempSession, ...currentSessions];
    setSessions(updatedSessions);
    setCurrentSession(tempSession);
    console.log('[ChatSidebar] ✅ Nouvelle session ajoutée immédiatement');
    
    // Créer la session en DB et attendre
    console.log('[ChatSidebar] ⏳ Création session en DB...');
    await createSession();
    console.log('[ChatSidebar] ✅ Session créée en DB');
  };

  const handleStartRename = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (!newName.trim()) return;
    
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
      
      const response = await fetch(`/api/v1/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du renommage');
      }
      
      console.log('[ChatSidebar] ✅ Session renommée en DB');
      
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
          <div className="chat-sidebar-title">
            <span>Conversations</span>
          </div>
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

        {/* Bouton nouvelle conversation */}
        <div className="chat-sidebar-new">
          <button
            onClick={handleNewChat}
            className="chat-sidebar-new-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Nouvelle conversation
          </button>
        </div>

        {/* Liste des conversations */}
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
                        onSubmit={(newName) => handleRenameSession(session.id, newName)}
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

        {/* Footer de la sidebar */}
        <div className="chat-sidebar-footer">
          <button
            onClick={closeWidget}
            className="chat-sidebar-widget-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Ouvrir le widget
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar; 