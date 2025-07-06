import { z } from 'zod';

/**
 * Validation stricte du markdown : uniquement markdown pur + balises d'alignement
 * Balises autorisées : <div align="center|left|right">...</div> (attribut align uniquement)
 * Tout autre HTML = 422 immédiat
 */
export const markdownContentSchema = z.string()
  .min(1, 'markdown_content requis')
  .refine((content) => {
    const allowedTags = /<div\s+align="(center|left|right)"[^>]*>[\s\S]*?<\/div>/g;
    const anyOtherTags = /<(?!\/?(div\s+align="(center|left|right)"[^>]*>|div\s+align="(center|left|right)"[^>]*>))[^>]*>/g;
    const contentWithoutAllowed = content.replace(allowedTags, '');
    return !anyOtherTags.test(contentWithoutAllowed);
  }, 'Seules les balises d\'alignement <div align="center|left|right"> sont autorisées dans markdown_content. Tout autre HTML est interdit.');

export const markdownExamples = {
  valid: [
    '# Mon Titre\nCeci est du markdown pur.',
    '# Titre\n<div align="center">\nCe texte est centré.\n</div>',
    '<div align="left">\nTexte aligné à gauche\n</div>\n\n# Suite du contenu',
    '**Gras** et *italique* avec <div align="right">alignement</div>',
    'Liste :\n- Item 1\n- Item 2\n\n<div align="center">Conclusion</div>'
  ],
  invalid: [
    '<script>alert("XSS")</script>',
    '<b>gras</b>',
    '<img src="...">',
    '<div style="color:red">texte</div>',
    '<p>paragraphe</p>',
    '<span>texte</span>',
    '<a href="...">lien</a>',
    '<div align="center"><b>texte</b></div>',
    '<div align="center">Texte'
  ]
}; 