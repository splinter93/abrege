/**
 * Plugin Markdown-it pour le support des tables GitHub (GFM)
 * Version optimisée et fonctionnelle
 */

export default function markdownItGithubTables(md: { block: { ruler: { before: (name: string, ruleName: string, fn: unknown) => void } } }) {
  // Regex pour détecter les tables GitHub
  // const tableRegex = /^(\|[^\n]+\|\r?\n)((?:\|[\s\-\:]+\|\r?\n)+)((?:\|[^\n]+\|\r?\n?)*)$/;

  // Fonction de parsing des tables
  function parseTable(state: { bMarks: number[]; tShift: number[]; eMarks: number[]; src: string; [key: string]: unknown }, startLine: number, endLine: number, silent: boolean): boolean {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const end = state.eMarks[startLine];
    const lineText = state.src.slice(start, end);

    // Vérifier si c'est le début d'une table
    if (!lineText.startsWith('|')) return false;

    // Lire toutes les lignes de la table
    let pos = startLine;
    const lines: string[] = [];
    
    while (pos < endLine) {
      const lineStart = state.bMarks[pos] + state.tShift[pos];
      const lineEnd = state.eMarks[pos];
      const line = state.src.slice(lineStart, lineEnd);
      
      if (!line.trim()) break; // Table terminée
      if (!line.startsWith('|')) break; // Table terminée
      
      lines.push(line);
      pos++;
    }

    // Vérifier qu'on a au moins 2 lignes (header + separator)
    if (lines.length < 2) return false;

    // Vérifier la ligne de séparation
    const separatorLine = lines[1];
    if (!separatorLine.match(/^\|[\s\-\:]+\|$/)) return false;

    if (silent) return true;

    // Parser la table
    const table = parseTableLines(lines);
    if (!table) return false;

    // Créer le token de table
    const tableToken = state.push('table_open', 'table', 1);
    tableToken.map = [startLine, pos];

                    // Créer le token de tbody
                state.push('tbody_open', 'tbody', 1);

    // Ajouter les lignes
    table.rows.forEach((row, rowIndex) => {
                      state.push('tr_open', 'tr', 1);
      
                        row.forEach((cell) => {
                    const tag = rowIndex === 0 ? 'th' : 'td';
                    state.push(tag + '_open', tag, 1);
                    
                    // Ajouter le contenu de la cellule
                    const contentToken = state.push('inline', '', 0);
                    contentToken.content = cell.trim();
                    contentToken.children = [];
                    
                    state.push(tag + '_close', tag, -1);
                  });
      
      state.push('tr_close', 'tr', -1);
    });

    state.push('tbody_close', 'tbody', -1);
    state.push('table_close', 'table', -1);

    // Mettre à jour la position
    state.line = pos;
    return true;
  }

  // Fonction pour parser les lignes de la table
  function parseTableLines(lines: string[]): { rows: string[][] } | null {
    try {
      const rows: string[][] = [];
      
      lines.forEach((line, index) => {
        if (index === 1) return; // Ignorer la ligne de séparation
        
        const cells = line.split('|').slice(1, -1); // Enlever le premier et dernier pipe
        rows.push(cells.map(cell => cell.trim()));
      });

      return { rows };
            } catch {
          return null;
        }
  }

  // Enregistrer le plugin
  md.block.ruler.before('table', 'github_table', parseTable, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
} 