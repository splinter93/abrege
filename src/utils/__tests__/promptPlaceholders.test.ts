import { describe, expect, it } from 'vitest';
import {
  hasPromptPlaceholders,
  parsePromptPlaceholders,
  RESERVED_PLACEHOLDERS,
  filterPromptsInMessage
} from '../promptPlaceholders';

describe('parsePromptPlaceholders', () => {
  it('returns empty array when template has no placeholders', () => {
    expect(parsePromptPlaceholders('Hello world')).toEqual([]);
    expect(hasPromptPlaceholders('Hello world')).toBe(false);
  });

  it('detects unique placeholders and ignores duplicates', () => {
    const template = 'Bonjour {user}! Merci {user} pour {action}.';
    const result = parsePromptPlaceholders(template);

    expect(result).toEqual([{ name: 'user', isReserved: false }, { name: 'action', isReserved: false }]);
    expect(hasPromptPlaceholders(template)).toBe(true);
  });

  it('ignores reserved placeholders by default', () => {
    const template = 'Analyse {selection} pour {topic}.';
    const result = parsePromptPlaceholders(template);

    expect(result).toEqual([{ name: 'topic', isReserved: false }]);
  });

  it('includes reserved placeholders when requested', () => {
    const template = '{selection} + {extra}';
    const result = parsePromptPlaceholders(template, { includeReserved: true });

    expect(result).toEqual([
      { name: 'selection', isReserved: RESERVED_PLACEHOLDERS.has('selection') },
      { name: 'extra', isReserved: false }
    ]);
  });

  it('supports unicode letters and digits inside placeholders', () => {
    const template = 'Analyse {thème} avec {résumé2} et {idéation_supérieure}.';
    const result = parsePromptPlaceholders(template);

    expect(result).toEqual([
      { name: 'thème', isReserved: false },
      { name: 'résumé2', isReserved: false },
      { name: 'idéation_supérieure', isReserved: false }
    ]);
  });

  it('handles non-string inputs gracefully', () => {
    expect(parsePromptPlaceholders('')).toEqual([]);
    expect(parsePromptPlaceholders(undefined)).toEqual([]);
  });
});

describe('filterPromptsInMessage', () => {
  const prompts = [
    { slug: 'voyage-visuel' },
    { slug: 'résumé' },
    { slug: 'idee' }
  ];

  it('returns prompts whose slug command is present in message', () => {
    const message = 'Bonjour /voyage-visuel et encore /résumé.';
    const result = filterPromptsInMessage(message, prompts);
    expect(result).toEqual([{ slug: 'voyage-visuel' }, { slug: 'résumé' }]);
  });

  it('ignores prompts removed from message', () => {
    const message = 'Hello world, aucun prompt ici.';
    const result = filterPromptsInMessage(message, prompts);
    expect(result).toEqual([]);
  });

  it('handles unicode boundaries around slugs', () => {
    const message = 'Test:/résumé ✅';
    const result = filterPromptsInMessage(message, prompts);
    expect(result).toEqual([{ slug: 'résumé' }]);
  });

  it('is resilient to repeated commands', () => {
    const message = '/idee /idee /idee';
    const result = filterPromptsInMessage(message, prompts);
    expect(result).toEqual([{ slug: 'idee' }]);
  });

  it('returns empty array when prompts list is empty', () => {
    const message = '/voyage-visuel';
    const result = filterPromptsInMessage(message, []);
    expect(result).toEqual([]);
  });
});


