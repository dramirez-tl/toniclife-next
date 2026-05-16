// Types para licencias POS (terminales Electron)

export type PosLicenseStatus = 'inactive' | 'active' | 'revoked';

export interface PosLicenseHardwareInfo {
  hostname?: string;
  cpuModel?: string;
  osPlatform?: string;
  osRelease?: string;
  primaryMac?: string;
  totalMemoryGb?: number;
  cpuCount?: number;
  [key: string]: unknown;
}

export interface PosLicense {
  id: string;
  licenseKey: string;
  branchId: string;
  branchName?: string;
  branchCode?: string;
  label?: string;
  status: PosLicenseStatus;
  hardwareFingerprint?: string;
  hardwareInfo?: PosLicenseHardwareInfo;
  activatedAt?: string;
  lastSeenAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosLicenseDto {
  branchId: string;
  label?: string;
  notes?: string;
}

export interface UpdatePosLicenseDto {
  label?: string;
  notes?: string;
}

export interface RevokePosLicenseDto {
  reason?: string;
}
