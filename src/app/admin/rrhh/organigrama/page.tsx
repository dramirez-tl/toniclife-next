'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  UsersIcon,
  GlobeAmericasIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useManageDepartments, useOrgDirectors, useSetOrgDirector } from '@/hooks/useHR';
import { useUsers } from '@/hooks/useUsers';
import type { Department } from '@/types/hr';
import type { User } from '@/types/user';

const NO_COUNTRY = '__none__';

export default function OrganigramaPage() {
  const { data: departments, isLoading: deptLoading } = useManageDepartments(false);
  const { data: directors, isLoading: dirLoading } = useOrgDirectors();
  const { data: usersData, isLoading: usersLoading } = useUsers({
    userType: 'colaborador',
    limit: 100,
    page: 1,
  });
  const setDirector = useSetOrgDirector();

  const colaboradores = usersData?.data ?? [];

  // Colaboradores como opciones para el Director General.
  const colaboradorOptions = useMemo(
    () =>
      colaboradores.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`.trim(),
      })),
    [colaboradores],
  );

  // Miembros por departamento.
  const membersByDept = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const u of colaboradores) {
      if (!u.departmentId) continue;
      const arr = map.get(u.departmentId) ?? [];
      arr.push(u);
      map.set(u.departmentId, arr);
    }
    return map;
  }, [colaboradores]);

  // Departamentos por país.
  const deptsByCountry = useMemo(() => {
    const map = new Map<string, Department[]>();
    for (const d of departments ?? []) {
      const key = d.countryId ?? NO_COUNTRY;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [departments]);

  // Grupos de país: un grupo por país activo (con su DG) + "Sin país" si hay
  // departamentos sin país.
  const groups = useMemo(() => {
    const out: {
      countryId: string;
      countryName: string;
      directorUserId: string | null;
      directorName: string | null;
      depts: Department[];
    }[] = [];
    for (const c of directors ?? []) {
      out.push({
        countryId: c.countryId,
        countryName: c.countryName,
        directorUserId: c.directorUserId,
        directorName: c.directorName,
        depts: deptsByCountry.get(c.countryId) ?? [],
      });
    }
    const noCountry = deptsByCountry.get(NO_COUNTRY) ?? [];
    if (noCountry.length > 0) {
      out.push({
        countryId: NO_COUNTRY,
        countryName: 'Sin país',
        directorUserId: null,
        directorName: null,
        depts: noCountry,
      });
    }
    return out;
  }, [directors, deptsByCountry]);

  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [draftDirector, setDraftDirector] = useState('');

  const startEdit = (countryId: string, current: string | null) => {
    setEditingCountryId(countryId);
    setDraftDirector(current ?? '');
  };

  const saveDirector = async (countryId: string) => {
    try {
      await setDirector.mutateAsync({ countryId, userId: draftDirector || null });
      toast.success('Director General actualizado');
      setEditingCountryId(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar el Director General');
    }
  };

  const isLoading = deptLoading || usersLoading || dirLoading;

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organigrama</h1>
          <p className="text-gray-600">Directores Generales, jefes, departamentos y equipos</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/rrhh/departamentos">
            <Button variant="secondary">Departamentos</Button>
          </Link>
          <Link href="/admin/rrhh">
            <Button variant="secondary">Volver a RRHH</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => {
            const isCountry = g.countryId !== NO_COUNTRY;
            const isEditing = editingCountryId === g.countryId;
            return (
              <div key={g.countryId}>
                {/* Nodo del país + Director General */}
                <div className="mb-4 rounded-xl border border-gray-200 bg-gradient-to-r from-[#3E667D] to-[#0A4B94] p-4 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                        <GlobeAmericasIcon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{g.countryName}</p>
                        <p className="text-xs text-white/70">
                          {g.depts.length} departamento{g.depts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Director General del país */}
                    {isCountry && (
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <div className="w-64">
                              <SearchableSelect
                                options={colaboradorOptions}
                                value={draftDirector}
                                onChange={setDraftDirector}
                                showAllOption
                                allValue=""
                                allLabel="Sin Director General"
                                placeholder="Selecciona colaborador"
                                className="w-full bg-white text-gray-900"
                              />
                            </div>
                            <button
                              onClick={() => saveDirector(g.countryId)}
                              disabled={setDirector.isPending}
                              className="rounded-lg bg-white/20 p-2 hover:bg-white/30 disabled:opacity-50"
                              title="Guardar"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setEditingCountryId(null)}
                              className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
                              title="Cancelar"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(g.countryId, g.directorUserId)}
                            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-left transition-colors hover:bg-white/20"
                            title="Asignar Director General"
                          >
                            <UserCircleIcon className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-white/60">
                                Director General
                              </p>
                              <p className="text-sm font-semibold">
                                {g.directorName || 'Sin asignar'}
                              </p>
                            </div>
                            <PencilIcon className="ml-1 h-4 w-4 text-white/70" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Departamentos del país */}
                <div className="ml-5 border-l-2 border-gray-200 pl-6">
                  {g.depts.length === 0 ? (
                    <p className="py-2 text-sm text-gray-400">
                      Sin departamentos en este país. Asigna el país a un departamento en{' '}
                      <Link href="/admin/rrhh/departamentos" className="text-[#3E667D] underline">
                        Departamentos
                      </Link>
                      .
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {g.depts.map((d) => {
                        const members = membersByDept.get(d.id) ?? [];
                        return (
                          <Card key={d.id} className="border-gray-200">
                            <CardContent className="p-4">
                              <div className="mb-2 flex items-center gap-2">
                                <BuildingOffice2Icon className="h-5 w-5 text-[#3E667D]" />
                                <p className="font-semibold text-gray-900">{d.name}</p>
                              </div>
                              {d.headName && (
                                <p className="mb-1 text-xs text-gray-500">
                                  Jefe: <span className="text-gray-700">{d.headName}</span>
                                </p>
                              )}
                              {d.subheadName && (
                                <p className="mb-2 text-xs text-gray-500">
                                  Subjefe: <span className="text-gray-700">{d.subheadName}</span>
                                </p>
                              )}
                              <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                                <UsersIcon className="h-3.5 w-3.5" />
                                {members.length} miembro{members.length !== 1 ? 's' : ''}
                              </div>
                              {members.length > 0 ? (
                                <ul className="mt-1 space-y-1">
                                  {members.map((m) => (
                                    <li
                                      key={m.id}
                                      className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                      {m.firstName} {m.lastName}
                                      <span className="text-xs text-gray-400">
                                        · {m.role?.name}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-xs text-gray-400">Sin miembros</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {groups.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BuildingOffice2Icon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-gray-600">
                  No hay países activos ni departamentos. Crea departamentos, asígnales país y
                  nombra a su Director General.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
