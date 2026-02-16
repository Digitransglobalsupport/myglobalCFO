/**
 * Shared Library - Central Exports
 * 
 * IMPORTANT: All reusable UI components must be exported from here.
 * This ensures portability between Finance and PMO apps.
 * 
 * Usage:
 *   import { StatCard, DataTable, FeatureGate } from '@/shared-library';
 */

// ======================= HOOKS =======================

// Plan-based feature gating
export { 
  usePlanFeatures,
  FEATURE_DEFINITIONS 
} from './hooks/usePlanFeatures';

// Workspace-aware data fetching
export { 
  useDataFetch,
  useDataMutation,
  usePaginatedFetch 
} from './hooks/useDataFetch';

// ======================= COMPONENTS: FEATURE GATING =======================

export { 
  FeatureGate,
  FeatureCheck,
  FeatureBadge,
  LimitGate,
  UpgradePrompt 
} from './components/FeatureGate';

// ======================= COMPONENTS: CARDS =======================

export { 
  StatCard,
  MetricCard,
  KPICard 
} from './components/cards/StatCard';

// ======================= COMPONENTS: TABLES =======================

export { 
  DataTable 
} from './components/tables/DataTable';

// ======================= COMPONENTS: CHARTS =======================

// TODO: Add chart components
// export { LineChart } from './components/charts/LineChart';
// export { BarChart } from './components/charts/BarChart';
// export { PieChart } from './components/charts/PieChart';

// ======================= COMPONENTS: LAYOUT =======================

// TODO: Add layout components
// export { PageHeader } from './components/layout/PageHeader';
// export { SectionContainer } from './components/layout/SectionContainer';

// ======================= UTILITIES =======================

// TODO: Add utility exports
// export * from './utils/formatters';
// export * from './utils/validators';

// ======================= RE-EXPORTS FROM SHARED =======================
// These are from /src/shared (workspace management)

export { 
  useWorkspace, 
  WorkspaceProvider, 
  WorkspaceGuard,
  withWorkspace 
} from '../shared/hooks/useWorkspace';

export { 
  WorkspaceSwitcher, 
  WorkspaceSwitcherCompact,
  WorkspaceSyncIndicator 
} from '../shared/components/WorkspaceSwitcher';

export { 
  useIntegrations, 
  useAppRegistry 
} from '../shared/hooks/useIntegrations';

export { 
  SharedIntegrationsPanel 
} from '../shared/components/SharedIntegrationsPanel';
