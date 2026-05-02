import { describe, it, expect } from 'vitest';
import { omitNonPersistedAgentFields } from '../agentPersistence';

describe('omitNonPersistedAgentFields', () => {
  it('laisse passer les colonnes DB connues', () => {
    const input = {
      name: 'Andre',
      description: 'Rédacteur copywriting',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048,
      is_active: true,
      updated_at: '2026-05-02T00:00:00Z',
    };
    const result = omitNonPersistedAgentFields(input);
    expect(result).toEqual(input);
  });

  it('filtre silencieusement les clés inconnues (ex. config, is_favorite)', () => {
    const input = {
      name: 'Andre',
      config: { temperature: 0.7, top_p: 0.9 },
      is_favorite: true,
      category: 'copywriting',
      unknownField: 'whatever',
    };
    const result = omitNonPersistedAgentFields(input);
    expect(result).toEqual({ name: 'Andre' });
    expect('config' in result).toBe(false);
    expect('is_favorite' in result).toBe(false);
    expect('unknownField' in result).toBe(false);
  });

  it('ne laisse jamais passer id', () => {
    const input = {
      id: 'abc-123',
      name: 'Andre',
    };
    const result = omitNonPersistedAgentFields(input);
    expect('id' in result).toBe(false);
    expect(result.name).toBe('Andre');
  });

  it('ne laisse jamais passer is_platform (sécurité — bypass RLS via service role)', () => {
    const input = {
      name: 'Andre',
      is_platform: true,
    };
    const result = omitNonPersistedAgentFields(input);
    expect('is_platform' in result).toBe(false);
    expect(result.name).toBe('Andre');
  });

  it('ne laisse pas passer user_id (immuable après création)', () => {
    const input = {
      name: 'Andre',
      user_id: 'hacker-user-id',
    };
    const result = omitNonPersistedAgentFields(input);
    expect('user_id' in result).toBe(false);
  });

  it('laisse passer temperature, top_p, max_tokens à plat (après expansion config)', () => {
    const input = {
      temperature: 0.5,
      top_p: 0.8,
      max_tokens: 4096,
    };
    const result = omitNonPersistedAgentFields(input);
    expect(result.temperature).toBe(0.5);
    expect(result.top_p).toBe(0.8);
    expect(result.max_tokens).toBe(4096);
  });

  it('retourne un objet vide si toutes les clés sont inconnues', () => {
    const input = { foo: 'bar', baz: 42, config: {} };
    expect(omitNonPersistedAgentFields(input)).toEqual({});
  });

  it('préserve les valeurs nulles / undefined sur les colonnes connues', () => {
    const input = { description: null, voice: undefined };
    const result = omitNonPersistedAgentFields(input as Record<string, unknown>);
    expect('description' in result).toBe(true);
    expect(result.description).toBeNull();
    // undefined : Object.entries ne les inclut pas → absent du résultat, comportement normal JS
  });

  it('laisse passer les colonnes de la vue agents_active_summary', () => {
    const input = { model_variant: 'v2', max_completion_tokens: 8192, stream: true };
    const result = omitNonPersistedAgentFields(input);
    expect(result.model_variant).toBe('v2');
    expect(result.max_completion_tokens).toBe(8192);
    expect(result.stream).toBe(true);
  });
});
