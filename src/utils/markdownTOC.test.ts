import { slugify, extractTOCWithSlugs, appendToSection } from './markdownTOC';

describe('slugify', () => {
  it('génère un slug simple', () => {
    expect(slugify('Titre Principal')).toBe('titre-principal');
    expect(slugify('Élévation & Résumé')).toBe('elevation-resume');
  });
  it('gère les doublons', () => {
    expect(slugify('Section 1')).toBe('section-1');
    expect(slugify('Section 1!')).toBe('section-1');
  });
});

describe('extractTOCWithSlugs', () => {
  it('extrait les titres et slugs uniques', () => {
    const md = `# Intro\n## Section\n## Section\n### Sub\n# Outro`;
    const toc = extractTOCWithSlugs(md);
    expect(toc.map((t: any) => t.slug)).toEqual(['intro', 'section', 'section-1', 'sub', 'outro']);
    expect(toc[1].title).toBe('Section');
    expect(toc[2].slug).toBe('section-1');
  });
});

describe('appendToSection', () => {
  const md = `# Intro\nTexte intro\n## Section\nContenu section\n# Outro`;
  it('ajoute à la bonne section par titre', () => {
    const result = appendToSection(md, 'Section', 'Ajout');
    expect(result).toMatch(/Contenu section\nAjout\n# Outro/);
  });
  it('ajoute à la bonne section par slug', () => {
    const toc = extractTOCWithSlugs(md);
    const slug = toc[1].slug;
    const result = appendToSection(md, slug, 'Ajout2');
    expect(result).toMatch(/Contenu section\nAjout2\n# Outro/);
  });
  it('lève une erreur si section inconnue', () => {
    expect(() => appendToSection(md, 'Inconnue', 'X')).toThrow('Section non trouvée');
  });
}); 