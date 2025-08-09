import React from 'react';
import ChatFullscreenV2 from '@/components/chat/ChatFullscreenV2';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <ChatFullscreenV2 />
    </div>
  );
} 