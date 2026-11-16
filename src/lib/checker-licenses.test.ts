import { describe, expect, it } from 'vitest';
import {
  checkerAppVersion,
  checkerDeviceLabel,
  checkerLastSeenText,
  checkerLicenseState,
  checkerLicenseSummary,
  maskCheckerKey,
  sortCheckerLicenses,
} from './checker-licenses';

const NOW = Date.parse('2026-11-16T18:00:00.000Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

describe('licencias de checadores', () => {
  it('estado: cancelada, sin activar, en línea o sin señal', () => {
    expect(checkerLicenseState({ status: 'revoked', lastSeenAt: ago(1) }, NOW)).toBe('revoked');
    expect(checkerLicenseState({ status: 'inactive' }, NOW)).toBe('unused');
    expect(checkerLicenseState({ status: 'active', lastSeenAt: ago(1) }, NOW)).toBe('online');
    expect(checkerLicenseState({ status: 'active', lastSeenAt: ago(3) }, NOW)).toBe('online');
    expect(checkerLicenseState({ status: 'active', lastSeenAt: ago(4) }, NOW)).toBe('silent');
    expect(checkerLicenseState({ status: 'active' }, NOW)).toBe('silent');
    expect(checkerLicenseState({ status: 'active', lastSeenAt: 'no es fecha' }, NOW)).toBe('silent');
  });

  it('la clave se muestra con solo el primer y el último bloque', () => {
    expect(maskCheckerKey('TONC-AB12-CD34-7K2M')).toBe('TONC-••••-••••-7K2M');
    expect(maskCheckerKey('')).toBe('');
    expect(maskCheckerKey(undefined)).toBe('');
    expect(maskCheckerKey('SINGUIONES')).toBe('••••');
  });

  it('tableta y versión de la app', () => {
    expect(checkerDeviceLabel({ hostname: 'motorola moto g15', osPlatform: 'android', osRelease: '15' })).toBe(
      'motorola moto g15 · Android 15',
    );
    expect(checkerDeviceLabel({ cpuModel: 'Tab A9' })).toBe('Tab A9');
    expect(checkerDeviceLabel(undefined)).toBe('');
    expect(checkerAppVersion('checador-1.0.0')).toBe('1.0.0');
    expect(checkerAppVersion('2.3.0')).toBe('2.3.0');
    expect(checkerAppVersion(undefined)).toBe('');
  });

  it('hace cuánto se le vio', () => {
    expect(checkerLastSeenText(undefined, NOW)).toBe('');
    expect(checkerLastSeenText(ago(0), NOW)).toBe('hace un momento');
    expect(checkerLastSeenText(ago(5), NOW)).toBe('hace 5 min');
    expect(checkerLastSeenText(ago(60 * 3), NOW)).toBe('hace 3 h');
    expect(checkerLastSeenText(ago(60 * 24), NOW)).toBe('hace 1 día');
    expect(checkerLastSeenText(ago(60 * 24 * 5), NOW)).toBe('hace 5 días');
  });

  it('resumen y orden: primero las que no dan señal', () => {
    const list = [
      { status: 'revoked' as const, label: 'Vieja', branchName: 'Corporativo' },
      { status: 'inactive' as const, label: 'Nueva', branchName: 'Corporativo' },
      { status: 'active' as const, lastSeenAt: ago(1), label: 'Recepción', branchName: 'Corporativo' },
      { status: 'active' as const, lastSeenAt: ago(90), label: 'Comedor', branchName: 'Corporativo' },
    ];
    expect(checkerLicenseSummary(list, NOW)).toEqual({ total: 4, online: 1, silent: 1, unused: 1, revoked: 1 });
    expect(sortCheckerLicenses(list, NOW).map((l) => l.label)).toEqual(['Comedor', 'Recepción', 'Nueva', 'Vieja']);
    expect(checkerLicenseSummary(undefined, NOW).total).toBe(0);
  });
});
