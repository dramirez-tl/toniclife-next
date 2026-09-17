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
  /** Liberada individualmente para pruebas (opera aunque el POS global esté bloqueado). */
  operationsReleased: boolean;
  /** Facturación habilitada en esta terminal. false = la terminal oculta
   *  "Requiere factura" y el API rechaza timbrar sus ventas (piloto doble
   *  captura: la factura se emite en el sistema legacy). */
  invoicingEnabled: boolean;
  /** Checador de asistencia habilitado en esta terminal. Default apagado
   *  (fail-closed): el POS oculta el botón "Checador" y el API rechaza los
   *  registros de la terminal hasta que Sistemas lo prenda (rollout terminal
   *  por terminal). No depende de que la terminal esté liberada. */
  attendanceEnabled?: boolean;
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
