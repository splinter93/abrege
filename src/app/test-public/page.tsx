import React from 'react';
import PublicNoteContent from '@/app/[username]/[slug]/PublicNoteContent';
import PublicPageHeader from '@/components/PublicPageHeader';
import CraftedBadge from '@/components/CraftedBadge';
import '@/styles/typography.css';
import { simpleLogger as logger } from '@/utils/logger';

export default function TestPublicPage() {
  // Données de test qui simulent une note publique
  const testNote = {
    source_title: 'Test de la page publique locale',
    html_content: `<h1>Test de la page publique</h1>

<p>Ceci est un test de la page publique en local.</p>

<h2>Fonctionnalités testées</h2>

<ul>
<li>Header avec search bar</li>
<li>Menus (share et kebab)</li>
<li>Bouton Crafted</li>
<li>Styles typography.css</li>
</ul>

<h3>Code de test</h3>

<pre><code class="language-javascript">logger.dev('Test de la page publique');</code></pre>

<h2>Liste de test</h2>

<ol>
<li>Premier élément</li>
<li>Deuxième élément</li>
<li>Troisième élément</li>
</ol>

<blockquote>
<p>Citation de test pour vérifier les styles.</p>
</blockquote>

<p><strong>Gras</strong> et <em>italique</em> pour tester la typographie.</p>`,
    header_image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=300&fit=crop',
    header_image_offset: 0.5,
    header_image_blur: 0,
    header_image_overlay: 0.3,
    header_title_in_image: true,
    wide_mode: false,
    font_family: 'Noto Sans'
  };

  return (
    <div className="public-note-container">
      <PublicPageHeader />
      
      <PublicNoteContent 
        note={testNote}
        slug="test-public"
      />
      
      <CraftedBadge />
    </div>
  );
} 