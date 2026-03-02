"use client";

import dynamic from 'next/dynamic';

const ChatFullscreenV2 = dynamic(
  () => import('@/components/chat/ChatFullscreenV2'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          minHeight: '100vh',
          background: 'var(--color-bg-primary, #0e1012)',
          color: 'var(--color-text-primary, #b5bcc4)',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: '3px solid rgba(255, 255, 255, 0.12)',
            borderTopColor: 'var(--color-text-primary, #b5bcc4)',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
          }}
          aria-hidden
        />
        <span>Chargement du chat…</span>
      </div>
    ),
  }
);

export default function ChatPage() {
  return <ChatFullscreenV2 />;
} 