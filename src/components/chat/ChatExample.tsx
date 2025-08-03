import React, { useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useSessionSync } from '@/hooks/useSessionSync';

/**
 * 🎯 Exemple d'utilisation de la nouvelle architecture
 * DB = source de vérité, Zustand = cache léger
 */
export const ChatExample: React.FC = () => {
  const { 
    sessions, 
    currentSession, 
    loading, 
    error,
    syncSessions,
    createSession,
    addMessage,
    deleteSession 
  } = useChatStore();

  const { 
    syncSessions: syncFromHook,
    createSession: createFromHook,
    addMessage: addFromHook 
  } = useSessionSync();

  // 🔄 Charger les sessions au montage
  useEffect(() => {
    syncSessions();
  }, [syncSessions]);

  // 💬 Exemple d'ajout de message
  const handleAddMessage = async () => {
    if (!currentSession) return;

    const message = {
      role: 'user' as const,
      content: 'Salut ! Comment ça va ?',
      timestamp: new Date().toISOString()
    };

    await addMessage(message);
  };

  // ➕ Exemple de création de session
  const handleCreateSession = async () => {
    await createSession('Nouvelle conversation test');
  };

  // 🗑️ Exemple de suppression de session
  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
  };

  return (
    <div className="chat-example">
      <h2>🎯 Architecture DB-First</h2>
      
      {/* 📊 État */}
      <div className="state-info">
        <h3>📊 État actuel</h3>
        <p>Loading: {loading ? '🔄' : '✅'}</p>
        <p>Error: {error || 'Aucune erreur'}</p>
        <p>Sessions: {sessions.length}</p>
        <p>Session courante: {currentSession?.name || 'Aucune'}</p>
      </div>

      {/* 🎮 Actions */}
      <div className="actions">
        <h3>🎮 Actions</h3>
        
        <button onClick={syncSessions} disabled={loading}>
          🔄 Synchroniser depuis DB
        </button>
        
        <button onClick={handleCreateSession} disabled={loading}>
          ➕ Créer session
        </button>
        
        <button onClick={handleAddMessage} disabled={!currentSession || loading}>
          💬 Ajouter message
        </button>
      </div>

      {/* 📋 Liste des sessions */}
      <div className="sessions-list">
        <h3>📋 Sessions (triées par updated_at)</h3>
        {sessions.map(session => (
          <div key={session.id} className="session-item">
            <span className="session-name">{session.name}</span>
            <span className="session-date">
              {new Date(session.updated_at).toLocaleDateString()}
            </span>
            <span className="session-messages">
              {session.thread.length} messages
            </span>
            <button 
              onClick={() => handleDeleteSession(session.id)}
              disabled={loading}
              className="delete-btn"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* 💬 Messages de la session courante */}
      {currentSession && (
        <div className="current-session">
          <h3>💬 Session courante: {currentSession.name}</h3>
          <div className="messages">
            {currentSession.thread.map(message => (
              <div key={message.id} className={`message ${message.role}`}>
                <span className="role">{message.role}:</span>
                <span className="content">{message.content}</span>
                <span className="timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .chat-example {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .state-info, .actions, .sessions-list, .current-session {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        
        .actions button {
          margin-right: 10px;
          margin-bottom: 10px;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #007bff;
          color: white;
          cursor: pointer;
        }
        
        .actions button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .session-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
        }
        
        .message {
          padding: 8px;
          margin: 4px 0;
          border-radius: 4px;
        }
        
        .message.user {
          background: #e3f2fd;
        }
        
        .message.assistant {
          background: #f3e5f5;
        }
        
        .message.system {
          background: #fff3e0;
        }
        
        .role {
          font-weight: bold;
          margin-right: 8px;
        }
        
        .timestamp {
          font-size: 0.8em;
          color: #666;
          margin-left: 8px;
        }
      `}</style>
    </div>
  );
}; 