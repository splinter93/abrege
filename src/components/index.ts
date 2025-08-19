// Composants principaux
export { default as LogoHeader } from './LogoHeader';
export { default as Sidebar } from './Sidebar';
export { default as AppMainContent } from './AppMainContent';
export { default as AppRealtimeBridge } from './AppRealtimeBridge';

// Composants de sécurité
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as AuthGuard } from './AuthGuard';
export { default as FileUploader } from './FileUploader';
export { default as FilesContent } from './FilesContent';
export { default as FilesToolbar } from './FilesToolbar';
export { default as FolderManager } from './FolderManager';
export { default as ClasseurBandeau } from './ClasseurBandeau';

// Composants de test de sécurité
export { default as SecurityTestSuite } from './SecurityTestSuite';

// Hooks et utilitaires
export { useSecureErrorHandler } from './SecureErrorHandler';

// Composants d'agents
export { default as AgentTemplateManager } from './agents/AgentTemplateManager';
export { default as AgentTemplateDemo } from './agents/AgentTemplateDemo';

// Composants de test
export { default as APITester } from './APITester';
export { default as TestErrorComponent } from './TestErrorComponent'; 