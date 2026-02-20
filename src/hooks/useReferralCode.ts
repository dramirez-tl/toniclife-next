/**
 * Hook para capturar y persistir códigos de referido desde la URL
 *
 * Permite a los distribuidores compartir enlaces de tienda como:
 * - https://toniclife.com?ref=TL-MX-00234
 * - https://toniclife.com/productos?ref=TL-MX-00234
 *
 * El código se guarda en localStorage y se usa automáticamente en el checkout
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const REFERRAL_CODE_KEY = 'toniclife_referral_code';
const REFERRAL_EXPIRY_KEY = 'toniclife_referral_expiry';
const REFERRAL_DURATION_DAYS = 30; // El código expira después de 30 días

export interface ReferralCodeState {
  code: string | null;
  isFromUrl: boolean;
}

/**
 * Hook para gestionar el código de referido
 * - Captura el código de la URL (?ref=CODIGO)
 * - Lo persiste en localStorage con expiración
 * - Permite limpiarlo manualmente
 */
export function useReferralCode() {
  const searchParams = useSearchParams();
  const [referralState, setReferralState] = useState<ReferralCodeState>({
    code: null,
    isFromUrl: false,
  });

  // Verificar si el código ha expirado
  const isCodeExpired = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;

    const expiryStr = localStorage.getItem(REFERRAL_EXPIRY_KEY);
    if (!expiryStr) return true;

    const expiry = new Date(expiryStr);
    return new Date() > expiry;
  }, []);

  // Guardar código en localStorage con fecha de expiración
  const saveCode = useCallback((code: string) => {
    if (typeof window === 'undefined') return;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + REFERRAL_DURATION_DAYS);

    localStorage.setItem(REFERRAL_CODE_KEY, code);
    localStorage.setItem(REFERRAL_EXPIRY_KEY, expiry.toISOString());
  }, []);

  // Obtener código de localStorage
  const getStoredCode = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;

    if (isCodeExpired()) {
      // Limpiar código expirado
      localStorage.removeItem(REFERRAL_CODE_KEY);
      localStorage.removeItem(REFERRAL_EXPIRY_KEY);
      return null;
    }

    return localStorage.getItem(REFERRAL_CODE_KEY);
  }, [isCodeExpired]);

  // Limpiar código manualmente
  const clearCode = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(REFERRAL_CODE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    setReferralState({ code: null, isFromUrl: false });
  }, []);

  // Efecto para capturar código de URL o localStorage
  useEffect(() => {
    // Primero verificar si hay código en la URL
    const urlCode = searchParams.get('ref') || searchParams.get('referral');

    if (urlCode) {
      // Código nuevo en URL - guardarlo y usarlo
      saveCode(urlCode);
      setReferralState({ code: urlCode, isFromUrl: true });
      return;
    }

    // Si no hay en URL, intentar obtener de localStorage
    const storedCode = getStoredCode();
    if (storedCode) {
      setReferralState({ code: storedCode, isFromUrl: false });
    }
  }, [searchParams, saveCode, getStoredCode]);

  return {
    referralCode: referralState.code,
    isFromUrl: referralState.isFromUrl,
    clearCode,
    setCode: saveCode,
  };
}

/**
 * Función utilitaria para obtener el código de referido sin usar el hook
 * Útil para usar fuera de componentes React
 */
export function getReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  const expiryStr = localStorage.getItem(REFERRAL_EXPIRY_KEY);
  if (!expiryStr) return null;

  const expiry = new Date(expiryStr);
  if (new Date() > expiry) {
    localStorage.removeItem(REFERRAL_CODE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    return null;
  }

  return localStorage.getItem(REFERRAL_CODE_KEY);
}
