'use client';

import ChatFullscreen from '../../../components/chat/ChatFullscreen';

export default function ChatPage() {
  return (
    <div className="chat-page-root">
      <ChatFullscreen />
      
      <style jsx>{`
        .chat-page-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        .chat-page-root::before {
          content: '';
          position: fixed;
          z-index: 0;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          background:
            linear-gradient(135deg, 
              hsl(220, 8%, 2%) 0%, 
              hsl(220, 12%, 4%) 20%, 
              hsl(220, 15%, 6%) 40%, 
              hsl(220, 18%, 8%) 60%, 
              hsl(220, 20%, 10%) 80%, 
              hsl(220, 25%, 12%) 100%
            );
          backdrop-filter: blur(20px) saturate(120%) brightness(0.85);
          -webkit-backdrop-filter: blur(20px) saturate(120%) brightness(0.85);
        }
      `}</style>
    </div>
  );
} 