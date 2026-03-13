'use client';

import { useVersionCheck } from '@/hooks/useVersionCheck';

export function VersionChecker() {
  useVersionCheck();
  return null;
}
