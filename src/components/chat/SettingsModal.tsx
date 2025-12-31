import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Bell, Palette, Link2, Calendar, Database, Lock, Users, UserCircle, Moon, Sun, Sparkles, Circle, Info, Flame, Snowflake, Zap } from 'lucide-react';
import { useTheme, type ChatTheme } from '@/hooks/useTheme';
import { useChatStore } from '@/store/useChatStore';
import CustomSelect from './CustomSelect';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 
  | 'general'
  | 'notifications'
  | 'personalization'
  | 'connectors'
  | 'schedules'
  | 'data'
  | 'security'
  | 'parental'
  | 'account';

interface MenuItem {
  id: SettingsSection;
  icon: React.ReactNode;
  label: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  
  // Theme state
  const { theme, setTheme, availableThemes, mounted } = useTheme();
  const { currentSession, updateSession } = useChatStore();
  
  // Font state
  const [selectedFont, setSelectedFont] = useState<string>('figtree');
  const [selectedColorPalette, setSelectedColorPalette] = useState<string>('soft-dark');

  // Color palettes
  const availableColorPalettes = [
    { 
      value: 'soft-dark', 
      label: 'Sombre Doux', 
      icon: <Moon size={16} />,
      colors: {
        '--chat-text-primary': '#b5bcc4',
        '--chat-text-secondary': '#a3a9b2', 
        '--chat-text-muted': '#7a8088'
      }
    },
    { 
      value: 'warm-dark', 
      label: 'Sombre Chaud', 
      icon: <Flame size={16} />,
      colors: {
        '--chat-text-primary': '#d4c5a9',
        '--chat-text-secondary': '#c4b599',
        '--chat-text-muted': '#9a8b6f'
      }
    },
    { 
      value: 'cool-dark', 
      label: 'Sombre Froid', 
      icon: <Snowflake size={16} />,
      colors: {
        '--chat-text-primary': '#a8b8d8',
        '--chat-text-secondary': '#9aa8c8',
        '--chat-text-muted': '#6b7a9a'
      }
    },
    { 
      value: 'high-contrast', 
      label: 'Contraste Élevé', 
      icon: <Zap size={16} />,
      colors: {
        '--chat-text-primary': '#ffffff',
        '--chat-text-secondary': '#e5e5e5',
        '--chat-text-muted': '#a0a0a0'
      }
    },
    { 
      value: 'light-grey-dark', 
      label: 'Gris Foncé', 
      icon: <Circle size={16} />,
      colors: {
        '--chat-text-primary': '#2a2d32',
        '--chat-text-secondary': '#6b6e73',
        '--chat-text-muted': '#9a9da2'
      }
    },
    { 
      value: 'light-grey-soft', 
      label: 'Gris Doux', 
      icon: <Circle size={16} />,
      colors: {
        '--chat-text-primary': '#3a3d42',
        '--chat-text-secondary': '#6b6e73',
        '--chat-text-muted': '#9a9da2'
      }
    },
    { 
      value: 'light-grey-medium', 
      label: 'Gris Moyen', 
      icon: <Circle size={16} />,
      colors: {
        '--chat-text-primary': '#4a4d52',
        '--chat-text-secondary': '#7a7d82',
        '--chat-text-muted': '#aaadb2'
      }
    },
    { 
      value: 'light-grey-warm', 
      label: 'Gris Chaud', 
      icon: <Flame size={16} />,
      colors: {
        '--chat-text-primary': '#3d3a36',
        '--chat-text-secondary': '#6d6a66',
        '--chat-text-muted': '#9d9a96'
      }
    },
    { 
      value: 'light-taupe', 
      label: 'Taupe', 
      icon: <Palette size={16} />,
      colors: {
        '--chat-text-primary': '#4d4a46',
        '--chat-text-secondary': '#7d7a76',
        '--chat-text-muted': '#adaaa6'
      }
    }
  ];

  const availableFonts = [
    { value: 'figtree', label: 'Figtree', preview: 'Figtree' },
    { value: 'geist', label: 'Geist', preview: 'Geist' },
    { value: 'inter', label: 'Inter', preview: 'Inter' },
    { value: 'noto-sans', label: 'Noto Sans', preview: 'Noto Sans' },
    { value: 'manrope', label: 'Manrope', preview: 'Manrope' },
  ];

  const darkenColor = useCallback((hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, Math.floor((num >> 16) * (1 - percent / 100))));
    const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 0x0000FF) * (1 - percent / 100))));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }, []);

  // Load preferences
  useEffect(() => {
    const savedFont = localStorage.getItem('chat-font-preference');
    if (savedFont) setSelectedFont(savedFont);
    
    const savedColors = localStorage.getItem('chat-color-preference');
    if (savedColors) {
      setSelectedColorPalette(savedColors);
      // Appliquer la palette sauvegardée sur body avec !important
      const palette = availableColorPalettes.find(p => p.value === savedColors);
      if (palette) {
        Object.entries(palette.colors).forEach(([property, value]) => {
          document.body.style.setProperty(property, value, 'important');
        });
        
        const mutedColor = palette.colors['--chat-text-muted'];
        if (mutedColor) {
          const placeholderColor = darkenColor(mutedColor, 1);
          document.body.style.setProperty('--chat-text-placeholder', placeholderColor, 'important');
          
          const codeColor = darkenColor(mutedColor, -5);
          document.body.style.setProperty('--chat-text-code-bright', codeColor, 'important');
        }
      }
    }
    
  }, [currentSession, availableColorPalettes, darkenColor]);

  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    localStorage.setItem('chat-font-preference', fontValue);
    
    const fontMap: Record<string, string> = {
      'figtree': "'Figtree', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'geist': "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'noto-sans': "'Figtree', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'manrope': "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    };
    
    document.documentElement.style.setProperty('--font-chat-base', fontMap[fontValue]);
  };

  const handleColorPaletteChange = (paletteValue: string) => {
    setSelectedColorPalette(paletteValue);
    localStorage.setItem('chat-color-preference', paletteValue);
    
    const palette = availableColorPalettes.find(p => p.value === paletteValue);
    if (palette) {
      // Appliquer sur body au lieu de :root pour override les thèmes
      Object.entries(palette.colors).forEach(([property, value]) => {
        document.body.style.setProperty(property, value, 'important');
      });
      
      const mutedColor = palette.colors['--chat-text-muted'];
      if (mutedColor) {
        const placeholderColor = darkenColor(mutedColor, 1);
        document.body.style.setProperty('--chat-text-placeholder', placeholderColor, 'important');
        
        const codeColor = darkenColor(mutedColor, -5);
        document.body.style.setProperty('--chat-text-code-bright', codeColor, 'important');
        
        document.body.style.setProperty('--blk-muted', mutedColor, 'important');
      }
    }
  };

  // handleHistoryLimitChange supprimé (fonctionnalité obsolète)

  // Theme icons mapping
  const themeIcons: Record<ChatTheme, React.ReactNode> = {
    dark: <Moon size={16} />,
    light: <Sun size={16} />,
    grey: <Circle size={16} />,
    anthracite: <Circle size={16} />,
    glass: <Sparkles size={16} />,
  };

  if (!isOpen) return null;

  const menuItems: MenuItem[] = [
    { id: 'general', icon: <User size={18} />, label: 'General' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { id: 'personalization', icon: <Palette size={18} />, label: 'Personalization' },
    { id: 'connectors', icon: <Link2 size={18} />, label: 'Apps & Connectors' },
    { id: 'schedules', icon: <Calendar size={18} />, label: 'Schedules' },
    { id: 'data', icon: <Database size={18} />, label: 'Data controls' },
    { id: 'security', icon: <Lock size={18} />, label: 'Security' },
    { id: 'parental', icon: <Users size={18} />, label: 'Parental controls' },
    { id: 'account', icon: <UserCircle size={18} />, label: 'Account' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">General Settings</h2>
            <p className="settings-content-description">
              Configure your general preferences and application behavior.
            </p>
            {/* Content à ajouter */}
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Notifications</h2>
            <p className="settings-content-description">
              Manage your notification preferences.
            </p>
            {/* Content à ajouter */}
          </div>
        );
      case 'personalization':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Personalization</h2>
            <p className="settings-content-description">
              Customize the appearance and behavior of your chat interface.
            </p>

            {/* Theme selector */}
            <div className="settings-field">
              <label className="settings-field-label">Thème d'affichage</label>
              <CustomSelect
                value={theme}
                options={availableThemes.map(t => ({ 
                  value: t.value, 
                  label: t.label, 
                  icon: themeIcons[t.value]
                }))}
                onChange={(value) => setTheme(value as ChatTheme)}
                disabled={!mounted}
              />
            </div>

            {/* Font selector */}
            <div className="settings-field">
              <label className="settings-field-label">Police de caractères</label>
              <CustomSelect
                value={selectedFont}
                options={availableFonts.map(f => ({ 
                  value: f.value, 
                  label: f.label 
                }))}
                onChange={handleFontChange}
              />
            </div>

            {/* Color palette selector */}
            <div className="settings-field">
              <label className="settings-field-label">Palette de couleurs</label>
              <CustomSelect
                value={selectedColorPalette}
                options={availableColorPalettes.map(p => ({ 
                  value: p.value, 
                  label: p.label,
                  icon: p.icon
                }))}
                onChange={handleColorPaletteChange}
              />
            </div>

            {/* history_limit supprimé - Messages gérés via pagination automatique */}
          </div>
        );
      case 'account':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Account</h2>
            <p className="settings-content-description">
              Manage your account settings and preferences.
            </p>
            {/* Content à ajouter */}
          </div>
        );
      default:
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">{menuItems.find(m => m.id === activeSection)?.label}</h2>
            <p className="settings-content-description">
              Content coming soon...
            </p>
          </div>
        );
    }
  };

  const modalContent = (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Bouton fermer */}
        <button className="settings-modal-close" onClick={onClose} aria-label="Close settings">
          <X size={20} />
        </button>

        <div className="settings-modal-container">
          {/* Menu à gauche */}
          <nav className="settings-menu">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`settings-menu-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="settings-menu-icon">{item.icon}</span>
                <span className="settings-menu-label">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Contenu à droite */}
          <div className="settings-content-area">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SettingsModal;

