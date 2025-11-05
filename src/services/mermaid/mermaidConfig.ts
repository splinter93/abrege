/**
 * Configuration Mermaid centralisée
 * Configuration unique pour tout le projet (éditeur + chat)
 */

import { simpleLogger as logger } from '@/utils/logger';

// Types spécifiques pour les configurations Mermaid
export interface MermaidThemeVariables {
  // Couleurs de base
  background: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  
  // Couleurs de texte
  primaryTextColor: string;
  secondaryTextColor: string;
  tertiaryTextColor: string;
  textColor: string;
  
  // Couleurs de bordures
  primaryBorderColor: string;
  secondaryBorderColor: string;
  tertiaryBorderColor: string;
  border1: string;
  border2: string;
  
  // Couleurs de lignes
  lineColor: string;
  arrowheadColor: string;
  
  // Fonds principaux
  mainBkg: string;
  secondBkg: string;
  background1: string;
  background2: string;
  background3: string;
  
  // Flowchart
  nodeBkg: string;
  nodeBorder: string;
  nodeTextColor: string;
  clusterBkg: string;
  clusterBorder: string;
  defaultLinkColor: string;
  edgeLabelBackground: string;
  
  // Sequence Diagram
  actorBkg: string;
  actorBorder: string;
  actorTextColor: string;
  messageTextColor: string;
  noteBkgColor: string;
  noteBorderColor: string;
  noteTextColor: string;
  sectionBkgColor: string;
  sectionBkgColor2: string;
  
  // Class Diagram
  classBkg: string;
  classBorder: string;
  classTitleColor: string;
  classLabelColor: string;
  attributeTextColor: string;
  relationshipTextColor: string;
  
  // State Diagram
  stateBkg: string;
  stateBorder: string;
  stateTextColor: string;
  transitionTextColor: string;
  labelTextColor: string;
  edgeLabelColor: string;
  
  // Entity Relationship
  entityBkg: string;
  entityBorder: string;
  entityTextColor: string;
  
  // Git Graph
  commitBkg: string;
  commitBorder: string;
  commitTextColor: string;
  branchTextColor: string;
  
  // Pie Chart
  pieBkg: string;
  pieBorder: string;
  pieTitleTextColor: string;
  sliceTextColor: string;
  
  // Journey
  journeyBkg: string;
  journeyBorder: string;
  journeyTextColor: string;
  
  // Couleurs d'état
  errorBkgColor: string;
  errorTextColor: string;
  warningBkgColor: string;
  warningTextColor: string;
  successBkgColor: string;
  successTextColor: string;
  
  // Couleurs spéciales
  titleColor: string;
  labelBackground: string;
  mainContrastColor: string;
  darkTextColor: string;
}

export interface MermaidFlowchartConfig {
  useMaxWidth: boolean;
  htmlLabels: boolean;
  curve: string;
  padding: number;
  nodeSpacing: number;
  rankSpacing: number;
  diagramPadding: number;
}

export interface MermaidSequenceConfig {
  useMaxWidth: boolean;
  diagramMarginX: number;
  diagramMarginY: number;
  actorMargin: number;
  width: number;
  height: number;
  boxMargin: number;
  boxTextMargin: number;
  noteMargin: number;
  messageMargin: number;
  mirrorActors: boolean;
  bottomMarginAdj: number;
  rightAngles: boolean;
  showSequenceNumbers: boolean;
  actorFontSize: number;
  noteFontSize: number;
  messageFontSize: number;
  wrap: boolean;
  wrapPadding: number;
  labelBoxWidth: number;
  labelBoxHeight: number;
}

export interface MermaidGanttConfig {
  useMaxWidth: boolean;
  titleTopMargin: number;
  barHeight: number;
  barGap: number;
  topPadding: number;
  leftPadding: number;
  gridLineStartPadding: number;
  fontSize: number;
  numberSectionStyles: number;
  axisFormat: string;
  topAxis: boolean;
}

export interface MermaidJourneyConfig {
  useMaxWidth: boolean;
  diagramMarginX: number;
  diagramMarginY: number;
}

export interface MermaidGitGraphConfig {
  useMaxWidth: boolean;
  rotateCommitLabel: boolean;
  mainBranchOrder: number;
  mainBranchName: string;
  showCommitLabel: boolean;
  showBranches: boolean;
}

export interface MermaidPieConfig {
  useMaxWidth: boolean;
  textPosition: number;
}

export interface MermaidERConfig {
  useMaxWidth: boolean;
  diagramPadding: number;
  minEntityWidth: number;
  minEntityHeight: number;
  entityPadding: number;
  stroke: string;
  fill: string;
  fontSize: number;
}

export interface MermaidClassConfig {
  useMaxWidth: boolean;
  diagramPadding: number;
  nodeSpacing: number;
  rankSpacing: number;
}

export interface MermaidConfig {
  startOnLoad?: boolean;
  theme: string;
  themeVariables: MermaidThemeVariables;
  securityLevel: string;
  fontFamily: string;
  fontSize: number;
  flowchart: MermaidFlowchartConfig;
  sequence: MermaidSequenceConfig;
  gantt: MermaidGanttConfig;
  journey: MermaidJourneyConfig;
  gitGraph: MermaidGitGraphConfig;
  pie: MermaidPieConfig;
  er: MermaidERConfig;
  class: MermaidClassConfig;
}

/**
 * Configuration Mermaid par défaut
 * Design moderne avec thème sombre et couleurs Scrivia
 */
export const defaultMermaidConfig: MermaidConfig = {
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    // Couleurs de base
    background: '#1a1a1a',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    tertiaryColor: '#fb923c',
    
    // Couleurs de texte
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#e5e7eb',
    tertiaryTextColor: '#ffffff',
    textColor: '#ffffff',
    
    // Couleurs de bordures
    primaryBorderColor: '#f97316',
    secondaryBorderColor: '#ea580c',
    tertiaryBorderColor: '#fb923c',
    border1: '#f97316',
    border2: '#ea580c',
    
    // Couleurs de lignes
    lineColor: '#f97316',
    arrowheadColor: '#f97316',
    
    // Fonds principaux
    mainBkg: 'transparent', /* ✅ Background transparent */
    secondBkg: 'transparent', /* ✅ Background transparent */
    background1: 'transparent', /* ✅ Background transparent */
    background2: 'transparent', /* ✅ Background transparent */
    background3: 'transparent', /* ✅ Background transparent */
    
    // Flowchart
    nodeBkg: 'transparent', /* ✅ Background transparent */
    nodeBorder: '#ea580c',
    nodeTextColor: '#ffffff',
    clusterBkg: 'transparent', /* ✅ Background transparent */
    clusterBorder: '#f97316',
    defaultLinkColor: '#f97316',
    edgeLabelBackground: 'transparent',
    
    // Sequence Diagram
    actorBkg: 'transparent', /* ✅ Background transparent */
    actorBorder: '#f97316',
    actorTextColor: '#ffffff',
    messageTextColor: '#e5e7eb',
    noteBkgColor: 'transparent', /* ✅ Background transparent */
    noteBorderColor: '#f59e0b',
    noteTextColor: '#ffffff', /* ✅ Texte blanc pour lisibilité */
    sectionBkgColor: 'transparent', /* ✅ Background transparent */
    sectionBkgColor2: 'transparent', /* ✅ Background transparent */
    
    // Class Diagram
    classBkg: 'transparent', /* ✅ Background transparent */
    classBorder: '#f97316',
    classTitleColor: '#f97316',
    classLabelColor: '#e5e7eb',
    attributeTextColor: '#d1d5db',
    relationshipTextColor: '#ffffff',
    
    // State Diagram
    stateBkg: 'transparent', /* ✅ Background transparent */
    stateBorder: '#ea580c',
    stateTextColor: '#ffffff',
    transitionTextColor: '#ffffff',
    labelTextColor: '#ffffff',
    edgeLabelColor: '#ffffff',
    
    // Entity Relationship
    entityBkg: 'transparent', /* ✅ Background transparent */
    entityBorder: '#f97316',
    entityTextColor: '#ffffff',
    
    // Git Graph
    commitBkg: 'transparent', /* ✅ Background transparent */
    commitBorder: '#ea580c',
    commitTextColor: '#ffffff',
    branchTextColor: '#e5e7eb',
    
    // Pie Chart
    pieBkg: 'transparent', /* ✅ Background transparent */
    pieBorder: '#f97316',
    pieTitleTextColor: '#ffffff',
    sliceTextColor: '#ffffff',
    
    // Journey
    journeyBkg: 'transparent', /* ✅ Background transparent */
    journeyBorder: '#f97316',
    journeyTextColor: '#ffffff',
    
    // Couleurs d'état
    errorBkgColor: '#fee2e2',
    errorTextColor: '#dc2626',
    warningBkgColor: '#fef3c7',
    warningTextColor: '#d97706',
    successBkgColor: '#ecfdf5',
    successTextColor: '#10b981',
    
    // Couleurs spéciales
    titleColor: '#f97316',
    labelBackground: 'transparent', /* ✅ Background transparent */
    mainContrastColor: '#ffffff',
    darkTextColor: '#1f2020',
  },
  securityLevel: 'loose',
  fontFamily: 'Figtree, Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', /* ✅ Cohérent avec --font-chat-text */
  fontSize: 18, /* ✅ Augmenté pour lisibilité */
  
  // Configuration Flowchart - Config par défaut Mermaid (minimal override)
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 50,
    diagramPadding: 20,
  },
  
  // Configuration Sequence
  sequence: {
    useMaxWidth: true,
    diagramMarginX: 60, /* ✅ Plus de marge */
    diagramMarginY: 30, /* ✅ Plus de marge */
    actorMargin: 60, /* ✅ Plus d'espace entre acteurs */
    width: 170, /* ✅ Boxes plus larges */
    height: 75, /* ✅ Boxes plus hautes */
    boxMargin: 20, /* ✅ Plus de marge */
    boxTextMargin: 15, /* ✅ Plus de padding texte */
    noteMargin: 20, /* ✅ Plus de marge */
    messageMargin: 50, /* ✅ Plus d'espace entre messages */
    mirrorActors: true,
    bottomMarginAdj: 1,
    rightAngles: false,
    showSequenceNumbers: false,
    actorFontSize: 18, /* ✅ Augmenté pour lisibilité */
    noteFontSize: 18, /* ✅ Augmenté pour lisibilité */
    messageFontSize: 18, /* ✅ Augmenté pour lisibilité */
    wrap: true,
    wrapPadding: 20, /* ✅ Plus de padding wrap */
    labelBoxWidth: 80, /* ✅ Box labels plus larges */
    labelBoxHeight: 35, /* ✅ Box labels plus hautes */
  },
  
  // Configuration Gantt
  gantt: {
    useMaxWidth: true,
    titleTopMargin: 30,
    barHeight: 25,
    barGap: 6,
    topPadding: 60,
    leftPadding: 80,
    gridLineStartPadding: 40,
    fontSize: 18, /* ✅ Augmenté pour lisibilité */
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d',
    topAxis: false,
  },
  
  // Configuration Journey
  journey: {
    useMaxWidth: true,
    diagramMarginX: 60,
    diagramMarginY: 25,
  },
  
  // Configuration GitGraph
  gitGraph: {
    useMaxWidth: true,
    rotateCommitLabel: true,
    mainBranchOrder: 0,
    mainBranchName: 'main',
    showCommitLabel: true,
    showBranches: true,
  },
  
  // Configuration Pie
  pie: {
    useMaxWidth: true,
    textPosition: 0.75,
  },
  
  // Configuration ER
  er: {
    useMaxWidth: true,
    diagramPadding: 35, /* ✅ Plus de padding */
    minEntityWidth: 150, /* ✅ Boxes plus larges */
    minEntityHeight: 100, /* ✅ Boxes plus hautes */
    entityPadding: 25, /* ✅ Plus de padding interne */
    stroke: '#f97316',
    fill: '#1f2020',
    fontSize: 18, /* ✅ Augmenté pour lisibilité */
  },
  
  // Configuration Class
  class: {
    useMaxWidth: true,
    diagramPadding: 25, /* ✅ Plus de padding */
    nodeSpacing: 70, /* ✅ Plus d'espace */
    rankSpacing: 70, /* ✅ Plus d'espace */
  },
};

/**
 * Initialise Mermaid avec la configuration par défaut
 */
export async function initializeMermaid(config: Partial<MermaidConfig> = {}): Promise<void> {
  try {
    const mermaid = await import('mermaid');
    const finalConfig = { ...defaultMermaidConfig, ...config };
    mermaid.default.initialize(finalConfig);
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de Mermaid:', error);
    throw error;
  }
}

/**
 * Obtient la configuration Mermaid actuelle
 */
export function getMermaidConfig(): MermaidConfig {
  return { ...defaultMermaidConfig };
}

/**
 * Met à jour la configuration Mermaid
 */
export async function updateMermaidConfig(updates: Partial<MermaidConfig>): Promise<void> {
  try {
    // Importer Mermaid dynamiquement
    const mermaidModule = await import('mermaid');
    const mermaid = mermaidModule.default;
    
    // Fusionner les mises à jour avec la configuration actuelle
    const currentConfig = getMermaidConfig();
    const newConfig = { ...currentConfig, ...updates };
    
    // Mettre à jour la configuration
    mermaid.initialize(newConfig);
    
    logger.info('Configuration Mermaid mise à jour:', newConfig);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la configuration Mermaid:', error);
    throw error;
  }
}
