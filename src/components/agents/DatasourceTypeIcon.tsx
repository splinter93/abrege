'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Brain, Key, Table, Layers } from 'lucide-react';

/**
 * Couleur par défaut par type (Synesia) — inline pour éviter les soucis Tailwind / underscores dans les tokens.
 * Variables : src/styles/variables.css (--knowledge-color, etc.)
 */
const DEFAULT_COLOR_CSS_BY_TYPE: Record<string, string> = {
  knowledge: 'rgb(var(--knowledge-color))',
  memory: 'rgb(var(--memory-color))',
  kv_storage: 'rgb(var(--kv_storage-color))',
  spreadsheet: 'rgb(var(--spreadsheet-color))',
};

const DEFAULT_ICON_BY_TYPE: Record<string, LucideIcon> = {
  knowledge: BookOpen,
  memory: Brain,
  kv_storage: Key,
  spreadsheet: Table,
};

function normalizeIconKey(name: string): string {
  return name.replace(/Icon$/i, '').toLowerCase();
}

const LUCIDE_BY_NAME: Record<string, LucideIcon> = {
  bookopen: BookOpen,
  brain: Brain,
  key: Key,
  table: Table,
  layers: Layers,
  database: Key,
};

function parseCustomization(raw: unknown): { icon?: string; color?: string } | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const icon = typeof o.icon === 'string' ? o.icon : undefined;
  const color = typeof o.color === 'string' ? o.color : undefined;
  if (icon === undefined && color === undefined) return undefined;
  return { icon, color };
}

function resolveIcon(iconName: string | undefined, type: string): LucideIcon {
  if (iconName?.trim()) {
    const key = normalizeIconKey(iconName.trim());
    const fromName = LUCIDE_BY_NAME[key];
    if (fromName) return fromName;
  }
  return DEFAULT_ICON_BY_TYPE[type] ?? Layers;
}

export interface DatasourceTypeIconProps {
  type: string;
  customization?: unknown;
  className?: string;
}

export function DatasourceTypeIcon({ type, customization, className }: DatasourceTypeIconProps) {
  const custom = parseCustomization(customization);
  const Icon = resolveIcon(custom?.icon, type);
  const customColor = custom?.color?.trim();

  const defaultCss = DEFAULT_COLOR_CSS_BY_TYPE[type];
  const style: React.CSSProperties | undefined = customColor
    ? { color: customColor }
    : defaultCss
      ? { color: defaultCss }
      : undefined;

  const neutralFallback = !customColor && !defaultCss;

  return (
    <Icon
      className={`w-4 h-4 shrink-0 ${neutralFallback ? 'text-zinc-500' : ''} ${className ?? ''}`.trim()}
      style={style}
      aria-hidden
    />
  );
}
