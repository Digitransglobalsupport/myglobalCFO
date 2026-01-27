/**
 * Shared Module Index
 * 
 * This module provides cross-app integration functionality.
 * Import from here for cleaner imports:
 * 
 *   import { useIntegrations, SharedIntegrationsPanel } from '@/shared';
 */

// Hooks
export { useIntegrations, useAppRegistry } from './hooks/useIntegrations';

// Components
export { SharedIntegrationsPanel } from './components/SharedIntegrationsPanel';

// Re-export default
export { default as useIntegrationsDefault } from './hooks/useIntegrations';
