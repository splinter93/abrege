"use client";

import React, { Suspense } from 'react';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

// ✅ OPTIMISATION : Lazy load composant lourd (conforme GUIDE-EXCELLENCE-CODE.md)
const ChatFullscreenV2 = React.lazy(() => import('@/components/chat/ChatFullscreenV2'));

export default function PrivateChatPage() {
  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <Suspense fallback={<SimpleLoadingState message="Chargement du chat..." />}>
        <ChatFullscreenV2 />
      </Suspense>
    </div>
  );
} 