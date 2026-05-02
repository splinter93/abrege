import { describe, expect, it } from 'vitest';
import { applySectionEdit } from '@/utils/sectionEditApply';
import { sectionEditV2Schema } from '@/utils/v2ValidationSchemas';

const markdown = [
  '# Alpha',
  '',
  'Ancien contenu.',
  '',
  '# Beta',
  '',
  'Suite.'
].join('\n');

describe('sectionEditApply', () => {
  it('clear_content vide le corps sans supprimer le heading', () => {
    const result = applySectionEdit(markdown, {
      action: 'clear_content',
      section_slug: 'alpha'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain('# Alpha');
    expect(result.markdown).not.toContain('Ancien contenu.');
    expect(result.markdown).toContain('# Beta');
  });

  it('replace_content accepte content vide seulement quand il est explicite', () => {
    const valid = sectionEditV2Schema.safeParse({
      action: 'replace_content',
      section_slug: 'alpha',
      content: ''
    });
    const missing = sectionEditV2Schema.safeParse({
      action: 'replace_content',
      section_slug: 'alpha'
    });

    expect(valid.success).toBe(true);
    expect(missing.success).toBe(false);
  });

  it('insert_inside_end refuse un content vide', () => {
    const parsed = sectionEditV2Schema.safeParse({
      action: 'insert_inside_end',
      section_slug: 'alpha',
      content: '   '
    });

    expect(parsed.success).toBe(false);
  });

  it('create_section retourne le slug réel après déduplication', () => {
    const result = applySectionEdit(markdown, {
      action: 'create_section',
      heading_title: 'Alpha',
      heading_level: 1,
      create_placement: 'at_end',
      content: 'Nouvelle section.'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created_section_slug).toBe('alpha-1');
  });
});
