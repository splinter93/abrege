'use client';

import React, { useState } from 'react';
import { FiShare2, FiCopy, FiTwitter, FiFacebook, FiLinkedin } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import './PublicShareButton.css';

interface PublicShareButtonProps {
  url: string;
  title: string;
  description: string;
}

const PublicShareButton: React.FC<PublicShareButtonProps> = ({ url, title, description }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papiers !');
      setIsOpen(false);
    } catch (error) {
      console.error('Erreur copie lien:', error);
      toast.error('Erreur lors de la copie du lien');
    }
  };

  const handleShareTwitter = () => {
    const text = `${title} - ${description}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    setIsOpen(false);
  };

  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank');
    setIsOpen(false);
  };

  const handleShareLinkedin = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedinUrl, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="public-share-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Partager cette page"
        className="public-header-button"
      >
        <FiShare2 size={18} />
      </button>
      
      {isOpen && (
        <div className="public-share-menu">
          <div className="public-share-header">
            <h3>Partager cette page</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="public-share-close"
            >
              ×
            </button>
          </div>
          
          <div className="public-share-options">
            <button onClick={handleCopyLink} className="public-share-option">
              <FiCopy size={16} />
              <span>Copier le lien</span>
            </button>
            
            <button onClick={handleShareTwitter} className="public-share-option">
              <FiTwitter size={16} />
              <span>Twitter</span>
            </button>
            
            <button onClick={handleShareFacebook} className="public-share-option">
              <FiFacebook size={16} />
              <span>Facebook</span>
            </button>
            
            <button onClick={handleShareLinkedin} className="public-share-option">
              <FiLinkedin size={16} />
              <span>LinkedIn</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicShareButton; 