"use client";

import { useState } from 'react';
import { 
  WhatsappShareButton, 
  TwitterShareButton, 
  LinkedinShareButton,
  WhatsappIcon,
  TwitterIcon,
  LinkedinIcon
} from 'react-share';
import { FiLink, FiCheck } from 'react-icons/fi';

interface ShareMenuProps {
  url: string;
  title?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareMenu({ url, title = "Note Scrivia", description = "Découvrez cette note créée avec Scrivia", isOpen, onClose }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Erreur lors de la copie:', err);
      }
    }
  };

  if (!isOpen) return null;

  const shareOptions = [
    {
      id: 'copy',
      label: 'Copier le lien',
      icon: copied ? <FiCheck size={18} /> : <FiLink size={18} />,
      onClick: copyToClipboard,
      color: copied ? '#10b981' : '#D4D4D4',
      type: 'copy' as const
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsappIcon size={18} round />,
      component: WhatsappShareButton,
      color: '#25D366',
      type: 'share' as const
    },
    {
      id: 'twitter',
      label: 'X (Twitter)',
      icon: <TwitterIcon size={18} round />,
      component: TwitterShareButton,
      color: '#1DA1F2',
      textColor: '#fff',
      type: 'share' as const
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: <LinkedinIcon size={18} round />,
      component: LinkedinShareButton,
      color: '#1DA1F2',
      type: 'share' as const
    }
  ];

  return (
    <>
      {/* Overlay pour fermer le menu */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
        onClick={onClose}
      />
      
      {/* Menu de partage */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          background: '#1a1a1c',
          border: '1px solid #2a2a2c',
          borderRadius: 12,
          padding: '6px 0',
          minWidth: 180,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          transform: 'translateX(0)'
        }}
      >
        {shareOptions.map((option, index) => (
          <div key={option.id}>
            {option.type === 'copy' ? (
              <button
                onClick={option.onClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: option.color,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                  borderRadius: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option.icon}
                {option.label}
              </button>
            ) : (
              (() => {
                const ShareButton = option.component;
                return (
                  <ShareButton
                    url={url}
                    title={title}
                    summary={description}
                    hashtags={['scrivia', 'notes']}
                    beforeOnClick={onClose}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: option.color,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                      borderRadius: 0,
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {option.icon}
                    <span style={{ color: option.id === 'twitter' ? option.textColor : undefined }}>{option.label}</span>
                  </ShareButton>
                );
              })()
            )}
            
            {/* Séparateur élégant entre les options (sauf pour la dernière) */}
            {index < shareOptions.length - 1 && (
              <div
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, #2a2a2c 20%, #2a2a2c 80%, transparent 100%)',
                  margin: '0 16px',
                  opacity: 0.6
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
} 