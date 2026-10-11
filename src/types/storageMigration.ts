// storageMigration.ts - Espejo de toniclife-api
// src/integrations/storage/storage-migration.service.ts (copia GCS -> S3).

export type StorageMigrationJobState = 'running' | 'done' | 'stopped' | 'failed';

export interface StorageMigrationJob {
  state: StorageMigrationJobState;
  dryRun: boolean;
  prefix: string;
  startedAt: string;
  finishedAt: string | null;
  /** Objetos vistos en GCS. */
  scanned: number;
  /** Copiados a S3 en esta corrida. */
  copied: number;
  /** Ya estaban en S3 con el mismo tamaño. */
  skipped: number;
  /** Faltantes detectados en simulación. */
  pending: number;
  failed: number;
  bytesCopied: number;
  bytesPending: number;
  lastKey: string | null;
  errors: { key: string; error: string }[];
  /** Mensaje cuando state = failed (falló el listado, no un objeto). */
  error: string | null;
}

export interface StorageMigrationStatus {
  /** Proveedor activo del API: 'gcs' | 's3' | 'local'. */
  activeProvider: string;
  source: { configured: boolean; bucket: string | null };
  target: { configured: boolean; bucket: string | null; region: string | null };
  job: StorageMigrationJob | null;
}

export interface StartStorageMigrationInput {
  /** true = solo contar faltantes, no copia nada. */
  dryRun: boolean;
  /** Carpeta (products/, users/…); vacío = todo el bucket. */
  prefix?: string;
}
