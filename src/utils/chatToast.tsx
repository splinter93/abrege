/**
 * Helper pour toasts améliorés dans le chat
 * Messages contextuels avec actions suggérées et design moderne
 */

import React from 'react';
import toast, { type ToastOptions } from 'react-hot-toast';

/**
 * Options pour toasts de chat
 */
interface ChatToastOptions extends ToastOptions {
  action?: {
    label: string;
    onClick: () => void;
  };
  suggestion?: string;
}

/**
 * Toast d'erreur amélioré avec contexte et suggestion
 */
export function chatError(message: string, options?: ChatToastOptions) {
  return toast.error(
    (t) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '300px', maxWidth: '400px' }}>
      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--error, #ef4444)' }}>
        {message}
      </div>
      {options?.suggestion && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary, #9ca3af)', lineHeight: '1.5' }}>
          💡 {options.suggestion}
        </div>
      )}
      {options?.action && (
        <button
          onClick={() => {
            options.action!.onClick();
            toast.dismiss(t.id);
          }}
          style={{
            marginTop: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--error, #ef4444)',
            background: 'transparent',
            border: '1px solid var(--error, #ef4444)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            alignSelf: 'flex-start'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--error, #ef4444)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--error, #ef4444)';
          }}
        >
          {options.action.label}
        </button>
      )}
    </div>
    ),
    {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      style: {
        background: 'var(--surface-elevated, #1f2937)',
        color: 'var(--text-primary, #f3f4f6)',
        border: '1px solid var(--border-subtle, #374151)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        maxWidth: '420px'
      },
      iconTheme: {
        primary: 'var(--error, #ef4444)',
        secondary: 'var(--surface-elevated, #1f2937)'
      },
      ...options
    }
  );
}

/**
 * Toast de succès amélioré
 */
export function chatSuccess(message: string, options?: ChatToastOptions) {
  return toast.success(
    (t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '280px' }}>
        <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary, #f3f4f6)' }}>
          {message}
        </div>
        {options?.suggestion && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #9ca3af)', marginTop: '4px' }}>
            {options.suggestion}
          </div>
        )}
      </div>
    ),
    {
      duration: options?.duration || 3000,
      position: options?.position || 'top-right',
      style: {
        background: 'var(--surface-elevated, #1f2937)',
        color: 'var(--text-primary, #f3f4f6)',
        border: '1px solid var(--border-subtle, #374151)',
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        maxWidth: '400px'
      },
      iconTheme: {
        primary: 'var(--success, #10b981)',
        secondary: 'var(--surface-elevated, #1f2937)'
      },
      ...options
    }
  );
}

/**
 * Toast d'info amélioré
 */
export function chatInfo(message: string, options?: ChatToastOptions) {
  return toast(
    (t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '280px' }}>
        <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary, #f3f4f6)' }}>
          {message}
        </div>
        {options?.suggestion && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #9ca3af)', marginTop: '4px' }}>
            {options.suggestion}
          </div>
        )}
      </div>
    ),
    {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: 'ℹ️',
      style: {
        background: 'var(--surface-elevated, #1f2937)',
        color: 'var(--text-primary, #f3f4f6)',
        border: '1px solid var(--border-subtle, #374151)',
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        maxWidth: '400px'
      },
      ...options
    }
  );
}

