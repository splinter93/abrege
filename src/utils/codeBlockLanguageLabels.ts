/**
 * Noms d'affichage des langages pour les en-têtes de blocs code.
 * Clés en minuscules (alias courants), valeurs = libellé propre (JavaScript, HTML, cURL, etc.)
 */
const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  json: 'JSON',
  xml: 'XML',
  sql: 'SQL',
  bash: 'Bash',
  shell: 'Shell',
  sh: 'Shell',
  zsh: 'Zsh',
  curl: 'cURL',
  python: 'Python',
  py: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  markdown: 'Markdown',
  md: 'Markdown',
  mermaid: 'Mermaid',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  plaintext: 'Plain text',
  text: 'Text',
  plain: 'Plain text',
  diff: 'Diff',
  graphql: 'GraphQL',
  scss: 'SCSS',
  sass: 'Sass',
  vue: 'Vue',
  svelte: 'Svelte',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  r: 'R',
  scala: 'Scala',
  perl: 'Perl',
  lua: 'Lua',
  haskell: 'Haskell',
  hs: 'Haskell',
  elixir: 'Elixir',
  erlang: 'Erlang',
  clojure: 'Clojure',
  dart: 'Dart',
  zig: 'Zig',
  solidity: 'Solidity',
  nginx: 'Nginx',
  apache: 'Apache',
  cmake: 'CMake',
  groovy: 'Groovy',
  objectivec: 'Objective-C',
  objc: 'Objective-C',
};

/**
 * Retourne le libellé d'affichage pour un langage de bloc code.
 * Fallback : première lettre en majuscule, reste en minuscules.
 */
export function getCodeBlockLanguageLabel(lang: string | null | undefined): string {
  if (!lang || !lang.trim()) return 'Text';
  const key = lang.trim().toLowerCase();
  return LANGUAGE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}
