import React from 'react';

export default function TestChatPage() {
  return (
    <div className="chat-fullscreen-container">
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-logo">
            <a href="/" className="chat-logo-link" aria-label="Aller à l'accueil">
              <img src="/logo-scrivia-white.png" alt="Scrivia" className="chat-logo-img" />
            </a>
          </div>
          <button className="chat-sidebar-toggle">
            <span>☰</span>
          </button>
          <h1 className="chat-title">Test Chat</h1>
        </div>
        <div className="chat-header-center">
          <span className="chat-subtitle">Test du nouveau design</span>
        </div>
        <div className="chat-header-right">
          <button className="chat-header-btn">⚙️</button>
        </div>
      </div>
      
      <div className="chat-content">
        <div className="chat-main">
          <div className="chat-messages-container">
            <div className="chat-messages">
              <div className="chat-message chat-message-user">
                <div className="chat-message-bubble chat-message-bubble-user">
                  Salut ! Comment ça va ?
                </div>
              </div>
              
              <div className="chat-message chat-message-assistant">
                <div className="chat-message-bubble chat-message-bubble-assistant">
                  Salut ! Ça va très bien, merci ! Comment puis-je t'aider aujourd'hui ?
                </div>
              </div>
            </div>
          </div>
          
          <div className="chat-input-container">
            <div className="chat-input-area">
              <textarea 
                className="chat-input-textarea"
                placeholder="Tapez votre message..."
                rows={1}
              />
              <div className="chat-input-actions">
                <button className="chat-input-speaker">🎤</button>
                <button className="chat-input-mic">🎵</button>
                <button className="chat-input-send">Envoyer</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Conversations</h2>
            <div className="sidebar-actions">
              <button className="sidebar-icon-btn">+</button>
            </div>
          </div>
          
          <div className="sidebar-content">
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Agents</h3>
              <div className="agent-option active">
                <div className="agent-icon">🤖</div>
                <span className="agent-name">Assistant IA</span>
              </div>
              <div className="agent-option">
                <div className="agent-icon">📝</div>
                <span className="agent-name">Rédacteur</span>
              </div>
            </div>
            
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Conversations</h3>
              <div className="conversation-item active">
                <div className="conversation-content">
                  <h4 className="conversation-title">Test Chat</h4>
                  <p className="conversation-preview">Dernier message...</p>
                  <div className="conversation-meta">
                    <span className="conversation-time">Il y a 2 min</span>
                    <div className="conversation-status"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
