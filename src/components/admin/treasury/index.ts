// Componentes compartidos de Tesorería (contrato §5, patrón común).
export { TreasuryTabs, TREASURY_TABS, TREASURY_TAB_META, type TreasuryTab } from './TreasuryTabs';
export { TreasuryHeader } from './TreasuryHeader';
export {
  PeriodSelector,
  useTreasuryPeriod,
  ALL_PERIODS,
  type TreasuryPeriodSelection,
} from './PeriodSelector';
export { StageBadge } from './StageBadge';
export { ReadinessChip } from './ReadinessChip';
export { CommissionKpis, StageFunnel } from './CommissionKpis';
export { RegimeBreakdown } from './RegimeBreakdown';
export { TreasuryReadinessHeader, periodBlockers } from './TreasuryReadinessHeader';
export { CommissionDetailSheet } from './CommissionDetailSheet';
export { CancelCommissionDialog } from './CancelCommissionDialog';
export { ApprovePeriodDialog, ApproveSelectionDialog } from './ApproveDialogs';
export { MarkPaidDialog } from './MarkPaidDialog';
export {
  useTreasuryPermissions,
  hasAnyTreasuryPermission,
  TREASURY_READ_PERMISSIONS,
  TREASURY_APPROVE_PERMISSIONS,
  TREASURY_PAY_PERMISSIONS,
  TREASURY_WITHHOLD_PERMISSIONS,
  TREASURY_VALIDATE_PERMISSIONS,
} from './useTreasuryPermissions';
export * from './treasury-error';
export * from './treasury-format';
