import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, ChevronRight, User, Bell, Palette, Link2, Calendar, Database, Lock, Users, UserCircle, Moon, Sun, Sparkles, Circle, Flame, Snowflake, Zap, FileText, Settings, Mic } from 'lucide-react';
import { useTheme, type ChatTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/useChatStore';
import {
  CHAT_FONT_PRESETS,
  applyChatFontPreset,
  type ChatFontPresetId,
} from '@/constants/chatFontPresets';
import CustomSelect from './CustomSelect';
import './SettingsModal.css';
import {
  HISTORY_PREF_KEY,
  HISTORY_DEFAULT,
  HISTORY_PRESETS,
  setMaxHistoryMessages,
} from '@/utils/chatHistoryPreference';
import {
  WHISPER_MODEL_PREF_KEY,
  WHISPER_TRANSCRIBE_DEFAULT,
  WHISPER_TRANSCRIBE_MODELS,
  isWhisperTranscribeModelId,
  setWhisperTranscribeModel,
  type WhisperTranscribeModelId,
} from '@/utils/whisperModelPreference';

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
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [isMobileDetail, setIsMobileDetail] = useState(false);
  const { user } = useAuth();

  const checkMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleSelectSection = (id: SettingsSection) => {
    setActiveSection(id);
    if (checkMobile()) setIsMobileDetail(true);
  };

  const handleMobileBack = () => {
    setIsMobileDetail(false);
    setActiveSection(null);
  };

  // Desktop : sélectionner 'general' par défaut
  useEffect(() => {
    if (!isOpen) return;
    if (!checkMobile()) {
      setActiveSection(prev => prev ?? 'general');
      setIsMobileDetail(false);
    } else {
      setActiveSection(null);
      setIsMobileDetail(false);
    }
  }, [isOpen]);

  // Theme state
  const { theme, setTheme, availableThemes, mounted } = useTheme();
  const { currentSession, updateSession } = useChatStore();
  
  // Font state (Manrope par défaut)
  const [selectedFont, setSelectedFont] = useState<string>('manrope');
  const [selectedColorPalette, setSelectedColorPalette] = useState<string>('soft-dark');
  // PDF Parser (General) : railway = Hybrid Parser v4, mistral = Mistral OCR (défaut produit)
  const [selectedPdfParser, setSelectedPdfParser] = useState<string>('mistral');
  const [selectedWhisperModel, setSelectedWhisperModel] =
    useState<WhisperTranscribeModelId>(WHISPER_TRANSCRIBE_DEFAULT);
  // Mémoire de conversation (Général) — default 60
  const [maxHistory, setMaxHistory] = useState<number>(HISTORY_DEFAULT);

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
    },
    { 
      value: 'white-translucent', 
      label: 'Blanc Translucide', 
      icon: <Circle size={16} />,
      colors: {
        '--chat-text-primary': '#FFFFFF99',
        '--chat-text-secondary': '#FFFFFF88',
        '--chat-text-muted': '#FFFFFF66'
      }
    }
  ];

  const availableFonts = Object.values(CHAT_FONT_PRESETS).map((p) => ({
    value: p.id,
    label: p.label,
    preview: p.label,
  }));

  const darkenColor = useCallback((hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, Math.floor((num >> 16) * (1 - percent / 100))));
    const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 0x0000FF) * (1 - percent / 100))));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }, []);

  // Load preferences
  useEffect(() => {
    setSelectedFont('manrope');
    localStorage.setItem('chat-font-preference', 'manrope');

    const savedPdfParser = localStorage.getItem('chat-pdf-parser-preference');
    if (savedPdfParser === 'railway' || savedPdfParser === 'mistral') {
      setSelectedPdfParser(savedPdfParser);
    } else {
      setSelectedPdfParser('mistral');
      localStorage.setItem('chat-pdf-parser-preference', 'mistral');
    }

    const savedWhisper = localStorage.getItem(WHISPER_MODEL_PREF_KEY);
    if (savedWhisper && isWhisperTranscribeModelId(savedWhisper)) {
      setSelectedWhisperModel(savedWhisper);
    } else {
      setSelectedWhisperModel(WHISPER_TRANSCRIBE_DEFAULT);
      localStorage.setItem(
        WHISPER_MODEL_PREF_KEY,
        WHISPER_TRANSCRIBE_DEFAULT
      );
    }

    const savedMaxHistory = localStorage.getItem(HISTORY_PREF_KEY);
    if (savedMaxHistory) {
      const n = parseInt(savedMaxHistory, 10);
      if (!isNaN(n)) setMaxHistory(n);
    }

    const savedColors = localStorage.getItem('chat-color-preference');
    if (savedColors) {
      setSelectedColorPalette(savedColors);
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
    
  }, [isOpen, availableColorPalettes, darkenColor]);

  const handleFontChange = (_fontValue: string) => {
    setSelectedFont('manrope');
    localStorage.setItem('chat-font-preference', 'manrope');
    applyChatFontPreset('manrope');
  };

  const handlePdfParserChange = (value: string) => {
    if (value !== 'railway' && value !== 'mistral') return;
    setSelectedPdfParser(value);
    localStorage.setItem('chat-pdf-parser-preference', value);
  };

  const handleWhisperModelChange = (value: string) => {
    if (!isWhisperTranscribeModelId(value)) return;
    setSelectedWhisperModel(value);
    setWhisperTranscribeModel(value);
  };

  const handleMaxHistoryChange = (value: string) => {
    const n = parseInt(value, 10);
    if (isNaN(n)) return;
    setMaxHistory(n);
    setMaxHistoryMessages(n);
  };

  const handleColorPaletteChange = (paletteValue: string) => {
    setSelectedColorPalette(paletteValue);
    localStorage.setItem('chat-color-preference', paletteValue);
    
    const palette = availableColorPalettes.find(p => p.value === paletteValue);
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
        
        document.body.style.setProperty('--blk-muted', mutedColor, 'important');
      }
    }
  };

  // Theme icons mapping
  const themeIcons: Record<ChatTheme, React.ReactNode> = {
    dark: <Moon size={16} />,
    light: <Sun size={16} />,
    grey: <Circle size={16} />,
    anthracite: <Circle size={16} />,
    glass: <Sparkles size={16} />,
  };

  if (!isOpen) return null;

  const menuGroups = [
    {
      label: 'Mon Chat',
      items: [
        { id: 'general', icon: <Settings size={18} />, label: 'Général' },
        { id: 'personalization', icon: <Palette size={18} />, label: 'Personnalisation' },
        { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
        { id: 'connectors', icon: <Link2 size={18} />, label: 'Apps & Connecteurs' },
      ]
    },
    {
      label: 'Compte',
      items: [
        { id: 'account', icon: <UserCircle size={18} />, label: 'Mon Compte' },
        { id: 'security', icon: <Lock size={18} />, label: 'Sécurité' },
        { id: 'data', icon: <Database size={18} />, label: 'Contrôle des données' },
        { id: 'parental', icon: <Users size={18} />, label: 'Contrôle parental' },
      ]
    }
  ];

  const allMenuItems = menuGroups.flatMap(g => g.items);

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Général</h2>
            <p className="settings-content-description">
              Configurez vos préférences générales et le comportement de l'application.
            </p>

            <div className="settings-field">
              <label className="settings-field-label">Mémoire de conversation</label>
              <CustomSelect
                value={String(maxHistory)}
                options={HISTORY_PRESETS.map(p => ({
                  value: String(p.value),
                  label: `${p.label} — ${p.description}`,
                }))}
                onChange={handleMaxHistoryChange}
              />
              <p className="settings-field-description">
                Nombre de messages de l'historique envoyés à l'IA à chaque échange.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Parseur PDF</label>
              <CustomSelect
                value={selectedPdfParser}
                options={[
                  { value: 'railway', label: 'Hybrid Parser v4', icon: <FileText size={16} /> },
                  { value: 'mistral', label: 'Mistral OCR', icon: <FileText size={16} /> },
                ]}
                onChange={handlePdfParserChange}
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Transcription vocale (Whisper)</label>
              <CustomSelect
                value={selectedWhisperModel}
                options={WHISPER_TRANSCRIBE_MODELS.map((m) => ({
                  value: m.value,
                  label: `${m.label} — ${m.description}`,
                  icon: <Mic size={16} />,
                }))}
                onChange={handleWhisperModelChange}
              />
              <p className="settings-field-description">
                Modèle utilisé pour le micro du chat et de l’éditeur.
              </p>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Notifications</h2>
            <p className="settings-content-description">
              Gérez vos préférences de notifications.
            </p>
          </div>
        );
      case 'personalization':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Personnalisation</h2>
            <p className="settings-content-description">
              Personnalisez l'apparence et le comportement de votre interface.
            </p>

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
          </div>
        );
      case 'account':
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">Mon Compte</h2>
            <p className="settings-content-description">
              Gérez vos informations de compte et vos préférences.
            </p>
          </div>
        );
      default:
        return (
          <div className="settings-content">
            <h2 className="settings-content-title">{allMenuItems.find(m => m.id === activeSection)?.label}</h2>
            <p className="settings-content-description">
              Contenu à venir...
            </p>
          </div>
        );
    }
  };

  const userMeta = user?.user_metadata as { full_name?: string; name?: string; avatar_url?: string } | undefined;
  const userDisplayName = userMeta?.full_name || userMeta?.name || user?.email?.split('@')[0] || 'Utilisateur';
  const userInitial = (userDisplayName as string).charAt(0).toUpperCase();

  const modalContent = (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── DESKTOP : deux colonnes ── */}
        <div className="settings-desktop-layout">
          <button className="settings-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
          <div className="settings-modal-container">
            <nav className="settings-menu">
              {menuGroups.map((group, idx) => (
                <div key={idx} className="settings-menu-group">
                  <div className="settings-menu-group-label">{group.label}</div>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className={`settings-menu-item ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(item.id as SettingsSection)}
                    >
                      <span className="settings-menu-icon">{item.icon}</span>
                      <span className="settings-menu-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </nav>
            <div className="settings-content-area">
              {activeSection ? renderContent() : null}
            </div>
          </div>
        </div>

        {/* ── MOBILE : vue liste ── */}
        <div className={`settings-mobile-layout${isMobileDetail ? ' settings-mobile-layout--detail' : ''}`}>

          {/* Vue liste */}
          <div className="settings-mobile-list-view">
            <div className="settings-mobile-header">
              <span className="settings-mobile-title">Paramètres</span>
              <button className="settings-mobile-close" onClick={onClose} aria-label="Fermer">
                <ArrowLeft size={20} />
              </button>
            </div>
            
            <div className="settings-mobile-scroll">
              <div className="settings-mobile-profile">
                <div className="settings-mobile-avatar">
                  {userMeta?.avatar_url ? (
                    <img src={userMeta.avatar_url} alt="" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="settings-mobile-user-info">
                  <div className="settings-mobile-user-name">{userDisplayName}</div>
                  <div className="settings-mobile-user-email">{user?.email}</div>
                </div>
                <button className="settings-mobile-profile-btn" onClick={() => handleSelectSection('account')}>
                  Modifier
                </button>
              </div>

              <nav className="settings-mobile-menu">
                {menuGroups.map((group, gIdx) => (
                  <div key={gIdx} className="settings-mobile-group">
                    <div className="settings-mobile-group-label">{group.label}</div>
                    <div className="settings-mobile-group-content">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          className="settings-mobile-menu-item"
                          onClick={() => handleSelectSection(item.id as SettingsSection)}
                        >
                          <span className="settings-mobile-menu-icon">{item.icon}</span>
                          <span className="settings-mobile-menu-label">{item.label}</span>
                          <ChevronRight size={16} className="settings-mobile-menu-chevron" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Vue détail */}
          <div className="settings-mobile-detail-view">
            <div className="settings-mobile-header">
              <button className="settings-mobile-back" onClick={handleMobileBack} aria-label="Retour">
                <ArrowLeft size={20} />
              </button>
              <span className="settings-mobile-title">
                {allMenuItems.find(m => m.id === activeSection)?.label ?? ''}
              </span>
              <div className="settings-mobile-header-spacer" />
            </div>
            <div className="settings-mobile-content-area">
              {activeSection ? renderContent() : null}
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SettingsModal;

