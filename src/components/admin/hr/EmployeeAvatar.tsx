'use client';

// Miniatura del colaborador: foto del gafete (URL firmada de GCS, 15 min) o
// las iniciales dibujadas en local.
//
// Antes el módulo pedía los avatares a https://ui-avatars.com (un tercero, con
// el nombre del empleado en la URL); las iniciales se arman aquí y no salen
// datos de la empresa a internet.

import { useState } from 'react';
import { employeeInitials } from '@/types/hr';

interface EmployeeAvatarProps {
  photoUrl?: string | null;
  name: string;
  /**
   * Iniciales ya calculadas (el organigrama las trae del API, que salta las
   * partículas: "Ángel de Jesús Rangel" → "ÁJ"). Sin esto se arman aquí con
   * los dos primeros tokens del nombre, que en nombres compuestos falla.
   */
  initials?: string | null;
  /** Lado en px (es un cuadrado redondeado). */
  size?: number;
  className?: string;
}

export function EmployeeAvatar({
  photoUrl,
  name,
  initials,
  size = 40,
  className = '',
}: EmployeeAvatarProps) {
  // Se recuerda CUÁL url falló (no un booleano): si la URL firmada se renueva
  // se vuelve a intentar sola, sin un efecto que resetee el estado.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = !!photoUrl && failedUrl === photoUrl;

  const style = { width: size, height: size };

  if (!photoUrl || failed) {
    return (
      <div
        style={style}
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#C8DDF2] text-[#2f5165] ${className}`}
        title={name}
      >
        <span className="text-xs font-semibold" style={{ fontSize: Math.max(10, size / 3) }}>
          {initials?.trim() || employeeInitials(name)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      style={style}
      onError={() => setFailedUrl(photoUrl)}
      className={`shrink-0 rounded-full border border-border object-cover ${className}`}
    />
  );
}
