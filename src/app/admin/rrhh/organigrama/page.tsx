'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useManageDepartments } from '@/hooks/useHR';
import { useUsers } from '@/hooks/useUsers';
import type { Department } from '@/types/hr';
import type { User } from '@/types/user';

export default function OrganigramaPage() {
  const { data: departments, isLoading: deptLoading } = useManageDepartments(false);
  const { data: usersData, isLoading: usersLoading } = useUsers({
    userType: 'colaborador',
    limit: 100,
    page: 1,
  });

  const colaboradores = usersData?.data ?? [];

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

  // Agrupar departamentos por jefe (un jefe puede encabezar varios).
  const groups = useMemo(() => {
    const byHead = new Map<string, { headName: string | null; depts: Department[] }>();
    for (const d of departments ?? []) {
      const key = d.headUserId ?? '__none__';
      const g = byHead.get(key) ?? { headName: d.headName ?? null, depts: [] };
      g.depts.push(d);
      byHead.set(key, g);
    }
    // Jefes primero (alfabético), "Sin jefe" al final.
    return Array.from(byHead.entries())
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => {
        if (a.key === '__none__') return 1;
        if (b.key === '__none__') return -1;
        return (a.headName ?? '').localeCompare(b.headName ?? '');
      });
  }, [departments]);

  const isLoading = deptLoading || usersLoading;

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organigrama</h1>
          <p className="text-gray-600">Jefes, departamentos y equipos</p>
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
        <div className="space-y-8">
          {groups.map((g) => (
            <div key={g.key}>
              {/* Nodo del jefe */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3E667D] text-white">
                  <UserCircleIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">
                    {g.key === '__none__' ? 'Sin jefe asignado' : g.headName || 'Jefe'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {g.depts.length} departamento{g.depts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Departamentos del jefe */}
              <div className="ml-5 border-l-2 border-gray-200 pl-6">
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
                                <li key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                  {m.firstName} {m.lastName}
                                  <span className="text-xs text-gray-400">· {m.role?.name}</span>
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
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BuildingOffice2Icon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-gray-600">
                  No hay departamentos. Crea departamentos y asigna jefes para ver el organigrama.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
