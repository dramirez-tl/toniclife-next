'use client';

import { useEffect, useState } from 'react';
import {
  PHONE_COUNTRIES,
  parsePhone,
  toE164,
  onlyDigits,
  isValidLocalNumber,
  type PhoneCountry,
} from '@/lib/phone';

interface PhoneInputProps {
  /** Valor canónico E.164 ('+525512345678') o legacy; '' si vacío. */
  value?: string | null;
  /** Devuelve el E.164 normalizado ('' si el número está vacío). */
  onChange: (e164: string) => void;
  disabled?: boolean;
  className?: string;
  /** Muestra el contador/hint de longitud. Default true. */
  showHint?: boolean;
}

/**
 * Input de teléfono con select de lada por país + número local.
 * Guarda en E.164 sin espacios. Valida la longitud por país (MX/US = 10).
 */
export function PhoneInput({
  value,
  onChange,
  disabled,
  className = '',
  showHint = true,
}: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [country, setCountry] = useState<PhoneCountry>(parsed.country);
  const [number, setNumber] = useState<string>(parsed.number);

  // Sincroniza cuando el valor externo cambia (p. ej. al abrir un modal de
  // edición) sin pisar lo que el usuario está escribiendo. Además NORMALIZA
  // hacia arriba los valores legacy ('7442738206' sin lada): el input los
  // MOSTRABA bien (MX +52 | 10 dígitos) pero el form guardaba el crudo si no
  // se tocaba el campo, y el API (E.164 estricto) lo rechazaba aunque los
  // dígitos fueran correctos (caso real: editar distribuidor 1784011).
  useEffect(() => {
    if (toE164(country, number) !== (value || '')) {
      const p = parsePhone(value);
      setCountry(p.country);
      setNumber(p.number);
      const normalized = toE164(p.country, p.number);
      if ((value || '') !== normalized) {
        onChange(normalized);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (c: PhoneCountry, n: string) => onChange(toE164(c, n));

  const handleCountry = (code: string) => {
    const c = PHONE_COUNTRIES.find((x) => x.code === code) ?? country;
    setCountry(c);
    emit(c, number);
  };

  const handleNumber = (raw: string) => {
    const n = onlyDigits(raw).slice(0, country.digits);
    setNumber(n);
    emit(country, n);
  };

  const invalid = number.length > 0 && !isValidLocalNumber(country, number);

  const inputBase =
    'rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';
  const borderClass = invalid ? 'border-red-400' : 'border-input';

  return (
    <div className={className}>
      <div className="flex gap-2">
        <select
          value={country.code}
          onChange={(e) => handleCountry(e.target.value)}
          disabled={disabled}
          className={`${inputBase} border-input w-28 shrink-0`}
          aria-label="Lada"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} +{c.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={(e) => handleNumber(e.target.value)}
          disabled={disabled}
          placeholder={'0'.repeat(country.digits)}
          className={`${inputBase} ${borderClass} min-w-0 flex-1`}
          aria-invalid={invalid}
        />
      </div>
      {showHint && (
        <p className={`mt-1 text-[11px] ${invalid ? 'text-red-500' : 'text-muted-foreground'}`}>
          {invalid
            ? `${country.name}: deben ser ${country.digits} dígitos (${number.length}).`
            : `${country.name} · ${country.digits} dígitos`}
        </p>
      )}
    </div>
  );
}
