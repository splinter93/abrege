/**
 * Services Mermaid unifiés pour tout le projet
 * Export centralisé de tous les composants Mermaid
 */

// Configuration
export * from './mermaidConfig';

// Services
export * from './mermaidService';

// Renderer
export * from './mermaidRenderer';

// Types réexportés pour facilité d'utilisation
export type {
  MermaidConfig,
  FlowchartConfig,
  SequenceConfig,
  GanttConfig,
  JourneyConfig,
  GitGraphConfig,
  PieConfig,
  EntityRelationshipConfig,
  ClassConfig,
  MermaidBlock,
  TextBlock,
  MermaidValidation,
  ContentBlock,
  MermaidRenderResult,
  MermaidRenderOptions
} from './mermaidConfig';

export type {
  MermaidBlock as MermaidBlockType,
  TextBlock as TextBlockType,
  MermaidValidation as MermaidValidationType,
  ContentBlock as ContentBlockType
} from './mermaidService';

export type {
  MermaidRenderResult as MermaidRenderResultType,
  MermaidRenderOptions as MermaidRenderOptionsType
} from './mermaidRenderer';

// Fonctions utilitaires principales
export {
  detectMermaidBlocks,
  validateMermaidSyntax,
  normalizeMermaidContent,
  getMermaidDiagramType,
  cleanMermaidContent,
  hasValidMermaidBlocks,
  extractValidMermaidBlocks,
  generateMermaidId,
  isMermaidErrorSvg
} from './mermaidService';

export {
  initializeMermaid,
  getMermaidConfig,
  updateMermaidConfig,
  defaultMermaidConfig
} from './mermaidConfig';

export {
  MermaidRenderer,
  useMermaidRenderer,
  renderMermaid,
  cancelMermaidRender
} from './mermaidRenderer';
