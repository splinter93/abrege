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
    mainBkg: '#1f2020',
    secondBkg: '#2d2d2d',
    background1: '#1a1a1a',
    background2: '#2d2d2d',
    background3: '#404040',
    
    // Flowchart
    nodeBkg: '#f97316',
    nodeBorder: '#ea580c',
    nodeTextColor: '#ffffff',
    clusterBkg: '#2d2d2d',
    clusterBorder: '#f97316',
    defaultLinkColor: '#f97316',
    edgeLabelBackground: 'transparent',
    
    // Sequence Diagram
    actorBkg: '#1f2020',
    actorBorder: '#f97316',
    actorTextColor: '#ffffff',
    messageTextColor: '#e5e7eb',
    noteBkgColor: '#fef3c7',
    noteBorderColor: '#f59e0b',
    noteTextColor: '#92400e',
    sectionBkgColor: '#2d2d2d',
    sectionBkgColor2: '#404040',
    
    // Class Diagram
    classBkg: '#1f2020',
    classBorder: '#f97316',
    classTitleColor: '#f97316',
    classLabelColor: '#e5e7eb',
    attributeTextColor: '#d1d5db',
    relationshipTextColor: '#ffffff',
    
    // State Diagram
    stateBkg: '#1f2020',
    stateBorder: '#ea580c',
    stateTextColor: '#ffffff',
    transitionTextColor: '#ffffff',
    labelTextColor: '#ffffff',
    edgeLabelColor: '#ffffff',
    
    // Entity Relationship
    entityBkg: '#1f2020',
    entityBorder: '#f97316',
    entityTextColor: '#ffffff',
    
    // Git Graph
    commitBkg: '#f97316',
    commitBorder: '#ea580c',
    commitTextColor: '#ffffff',
    branchTextColor: '#e5e7eb',
    
    // Pie Chart
    pieBkg: '#ffffff',
    pieBorder: '#f97316',
    pieTitleTextColor: '#ffffff',
    sliceTextColor: '#ffffff',
    
    // Journey
    journeyBkg: '#1f2020',
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
    labelBackground: '#2d2d2d',
    mainContrastColor: '#ffffff',
    darkTextColor: '#1f2020',
  },
  securityLevel: 'loose',
  fontFamily: 'Noto Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  
  // Configuration Flowchart
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
    diagramMarginX: 50,
    diagramMarginY: 20,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 15,
    boxTextMargin: 10,
    noteMargin: 15,
    messageMargin: 40,
    mirrorActors: true,
    bottomMarginAdj: 1,
    rightAngles: false,
    showSequenceNumbers: false,
    actorFontSize: 14,
    noteFontSize: 14,
    messageFontSize: 14,
    wrap: true,
    wrapPadding: 15,
    labelBoxWidth: 60,
    labelBoxHeight: 25,
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
    fontSize: 14,
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
    diagramPadding: 25,
    minEntityWidth: 120,
    minEntityHeight: 80,
    entityPadding: 20,
    stroke: '#f97316',
    fill: '#1f2020',
    fontSize: 14,
  },
  
  // Configuration Class
  class: {
    useMaxWidth: true,
    diagramPadding: 15,
    nodeSpacing: 60,
    rankSpacing: 60,
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
