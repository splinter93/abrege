/**
 * Sélecteur d'icônes pour les prompts
 * @module components/prompts/IconPicker
 */

import React, { useState } from 'react';
import { getRecommendedPromptIcons, getIconComponent } from '@/utils/iconMapper';
import './IconPicker.css';

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  onSelect,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const recommendedIcons = getRecommendedPromptIcons();

  // Filtrer les icônes par recherche
  const filteredIcons = recommendedIcons.filter(iconName =>
    iconName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="icon-picker-overlay" onClick={onClose}>
      <div className="icon-picker" onClick={(e) => e.stopPropagation()}>
        <div className="icon-picker-header">
          <input
            type="text"
            className="icon-picker-search"
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="icon-picker-grid">
          {filteredIcons.map((iconName) => {
            const Icon = getIconComponent(iconName);
            const isSelected = iconName === selectedIcon;

            return (
              <button
                key={iconName}
                type="button"
                className={`icon-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(iconName)}
                title={iconName}
              >
                <Icon size={24} />
              </button>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className="icon-picker-empty">
            Aucune icône trouvée
          </div>
        )}
      </div>
    </div>
  );
};

export default IconPicker;


