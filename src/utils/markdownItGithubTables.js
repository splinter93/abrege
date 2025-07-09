// Source: https://github.com/center-key/markdown-it-github-tables/blob/main/dist/markdownItGithubTables.js
// Version adaptée pour usage local

export default function markdownItGithubTables(md) {
  // GFM table regex
  const tableRE = /^\|(.+)\|\s*\n(\|[-:]+)+\|\s*\n((\|.*\|\s*\n)*)/m;

  function table(state, startLine, endLine, silent) {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];
    let lineText = state.src.slice(pos, max);
    if (!lineText.startsWith('|')) return false;
    if (!tableRE.test(state.src.slice(pos))) return false;
    if (silent) return true;
    // fallback to default table parsing
    return false;
  }

  md.block.ruler.before('table', 'github_table', table, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
} 