/**
 * Shared Module Index
 * 
 * This module provides cross-app functionality:
 * - Integration management (useIntegrations)
 * - Workspace management (useWorkspace)
 * - UI components (SharedIntegrationsPanel, WorkspaceSwitcher)
 * 
 * Import from here for cleaner imports:
 *   import { useIntegrations, useWorkspace, WorkspaceSwitcher } from '@/shared';
 */

// ======================= HOOKS =======================

// Integration management
export { useIntegrations, useAppRegistry } from './hooks/useIntegrations';
export { default as useIntegrationsDefault } from './hooks/useIntegrations';

// Workspace management (Phase 1: Org isolation)
export { 
  useWorkspace, 
  WorkspaceProvider, 
  WorkspaceGuard,
  withWorkspace 
} from './hooks/useWorkspace';
export { default as useWorkspaceDefault } from './hooks/useWorkspace';

// ======================= COMPONENTS =======================

// Integration UI
export { SharedIntegrationsPanel } from './components/SharedIntegrationsPanel';

// Workspace UI
export { 
  WorkspaceSwitcher, 
  WorkspaceSwitcherCompact,
  WorkspaceSyncIndicator 
} from './components/WorkspaceSwitcher';
