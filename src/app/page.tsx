'use client';

import ContentCard from '../components/ContentCard';
import '../styles/design-system.css';

export default function Home() {
  // Placeholder minimal, à refaire plus tard
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
      <h1>Accueil en refonte</h1>
      <p>La page d&apos;accueil sera bientôt repensée.<br/>Composants réutilisables : ContentCard, Sidebar, etc.</p>
      {/* Exemple d'utilisation de ContentCard pour éviter l'arbre mort */}
      <div style={{ maxWidth: 400, margin: '40px auto' }}>
        <ContentCard data={{ id: 'demo', title: 'Exemple', content: 'Ceci est un ContentCard de démo.' }} />
      </div>
    </div>
  );
}
