import React from 'react';
import ContentCard from './ContentCard';

const RecentSection = () => {
  return (
    <section>
      <div className="tabs">
        <button>Récents</button>
        <button>Favoris</button>
        <button>Tous</button>
      </div>
      <div className="content-grid">
        {/* Placeholder for content cards */}
        <ContentCard />
        <ContentCard />
        <ContentCard />
      </div>
    </section>
  );
};

export default RecentSection; 