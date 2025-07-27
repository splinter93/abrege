import React from 'react';
import ContentCard from './ContentCard';
import './RecentSection.css';

const mockData = {
  id: '1',
  imageUrl: 'https://via.placeholder.com/150',
  category: 'Catégorie',
  title: 'Titre de la fiche',
  source: 'Source',
  duration: '5 min',
  readTime: '2 min',
};

const RecentSection: React.FC = () => {
  return (
    <section>
      <div className="tabs">
        <button>Récents</button>
        <button>Favoris</button>
        <button>Tous</button>
      </div>
      <div className="content-grid">
        {/* Placeholder for content cards */}
        <ContentCard data={mockData} />
        <ContentCard data={mockData} />
        <ContentCard data={mockData} />
      </div>
    </section>
  );
};

export default RecentSection; 