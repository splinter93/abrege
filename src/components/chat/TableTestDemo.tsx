'use client';
import React from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';

/**
 * Composant de test pour vérifier le rendu des tableaux markdown
 */
const TableTestDemo: React.FC = () => {
  // Exemples de tableaux markdown pour tester
  const tableExamples = [
    {
      name: 'Tableau Simple',
      markdown: `| Nom | Âge | Ville |
|-----|-----|-------|
| Alice | 25 | Paris |
| Bob | 30 | Lyon |
| Carol | 28 | Marseille |`
    },
    {
      name: 'Tableau avec Alignement',
      markdown: `| Nom | Âge | Ville |
|:----|:--:|------:|
| Alice | 25 | Paris |
| Bob | 30 | Lyon |
| Carol | 28 | Marseille |`
    },
    {
      name: 'Tableau Complexe',
      markdown: `| Fonctionnalité | Statut | Priorité | Notes |
|:---------------|:------:|:--------:|:------|
| ✅ Tables Markdown | Terminé | Haute | Fonctionne parfaitement |
| 🔄 Streaming | En cours | Moyenne | Optimisation en cours |
| 🎨 Styles CSS | Terminé | Haute | Design moderne |
| 📱 Responsive | Terminé | Haute | Mobile-friendly |
| 🚀 Performance | En cours | Haute | Tests en cours |`
    },
    {
      name: 'Tableau avec Contenu Mixte',
      markdown: `| Type | Exemple | Description |
|:-----|:-------|:------------|
| **Bold** | \`code\` | Texte en gras et code inline |
| *Italic* | [Lien](https://example.com) | Texte en italique avec lien |
| ~~Strikethrough~~ | \`\`\`block\`\`\` | Texte barré et bloc de code |
| > Quote | \`\`\`js\nconsole.log()\`\`\` | Citation et code JavaScript |`
    }
  ];

  return (
    <div className="table-test-demo">
      <div className="demo-header">
        <h1>🧪 Test des Tableaux Markdown</h1>
        <p>Vérification du rendu des tableaux avec le nouveau système</p>
      </div>

      <div className="demo-content">
        {tableExamples.map((example, index) => (
          <div key={index} className="table-example">
            <h3>{example.name}</h3>
            
            <div className="markdown-source">
              <h4>Source Markdown :</h4>
              <pre>{example.markdown}</pre>
            </div>
            
            <div className="markdown-rendered">
              <h4>Rendu :</h4>
              <div className="rendered-content">
                <EnhancedMarkdownMessage content={example.markdown} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .table-test-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #0f0f23;
          min-height: 100vh;
          color: #e5e7eb;
        }
        
        .demo-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .demo-header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #ffffff;
        }
        
        .demo-header p {
          margin: 0;
          opacity: 0.8;
          font-size: 16px;
        }
        
        .demo-content {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        
        .table-example {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .table-example h3 {
          margin: 0 0 20px 0;
          color: #ffffff;
          font-size: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 10px;
        }
        
        .markdown-source,
        .markdown-rendered {
          margin-bottom: 30px;
        }
        
        .markdown-source h4,
        .markdown-rendered h4 {
          margin: 0 0 15px 0;
          color: #ffffff;
          font-size: 16px;
          opacity: 0.9;
        }
        
        .markdown-source pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #e5e7eb;
        }
        
        .rendered-content {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 20px;
          min-height: 100px;
        }
        
        @media (max-width: 768px) {
          .table-test-demo {
            padding: 15px;
          }
          
          .demo-header {
            padding: 20px;
          }
          
          .demo-header h1 {
            font-size: 24px;
          }
          
          .table-example {
            padding: 20px;
          }
          
          .markdown-source pre {
            font-size: 11px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default TableTestDemo; 