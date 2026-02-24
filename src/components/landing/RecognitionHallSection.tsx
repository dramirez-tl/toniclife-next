'use client';

import Link from 'next/link';
import { Badge, Button, Card } from '@/components/ui';
import {
  TrophyIcon,
  FireIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  AcademicCapIcon,
  ArrowUpCircleIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';

const topSales = [
  {
    id: 'sales-1',
    name: 'Mariana López',
    location: 'Monterrey, NL',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&fit=crop',
    metric: '$128,450 MXN',
    label: 'Ventas del mes',
  },
  {
    id: 'sales-2',
    name: 'Daniel Ortiz',
    location: 'Guadalajara, JAL',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop',
    metric: '$112,980 MXN',
    label: 'Ventas del mes',
  },
  {
    id: 'sales-3',
    name: 'Laura Mendoza',
    location: 'CDMX',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&h=240&fit=crop',
    metric: '$98,220 MXN',
    label: 'Ventas del mes',
  },
];

const topRecruiters = [
  {
    id: 'rec-1',
    name: 'Ricardo Flores',
    location: 'Puebla, PUE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&fit=crop',
    metric: '18 nuevos distribuidores',
    label: 'Reclutamiento del mes',
  },
  {
    id: 'rec-2',
    name: 'Fernanda Cruz',
    location: 'Querétaro, QRO',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=240&h=240&fit=crop',
    metric: '15 nuevos distribuidores',
    label: 'Reclutamiento del mes',
  },
  {
    id: 'rec-3',
    name: 'Jorge Salas',
    location: 'León, GTO',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=240&h=240&fit=crop',
    metric: '13 nuevos distribuidores',
    label: 'Reclutamiento del mes',
  },
];

const fifthStudyAchievers = [
  { id: 'study-1', name: 'Paola Ramírez', zone: 'Mérida, YUC', achievement: '5to estudio completado' },
  { id: 'study-2', name: 'Iván Aguirre', zone: 'Tijuana, BC', achievement: '5to estudio completado' },
  { id: 'study-3', name: 'Silvia Torres', zone: 'CDMX', achievement: '5to estudio completado' },
];

const newRangeAchievers = [
  { id: 'range-1', name: 'Alejandro Vega', zone: 'Aguascalientes, AGS', achievement: 'Nuevo rango: Plata' },
  { id: 'range-2', name: 'Mónica Peña', zone: 'Toluca, EDOMEX', achievement: 'Nuevo rango: Oro' },
  { id: 'range-3', name: 'Héctor Ríos', zone: 'Veracruz, VER', achievement: 'Nuevo rango: Platino' },
];

function RankingCard({
  rank,
  name,
  location,
  avatar,
  metric,
  label,
}: {
  rank: number;
  name: string;
  location: string;
  avatar: string;
  metric: string;
  label: string;
}) {
  return (
    <Card className="border-gray-100 bg-white/90 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={avatar}
            alt={name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow"
            loading="lazy"
          />
          <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#003B7A] text-xs font-bold text-white">
            {rank}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#003B7A]">{name}</p>
          <p className="text-xs text-gray-500">{location}</p>
          <p className="mt-1 text-sm font-medium text-[#7AB82E]">{metric}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function AchievementList({
  title,
  icon,
  items,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; name: string; zone: string; achievement: string }[];
  accent: string;
}) {
  return (
    <Card className="border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className={`rounded-xl p-2 ${accent}`}>{icon}</div>
        <h3 className="text-lg font-bold text-[#003B7A]">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            <p className="font-semibold text-[#003B7A]">{item.name}</p>
            <p className="text-xs text-gray-500">{item.zone}</p>
            <p className="mt-1 text-sm font-medium text-[#7AB82E]">{item.achievement}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function RecognitionHallSection() {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <Badge variant="warning" size="lg" className="mb-4">
            <span className="inline-flex items-center gap-1.5">
              <TrophyIcon className="h-4 w-4" />
              Paseo de la Fama
            </span>
          </Badge>
          <h2 className="text-3xl font-bold text-[#003B7A] sm:text-4xl lg:text-5xl">
            Reconocimientos del Mes
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
            El reconocimiento público impulsa a toda la comunidad. Aquí destacamos a quienes
            lideran los KPIs clave del negocio en México.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-[#003B7A]/10 bg-white p-6 shadow-sm lg:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-[#003B7A]/10 p-2">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-[#003B7A]" />
                </div>
                <h3 className="text-xl font-bold text-[#003B7A]">Top Ventas</h3>
              </div>
              <span className="rounded-full bg-[#003B7A]/10 px-3 py-1 text-xs font-medium text-[#003B7A]">
                Mes actual
              </span>
            </div>
            <div className="space-y-3">
              {topSales.map((person, index) => (
                <RankingCard
                  key={person.id}
                  rank={index + 1}
                  name={person.name}
                  location={person.location}
                  avatar={person.avatar}
                  metric={person.metric}
                  label={person.label}
                />
              ))}
            </div>
          </Card>

          <Card className="border-[#7AB82E]/20 bg-white p-6 shadow-sm lg:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-[#7AB82E]/15 p-2">
                  <UserGroupIcon className="h-5 w-5 text-[#7AB82E]" />
                </div>
                <h3 className="text-xl font-bold text-[#003B7A]">Top Reclutadores</h3>
              </div>
              <span className="rounded-full bg-[#7AB82E]/15 px-3 py-1 text-xs font-medium text-[#2E6E0F]">
                Mes actual
              </span>
            </div>
            <div className="space-y-3">
              {topRecruiters.map((person, index) => (
                <RankingCard
                  key={person.id}
                  rank={index + 1}
                  name={person.name}
                  location={person.location}
                  avatar={person.avatar}
                  metric={person.metric}
                  label={person.label}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AchievementList
            title="Quienes lograron 5to Estudio"
            icon={<AcademicCapIcon className="h-5 w-5 text-[#003B7A]" />}
            items={fifthStudyAchievers}
            accent="bg-[#003B7A]/10"
          />
          <AchievementList
            title="Nuevos Rangos del Mes"
            icon={<ArrowUpCircleIcon className="h-5 w-5 text-[#7AB82E]" />}
            items={newRangeAchievers}
            accent="bg-[#7AB82E]/15"
          />
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-[#003B7A]/20 bg-[#003B7A]/5 p-5 text-center">
          <p className="mx-auto max-w-3xl text-sm text-[#003B7A]/85">
            <span className="font-semibold">Versión demo con información estática.</span>{' '}
            Después conectaremos estos bloques a datos reales por periodo para mostrar rankings
            oficiales y alimentar también el futuro módulo “Mi Top para Reconocimientos”.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/distribuidores">
              <Button size="lg" rightIcon={<FireIcon className="h-5 w-5" />}>
                Ver comunidad de distribuidores
              </Button>
            </Link>
            <Button variant="outline" size="lg" rightIcon={<MegaphoneIcon className="h-5 w-5" />}>
              Compartir reconocimientos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

