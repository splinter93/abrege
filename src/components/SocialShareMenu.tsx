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

interface SocialShareMenuProps {
  url: string;
  title?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialShareMenu({ 
  url, 
  title = "Note Scrivia", 
  description = "Découvrez cette note créée avec Scrivia", 
  isOpen, 
  onClose 
}: SocialShareMenuProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
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
      type: 'share' as const
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: <LinkedinIcon size={18} round />,
      component: LinkedinShareButton,
      color: '#0077B5',
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
      
      {/* Menu de partage social */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          background: '#232325',
          border: '1px solid #333',
          borderRadius: 12,
          padding: '8px 0',
          minWidth: 200,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}
      >
        {shareOptions.map((option) => {
          if (option.type === 'copy') {
            return (
              <button
                key={option.id}
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
                  fontFamily: 'Figtree, Geist, -apple-system, sans-serif'
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
            );
          }

          const ShareButton = option.component;
          return (
            <ShareButton
              key={option.id}
              url={url}
              title={title}
              summary={description}
              hashtags={['scrivia', 'notes']}
              beforeOnClick={onClose}
            >
              <div
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
                  fontFamily: 'Figtree, Geist, -apple-system, sans-serif'
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
              </div>
            </ShareButton>
          );
        })}
      </div>
    </>
  );
} 