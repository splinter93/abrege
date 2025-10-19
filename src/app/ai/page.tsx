/**
 * Page de routage AI - Hub central pour toutes les fonctionnalités IA
 * Page standalone sans sidebar
 */

'use client';

import { useRouter } from 'next/navigation';
import { Bot, Sparkles, ArrowLeft } from 'lucide-react';
import '@/styles/main.css';

export default function AIPage() {
  const router = useRouter();

  const cards = [
    {
      title: 'AI Agents',
      description: 'Gérez et configurez vos agents IA spécialisés',
      icon: Bot,
      path: '/ai/agents',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
      iconColor: '#3b82f6'
    },
    {
      title: 'Editor Prompts',
      description: 'Prompts intelligents pour améliorer votre écriture',
      icon: Sparkles,
      path: '/ai/prompts',
      gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(251, 146, 60, 0.15))',
      iconColor: '#ec4899'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative'
    }}>
      {/* Bouton retour */}
      <button
        onClick={() => router.push('/private/chat')}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          fontFamily: 'var(--font-secondary)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card-bg)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
      >
        <ArrowLeft size={18} />
        <span>Retour</span>
      </button>

      {/* Titre principal */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        maxWidth: '600px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <Sparkles size={40} style={{ color: 'white' }} />
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.75rem',
          fontFamily: 'var(--font-primary)'
        }}>
          Intelligence Artificielle
        </h1>
        
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          fontFamily: 'var(--font-secondary)'
        }}>
          Explorez et configurez vos outils IA pour booster votre productivité
        </p>
      </div>

      {/* Cartes de routage */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 400px))',
        gap: '2rem',
        maxWidth: '900px',
        width: '100%'
      }}>
        {cards.map((card) => {
          const IconComponent = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => router.push(card.path)}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '2.5rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = card.iconColor;
                e.currentTarget.style.boxShadow = `0 20px 40px rgba(0, 0, 0, 0.15)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Gradient Background */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: card.gradient,
                opacity: 1,
                pointerEvents: 'none'
              }} />

              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Icon */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `${card.iconColor}15`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                  border: `2px solid ${card.iconColor}40`
                }}>
                  <IconComponent 
                    size={32} 
                    style={{ color: card.iconColor }} 
                  />
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-primary)'
                }}>
                  {card.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '1rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  marginBottom: '1.5rem',
                  fontFamily: 'var(--font-secondary)'
                }}>
                  {card.description}
                </p>

                {/* Arrow */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: card.iconColor,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  fontFamily: 'var(--font-secondary)'
                }}>
                  <span>Explorer</span>
                  <span style={{ 
                    fontSize: '1.2rem',
                    transition: 'transform 0.2s ease',
                    display: 'inline-block'
                  }}>→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer info */}
      <div style={{
        marginTop: '4rem',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.85rem',
        fontFamily: 'var(--font-secondary)'
      }}>
        <p>Propulsé par les derniers modèles LLM</p>
      </div>
    </div>
  );
}
