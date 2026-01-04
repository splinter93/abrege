/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Couleurs du chat existantes + Landing page
      colors: {
        // Landing page colors
        background: '#030303',
        surface: '#0A0A0A',
        surfaceHighlight: '#121212',
        border: '#1F1F1F',
        primary: '#FF5722',
        primaryHover: '#FF7043',
        textMain: '#F2F2F2',
        textMuted: '#888888',
        
        // Backgrounds - Équilibrés pour cohérence avec --color-bg-primary
        'chat-bg-primary': '#121212',
        'chat-bg-secondary': '#171717',
        'chat-bg-tertiary': '#1c1c1c',
        'chat-bg-elevated': '#171717',
        
        // Textes
        'chat-text-primary': '#f8f9fa',
        'chat-text-secondary': '#a1a5b7',
        'chat-text-muted': '#6c757d',
        
        // Accents
        'chat-accent': '#e3e6ea',
        'chat-accent-hover': '#cbd3d9',
        'chat-accent-primary': '#3b82f6',
        
        // États
        'chat-success': '#10b981',
        'chat-warning': '#f59e0b',
        'chat-error': '#ef4444',
        'chat-info': '#3b82f6',
        
        // Bordures
        'chat-border-primary': '#1f1f25',
        'chat-border-secondary': '#2a2a32',
        'chat-border-focus': '#8e8ea0',
        
        // Glassmorphism
        'glass-bg-base': 'rgba(255, 255, 255, 0.03)',
        'glass-bg-subtle': 'rgba(255, 255, 255, 0.05)',
        'glass-bg-soft': 'rgba(255, 255, 255, 0.08)',
        'glass-bg-medium': 'rgba(255, 255, 255, 0.12)',
        'glass-bg-strong': 'rgba(255, 255, 255, 0.15)',
        
        'glass-border-subtle': 'rgba(255, 255, 255, 0.06)',
        'glass-border-soft': 'rgba(255, 255, 255, 0.08)',
        'glass-border-medium': 'rgba(255, 255, 255, 0.12)',
        'glass-border-strong': 'rgba(255, 255, 255, 0.20)',
        'glass-border-focus': 'rgba(255, 255, 255, 0.25)',
      },
      
      // Polices - Hiérarchisées
      fontFamily: {
        'base': ['Noto Sans', 'sans-serif'],
        'chat-text': ['Inter', 'sans-serif'],
        'chat-headings': ['Noto Sans', 'sans-serif'],
        'chat-mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
        'editor-text': ['Inter', 'sans-serif'],
        'editor-headings': ['Noto Sans', 'sans-serif'],
        'editor-mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
        'sans': ['Figtree', 'sans-serif'],
      },
      
      // Espacements
      spacing: {
        'chat-xs': '0.25rem',
        'chat-sm': '0.5rem',
        'chat-md': '0.75rem',
        'chat-lg': '1rem',
        'chat-xl': '1.5rem',
        'chat-2xl': '2rem',
      },
      
      // Rayons de bordure
      borderRadius: {
        'chat-sm': '4px',
        'chat-md': '6px',
        'chat-lg': '8px',
        'chat-xl': '12px',
        'chat-2xl': '16px',
        'chat-full': '50%',
      },
      
      // Ombres
      boxShadow: {
        'chat-sm': '0 1px 2px rgba(0, 0, 0, 0.1)',
        'chat-md': '0 2px 4px rgba(0, 0, 0, 0.15)',
        'chat-lg': '0 4px 8px rgba(0, 0, 0, 0.2)',
        'chat-xl': '0 8px 16px rgba(0, 0, 0, 0.25)',
        'glass-subtle': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'glass-soft': '0 4px 12px rgba(0, 0, 0, 0.12)',
        'glass-medium': '0 6px 16px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 40px -10px rgba(255, 87, 34, 0.3)',
        'glow-strong': '0 0 50px -10px rgba(255, 87, 34, 0.5)',
        'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
      
      // Flou
      backdropBlur: {
        'glass-light': '8px',
        'glass-medium': '12px',
        'glass-strong': '16px',
        'glass-heavy': '20px',
      },
      
      // Transitions
      transitionDuration: {
        'chat-fast': '150ms',
        'chat-normal': '200ms',
        'chat-slow': '300ms',
      },
      
      // Z-index
      zIndex: {
        'chat-dropdown': '1000',
        'chat-sidebar': '1001',
        'chat-modal': '1002',
        'chat-tooltip': '1003',
        'chat-overlay': '999',
      },
      
      // Tailles
      width: {
        'chat-button-sm': '28px',
        'chat-button-md': '32px',
        'chat-button-lg': '36px',
        'chat-button-xl': '40px',
      },
      height: {
        'chat-button-sm': '28px',
        'chat-button-md': '32px',
        'chat-button-lg': '36px',
        'chat-button-xl': '40px',
        'chat-header': '56px',
        'chat-input': '60px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
