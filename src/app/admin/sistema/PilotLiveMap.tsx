'use client';

// Mapa de sucursales del monitor del piloto (paralelo total: las 69 con
// coordenadas en BD). SOLO se importa con next/dynamic({ ssr: false }) —
// Leaflet toca window.
//
// CLUSTERING propio (sin plugin): con el zoom lejos las sucursales cercanas
// se agrupan en burbujas que muestran la SUMA de ventas del grupo y cuántas
// sucursales contiene; al acercar el zoom (o hacer clic en la burbuja) se van
// desagrupando hasta ver cada sucursal individual. Se hace a mano porque los
// wrappers de leaflet.markercluster pelean con react-leaflet 5/React 19 y
// porque queremos sumar ventas en la burbuja (el plugin solo cuenta pines).
// Algoritmo: rejilla de ~76px en coordenadas proyectadas del zoom actual —
// recalcula solo en zoomend (el paneo no cambia los grupos).

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PilotBranchLive } from '@/types/pilotLive';

// Fallback si no hay sucursales con coordenadas: república completa.
const MEXICO_CENTER: [number, number] = [23.3, -102.0];
const MEXICO_ZOOM = 5;
const CLUSTER_CELL_PX = 76; // tamaño de celda de agrupación (pixeles de pantalla)
const CLUSTER_MAX_ZOOM = 11; // desde este zoom ya no se agrupa: todo individual

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

function clusterIcon(branchCount: number, ventas: number): L.DivIcon {
  const active = ventas > 0;
  return L.divIcon({
    className: '',
    html: `
      <div class="pilot-cluster ${active ? 'pilot-cluster--active' : ''}" title="Clic para acercar">
        ${active ? '<span class="pilot-cluster__pulse"></span>' : ''}
        <span class="pilot-cluster__dot">${ventas}</span>
        <span class="pilot-cluster__label">${branchCount} suc.</span>
      </div>`,
    iconSize: [56, 70],
    iconAnchor: [28, 28],
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

function BranchMarker({ b }: { b: PilotBranchLive }) {
  return (
    <Marker position={[b.latitude!, b.longitude!]} icon={markerIcon(b)}>
      <Popup>
        <div className="min-w-[210px] text-sm">
          <p className="mb-0.5 font-semibold">
            {b.name}{' '}
            <span className="font-mono text-xs text-gray-500">({b.code})</span>
          </p>
          <p className="mb-2 text-xs text-gray-600">{b.address}</p>
          <p>
            Ventas del día: <strong>{b.salesCount}</strong> ·{' '}
            <strong>{money(b.salesTotal, b.currencyCode)}</strong>{' '}
            <span className="text-gray-500">({b.currencyCode ?? 'MXN'})</span>
          </p>
          {b.pendingCount > 0 && (
            <p className="text-amber-600">
              {b.pendingCount} pendiente(s) de cobro
            </p>
          )}
          <p className="text-xs text-gray-500">
            Última venta: {hora(b.lastSaleAt)}
          </p>
          <p className="mt-1 border-t pt-1 text-xs text-gray-600">
            🖥 {b.terminalsActive ?? 0} terminal(es)
            {b.terminalVersions ? ` · POS v${b.terminalVersions}` : ''}
            <br />
            Último latido: {hora(b.terminalsLastSeen ?? null)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

function ClusteredMarkers({ branches }: { branches: PilotBranchLive[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom() ?? MEXICO_ZOOM);
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const located = branches.filter(
    (b) => b.latitude != null && b.longitude != null,
  );

  // Zoom cercano: todo individual, sin agrupar.
  if (zoom >= CLUSTER_MAX_ZOOM) {
    return (
      <>
        {located.map((b) => (
          <BranchMarker key={b.id} b={b} />
        ))}
      </>
    );
  }

  // Rejilla en pixeles proyectados del zoom actual: misma celda = mismo grupo.
  const cells = new Map<string, PilotBranchLive[]>();
  for (const b of located) {
    const p = map.project([b.latitude!, b.longitude!], zoom);
    const key = `${Math.floor(p.x / CLUSTER_CELL_PX)}|${Math.floor(p.y / CLUSTER_CELL_PX)}`;
    const group = cells.get(key);
    if (group) group.push(b);
    else cells.set(key, [b]);
  }

  return (
    <>
      {[...cells.values()].map((group) => {
        if (group.length === 1) {
          return <BranchMarker key={group[0].id} b={group[0]} />;
        }
        const lat =
          group.reduce((s, g) => s + g.latitude!, 0) / group.length;
        const lng =
          group.reduce((s, g) => s + g.longitude!, 0) / group.length;
        const ventas = group.reduce((s, g) => s + g.salesCount, 0);
        return (
          <Marker
            key={group.map((g) => g.code).join('-')}
            position={[lat, lng]}
            icon={clusterIcon(group.length, ventas)}
            eventHandlers={{
              // Clic en la burbuja: acercar hasta que el grupo se abra.
              click: () => {
                const bounds = L.latLngBounds(
                  group.map((g) => [g.latitude!, g.longitude!] as [number, number]),
                );
                map.fitBounds(bounds.pad(0.5), {
                  padding: [40, 40],
                  maxZoom: Math.max(CLUSTER_MAX_ZOOM, zoom + 2),
                });
              },
            }}
          />
        );
      })}
    </>
  );
}

export default function PilotLiveMap({
  branches,
}: {
  branches: PilotBranchLive[];
}) {
  const located = branches.filter(
    (b) => b.latitude != null && b.longitude != null,
  );

  // Encuadre automático inicial: que se vean TODAS las sucursales con pin
  // (con margen); 1 pin = acercamiento a él; sin pines = vista de la república.
  const positions = located.map(
    (b) => [b.latitude!, b.longitude!] as [number, number],
  );
  const view =
    positions.length >= 2
      ? { bounds: L.latLngBounds(positions).pad(0.2) }
      : positions.length === 1
        ? { center: positions[0], zoom: 9 }
        : { center: MEXICO_CENTER, zoom: MEXICO_ZOOM };

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-lg border">
      {/* Estilos de pin y burbuja (Leaflet renderiza el HTML del DivIcon fuera
          del árbol de Tailwind, por eso van como CSS plano). */}
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
        .pilot-cluster { position: relative; width: 56px; height: 56px; cursor: pointer; }
        .pilot-cluster__dot {
          position: absolute; inset: 3px; border-radius: 9999px;
          background: #475569; color: #fff; font: 700 15px/50px sans-serif;
          text-align: center; border: 4px double #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,.4);
        }
        .pilot-cluster--active .pilot-cluster__dot { background: #15803d; }
        .pilot-cluster__pulse {
          position: absolute; inset: 0; border-radius: 9999px;
          background: rgba(22,163,74,.35); animation: pilot-pulse 1.8s ease-out infinite;
        }
        .pilot-cluster__label {
          position: absolute; top: 56px; left: 50%; transform: translateX(-50%);
          background: #1e293b; color: #fff; font: 600 10px/1 sans-serif;
          padding: 2px 7px; border-radius: 6px; white-space: nowrap;
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
        <ClusteredMarkers branches={branches} />
      </MapContainer>
    </div>
  );
}
