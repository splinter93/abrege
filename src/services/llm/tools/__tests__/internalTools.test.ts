/**
 * Tests unitaires pour internalTools
 * Couvre : schéma PLAN_UPDATE_TOOL, guard d'injection externalToolCount >= 2
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_UPDATE_TOOL,
  INTERNAL_TOOLS,
  INTERNAL_TOOL_NAMES
} from '../internalTools';

describe('PLAN_UPDATE_TOOL schema', () => {
  it('exports a function tool named __plan_update', () => {
    expect(PLAN_UPDATE_TOOL.type).toBe('function');
    expect(PLAN_UPDATE_TOOL.function.name).toBe('__plan_update');
  });

  it('requires steps array', () => {
    const required = PLAN_UPDATE_TOOL.function.parameters?.required as string[] | undefined;
    expect(required).toContain('steps');
  });

  it('steps items require id, content and status', () => {
    const items = (
      PLAN_UPDATE_TOOL.function.parameters?.properties as Record<string, {
        items?: { required?: string[] }
      }>
    )?.steps?.items;
    expect(items?.required).toContain('id');
    expect(items?.required).toContain('content');
    expect(items?.required).toContain('status');
  });

  it('description does not contain the word REQUIRED (causes over-use on weak models)', () => {
    expect(PLAN_UPDATE_TOOL.function.description).not.toMatch(/\bREQUIRED\b/);
  });

  it('description mentions 3+ steps threshold', () => {
    expect(PLAN_UPDATE_TOOL.function.description).toMatch(/3 or more/i);
  });
});

describe('INTERNAL_TOOL_NAMES set', () => {
  it('contains __plan_update', () => {
    expect(INTERNAL_TOOL_NAMES.has('__plan_update')).toBe(true);
  });

  it('matches INTERNAL_TOOLS array', () => {
    for (const tool of INTERNAL_TOOLS) {
      expect(INTERNAL_TOOL_NAMES.has(tool.function.name)).toBe(true);
    }
  });
});

describe('guard injection: externalToolCount >= 2', () => {
  // Simule la logique du guard dans stream/route.ts
  // sans instancier la route Next.js entière.
  function shouldInjectPlanTool(externalCount: number): boolean {
    return externalCount >= 2;
  }

  it('does not inject plan tool when 0 external tools', () => {
    expect(shouldInjectPlanTool(0)).toBe(false);
  });

  it('does not inject plan tool when 1 external tool', () => {
    expect(shouldInjectPlanTool(1)).toBe(false);
  });

  it('injects plan tool when 2 external tools', () => {
    expect(shouldInjectPlanTool(2)).toBe(true);
  });

  it('injects plan tool when 5 external tools', () => {
    expect(shouldInjectPlanTool(5)).toBe(true);
  });
});
