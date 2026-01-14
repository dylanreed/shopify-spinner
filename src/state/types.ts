// ABOUTME: TypeScript types for store build state tracking.
// ABOUTME: Enables resume functionality after failures.

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'failed' | 'partial';

export interface StepState {
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface StoreState {
  storeId?: string;
  storeName: string;
  shopDomain?: string;
  createdAt: string;
  updatedAt: string;
  configPath: string;
  steps: {
    store_created: StepState;
    theme_configured: StepState;
    products_imported: StepState;
    collections_created: StepState;
    settings_applied: StepState;
  };
}
