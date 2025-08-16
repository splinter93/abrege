import React, { useState, useCallback, useEffect } from 'react';
import { FiShare2, FiCopy, FiUsers, FiLink, FiLock, FiGlobe, FiSettings, FiX, FiCheck, FiEye, FiPlus } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import type { ShareSettings, VisibilityLevel } from '@/types/sharing';
import { 
  VISIBILITY_OPTIONS
} from '@/types/sharing';
import './ShareMenu.css';

interface ShareMenuProps {
  noteId: string;
  currentSettings: ShareSettings;
  publicUrl?: string;
  onSettingsChange: (settings: ShareSettings) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

const ShareMenu: React.FC<ShareMenuProps> = ({
  noteId,
  currentSettings,
  publicUrl,
  onSettingsChange,
  isOpen,
  onClose
}) => {
  const [visibility, setVisibility] = useState<VisibilityLevel>(currentSettings.visibility);
  const [invitedUsers, setInvitedUsers] = useState<string[]>(currentSettings.invited_users);
  const [allowEdit, setAllowEdit] = useState(currentSettings.allow_edit);
  const [allowComments, setAllowComments] = useState(currentSettings.allow_comments || false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Synchroniser les états locaux avec les props
  useEffect(() => {
    setVisibility(currentSettings.visibility);
    setInvitedUsers(currentSettings.invited_users);
    setAllowEdit(currentSettings.allow_edit);
    setAllowComments(currentSettings.allow_comments || false);
  }, [currentSettings]);

  const handleVisibilityChange = (newVisibility: VisibilityLevel) => {
    setVisibility(newVisibility);
    
    // Réinitialiser les paramètres selon la visibilité
    if (newVisibility === 'private') {
      setInvitedUsers([]);
      setAllowEdit(false);
      setAllowComments(false);
    } else if (newVisibility === 'limited') {
      // Garder les utilisateurs invités mais réinitialiser les permissions
      setAllowEdit(false);
      setAllowComments(false);
    } else if (newVisibility === 'link-private' || newVisibility === 'link-public') {
      // Pour les liens, réinitialiser les permissions
      setAllowEdit(false);
      setAllowComments(false);
    }
  };

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) {
      toast.error('URL publique non disponible');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié dans le presse-papiers !');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset success state after 2 seconds
    } catch (error) {
      console.error('Erreur copie lien:', error);
      toast.error('Erreur lors de la copie du lien');
    }
  }, [publicUrl]);

  const handleSave = useCallback(async () => {
    // Validation des données
    if (!visibility) {
      toast.error('Veuillez sélectionner un niveau de visibilité');
      return;
    }

    if (visibility === 'limited' && invitedUsers.length === 0) {
      toast.error('Veuillez ajouter au moins un utilisateur invité pour le mode limité');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedSettings: ShareSettings = {
        ...currentSettings,
        visibility: visibility,
        invited_users: invitedUsers,
        allow_edit: allowEdit,
        allow_comments: allowComments,
      };
      
      await onSettingsChange(updatedSettings);
      toast.success('Paramètres de partage sauvegardés !');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde des paramètres de partage');
      console.error('Erreur sauvegarde:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [currentSettings, visibility, invitedUsers, allowEdit, allowComments, onSettingsChange]);

  if (!isOpen) return null;

  return (
    <>
      <div className="share-menu-overlay" onClick={onClose} />
      <div className="share-menu" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-menu-header">
          <h3>Partager cette note</h3>
          <button onClick={onClose} className="close-button">
            <FiX size={20} />
          </button>
        </div>

        {/* Options de visibilité */}
        <div className="share-menu-section">
          <h4>Qui peut voir cette note ?</h4>
          <div className="visibility-options">
            {VISIBILITY_OPTIONS.map((option) => (
              <label key={option.value} className="visibility-option">
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => handleVisibilityChange(option.value)}
                />
                <span className="option-icon">{option.icon}</span>
                <div className="option-content">
                  <span className="option-label">{option.label}</span>
                  <span className="option-description">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section lien public avec options SEO */}
        {(visibility === 'link-public' || visibility === 'link-private') && (
          <div className="share-menu-section">
            <h4>🔗 Lien de partage</h4>
            <div className="link-section">
              <div className="link-input-group">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="link-input"
                />
                <button
                  onClick={handleCopyLink}
                  className="copy-button"
                  disabled={copySuccess}
                >
                  {copySuccess ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </button>
              </div>
              
              {/* Options SEO pour lien public */}
              {visibility === 'link-public' && (
                <div className="seo-options">
                  <div className="seo-warning">
                    <FiGlobe size={16} />
                    <span>Cette note sera indexée par les moteurs de recherche</span>
                  </div>
                  <div className="seo-tips">
                    <p><strong>💡 Conseils SEO :</strong></p>
                    <ul>
                      <li>• Assurez-vous que le contenu est approprié pour le public</li>
                      <li>• Utilisez des titres et descriptions clairs</li>
                      <li>• Évitez les informations sensibles ou privées</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Options pour lien privé */}
              {visibility === 'link-private' && (
                <div className="seo-options">
                  <div className="seo-info">
                    <FiEye size={16} />
                    <span>Cette note est accessible via le lien mais ne sera pas indexée</span>
                  </div>
                  <div className="seo-tips">
                    <p><strong>🔒 Confidentialité :</strong></p>
                    <ul>
                      <li>• Contenu accessible uniquement via le lien direct</li>
                      <li>• Non référencé par Google ou autres moteurs</li>
                      <li>• Idéal pour le partage temporaire ou confidentiel</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section utilisateurs invités */}
        {visibility === 'limited' && (
          <div className="share-menu-section">
            <h4>👥 Utilisateurs invités</h4>
            <div className="invited-users-section">
              <div className="user-input-group">
                <input
                  type="email"
                  placeholder="email@exemple.com"
                  className="user-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const target = e.target as HTMLInputElement;
                      const email = target.value.trim();
                      if (email) {
                        if (!invitedUsers.includes(email)) {
                          // Validation basique d'email
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (emailRegex.test(email)) {
                            setInvitedUsers([...invitedUsers, email]);
                            target.value = '';
                          } else {
                            toast.error('Veuillez entrer une adresse email valide');
                          }
                        } else if (invitedUsers.includes(email)) {
                          toast.error('Cet utilisateur est déjà invité');
                        }
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('.user-input') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      const email = input.value.trim();
                      if (!invitedUsers.includes(email)) {
                        // Validation basique d'email
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (emailRegex.test(email)) {
                          setInvitedUsers([...invitedUsers, email]);
                          input.value = '';
                        } else {
                          toast.error('Veuillez entrer une adresse email valide');
                        }
                      } else {
                        toast.error('Cet utilisateur est déjà invité');
                      }
                    }
                  }}
                  className="add-user-button"
                >
                  <FiPlus size={16} />
                </button>
              </div>
              
              {invitedUsers.length > 0 && (
                <div className="invited-users-list">
                  {invitedUsers.map((email, index) => (
                    <div key={index} className="invited-user">
                      <span>{email}</span>
                      <button
                        onClick={() => setInvitedUsers(invitedUsers.filter((_, i) => i !== index))}
                        className="remove-user-button"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section permissions */}
        {(visibility === 'limited' || visibility === 'link-public' || visibility === 'link-private') && (
          <div className="share-menu-section">
            <h4>⚙️ Permissions</h4>
            <div className="permissions-section">
              <label className="permission-option">
                <input
                  type="checkbox"
                  checked={allowEdit}
                  onChange={(e) => setAllowEdit(e.target.checked)}
                />
                <span>Autoriser la modification</span>
              </label>
              
              <label className="permission-option">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                />
                <span>Autoriser les commentaires</span>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="share-menu-actions">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="save-button"
          >
            {isUpdating ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          <button onClick={onClose} className="cancel-button">
            Annuler
          </button>
        </div>
      </div>
    </>
  );
};

export default ShareMenu; 