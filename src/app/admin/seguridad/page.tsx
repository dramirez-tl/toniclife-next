'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SeguridadPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/seguridad/roles');
  }, [router]);

  return null;
}
