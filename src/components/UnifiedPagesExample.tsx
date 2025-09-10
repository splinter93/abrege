import React from 'react';

const UnifiedPagesExample: React.FC = () => {
  return (
    <div className="unified-sidebar">
      {/* Header de la sidebar */}
      <div className="unified-sidebar-header">
        <h2 className="text-xl font-semibold text-unified-text-primary">Navigation</h2>
      </div>

      {/* Navigation */}
      <nav className="unified-sidebar-nav">
        <a href="#" className="unified-nav-item active">
          <span className="unified-nav-icon">📁</span>
          <span className="unified-nav-text">Dossiers</span>
        </a>
        <a href="#" className="unified-nav-item">
          <span className="unified-nav-icon">📄</span>
          <span className="unified-nav-text">Fichiers</span>
        </a>
        <a href="#" className="unified-nav-item">
          <span className="unified-nav-icon">📚</span>
          <span className="unified-nav-text">Classeurs</span>
        </a>
      </nav>

      {/* Contenu principal */}
      <div className="flex-1 p-unified-lg">
        {/* Section Classeurs */}
        <div className="classeurs-section-glass">
          <div className="classeurs-container-glass">
            <h3 className="text-lg font-semibold mb-unified-md text-unified-text-primary">Mes Classeurs</h3>
            
            {/* Bandeau des classeurs */}
            <div className="classeur-bandeau">
              <div className="bandeau-content">
                <div className="classeur-pill active">
                  <span className="classeur-emoji">📚</span>
                  <span className="classeur-name">Travail</span>
                </div>
                <div className="classeur-pill">
                  <span className="classeur-emoji">🎯</span>
                  <span className="classeur-name">Projets</span>
                </div>
                <div className="classeur-pill add-classeur">
                  <span className="add-icon">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Fichiers */}
        <div className="files-toolbar">
          <div className="toolbar-left">
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Rechercher des fichiers..."
              />
              <button className="search-clear">×</button>
            </div>
          </div>
          
          <div className="toolbar-center">
            <button className="upload-btn">
              <span className="btn-icon">📤</span>
              <span className="btn-text">Upload</span>
            </button>
          </div>
          
          <div className="toolbar-right">
            <div className="view-toggle">
              <button className="view-btn active">
                <span className="view-icon">⊞</span>
              </button>
              <button className="view-btn">
                <span className="view-icon">☰</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grille des fichiers */}
        <div className="files-grid">
          <div className="file-grid-item">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">Document.pdf</div>
            </div>
          </div>
          <div className="file-grid-item">
            <div className="file-icon">🖼️</div>
            <div className="file-info">
              <div className="file-name">Image.jpg</div>
            </div>
          </div>
          <div className="file-grid-item">
            <div className="file-icon">📊</div>
            <div className="file-info">
              <div className="file-name">Tableau.xlsx</div>
            </div>
          </div>
        </div>

        {/* Boutons unifiés */}
        <div className="flex gap-unified-md mt-unified-lg">
          <button className="unified-btn unified-btn-primary">
            <span>Action Principale</span>
          </button>
          <button className="unified-btn unified-btn-secondary">
            <span>Action Secondaire</span>
          </button>
          <button className="unified-btn unified-btn-ghost">
            <span>Action Ghost</span>
          </button>
        </div>

        {/* Effets glassmorphism */}
        <div className="unified-glass unified-p-lg unified-rounded-xl mt-unified-lg">
          <h4 className="text-lg font-semibold mb-unified-md text-unified-text-primary">Effet Glassmorphism</h4>
          <p className="text-unified-text-secondary">
            Ce conteneur utilise l'effet glassmorphism unifié avec des variables CSS cohérentes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnifiedPagesExample;
