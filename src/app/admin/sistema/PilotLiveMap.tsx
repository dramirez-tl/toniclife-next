'use client';

// Mapa de la república con las sucursales de la prueba piloto.
// SOLO se importa con next/dynamic({ ssr: false }) — Leaflet toca window.

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PilotBranchLive } from '@/types/pilotLive';

// Fallback si no hay sucursales con coordenadas: república completa.
const MEXICO_CENTER: [number, number] = [23.3, -102.0];
const MEXICO_ZOOM = 5;

function markerIcon(branch: PilotBranchLive): L.DivIcon {
  const active = branch.salesCount > 0;
  return L.divIcon({
    className: '',
    html: `
      <div class="pilot-pin ${active ? 'pilot-pin--active' : ''}">
        ${active ? '<span class="pilot-pin__pulse"></span>' : ''}
        <span class="pilot-pin__dot">${branch.salesCount}</span>
        <span class="pilot-pin__label">${branch.code}</span>
      </div>`,
    iconSize: [44, 56],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
  });
}

const money = (n: number, currency: string | null) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
  }).format(n);

const hora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Mexico_City',
      })
    : '—';

export default function PilotLiveMap({
  branches,
}: {
  branches: PilotBranchLive[];
}) {
  const located = branches.filter(
    (b) => b.latitude != null && b.longitude != null,
  );

  // Encuadre automático: el mapa abre ajustado para que se vean SOLO los
  // pines de las sucursales piloto (con margen); 1 pin = acercamiento a él;
  // sin pines = vista de la república.
  const positions = located.map(
    (b) => [b.latitude!, b.longitude!] as [number, number],
  );
  const view =
    positions.length >= 2
      ? { bounds: L.latLngBounds(positions).pad(0.35) }
      : positions.length === 1
        ? { center: positions[0], zoom: 9 }
        : { center: MEXICO_CENTER, zoom: MEXICO_ZOOM };

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-lg border">
      {/* Estilos del pin (Leaflet renderiza el HTML del DivIcon fuera del
          árbol de Tailwind, por eso van como CSS plano). */}
      <style>{`
        .pilot-pin { position: relative; width: 44px; height: 44px; }
        .pilot-pin__dot {
          position: absolute; inset: 4px; border-radius: 9999px;
          background: #64748b; color: #fff; font: 700 13px/36px sans-serif;
          text-align: center; border: 3px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,.35);
        }
        .pilot-pin--active .pilot-pin__dot { background: #16a34a; }
        .pilot-pin__pulse {
          position: absolute; inset: 0; border-radius: 9999px;
          background: rgba(22,163,74,.45); animation: pilot-pulse 1.6s ease-out infinite;
        }
        .pilot-pin__label {
          position: absolute; top: 44px; left: 50%; transform: translateX(-50%);
          background: #1e293b; color: #fff; font: 600 10px/1 sans-serif;
          padding: 2px 6px; border-radius: 6px; white-space: nowrap;
        }
        @keyframes pilot-pulse {
          0% { transform: scale(.6); opacity: .9; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
      <MapContainer {...view} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((b) => (
          <Marker
            key={b.id}
            position={[b.latitude!, b.longitude!]}
            icon={markerIcon(b)}
          >
            <Popup>
              <div className="min-w-[210px] text-sm">
                <p className="mb-0.5 font-semibold">
                  {b.name}{' '}
                  <span className="font-mono text-xs text-gray-500">
                    ({b.code})
                  </span>
                </p>
                <p className="mb-2 text-xs text-gray-600">{b.address}</p>
                <p>
                  Ventas hoy: <strong>{b.salesCount}</strong> ·{' '}
                  <strong>{money(b.salesTotal, b.currencyCode)}</strong>
                </p>
                {b.pendingCount > 0 && (
                  <p className="text-amber-600">
                    {b.pendingCount} pendiente(s) de cobro
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Última venta: {hora(b.lastSaleAt)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
