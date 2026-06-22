'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui';
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/utils';
import {
  useManageDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/useHR';
import type { Department } from '@/types/hr';

export default function DepartamentosPage() {
  const { data: departments, isLoading } = useManageDepartments(true);
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ code: '', name: '' });

  const rows = departments ?? [];
  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((d) => d.isActive).length,
      inactive: rows.filter((d) => !d.isActive).length,
    }),
    [rows],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '' });
    setModalOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ code: d.code, name: d.name });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    try {
      if (editing) {
        await updateDept.mutateAsync({ id: editing.id, data: { code: form.code, name: form.name } });
        toast.success('Departamento actualizado');
      } else {
        await createDept.mutateAsync({ code: form.code, name: form.name });
        toast.success('Departamento creado');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al guardar el departamento');
    }
  };

  const toggleActive = async (d: Department) => {
    try {
      await updateDept.mutateAsync({ id: d.id, data: { isActive: !d.isActive } });
      toast.success(d.isActive ? 'Departamento desactivado' : 'Departamento activado');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cambiar el estado');
    }
  };

  const handleDelete = async (d: Department) => {
    const inUse = (d.userCount ?? 0) + (d.employeeCount ?? 0);
    if (inUse > 0) {
      toast.error(`No se puede eliminar: ${inUse} asignación(es). Desactívalo en su lugar.`);
      return;
    }
    const ok = await confirmAction(`¿Eliminar el departamento "${d.name}"?`);
    if (!ok) return;
    try {
      await deleteDept.mutateAsync(d.id);
      toast.success('Departamento eliminado');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al eliminar');
    }
  };

  const columns: DataTableColumn<Department>[] = [
    {
      key: 'name',
      header: 'Departamento',
      sortable: true,
      sortValue: (d) => d.name,
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3E667D]/10">
            <BuildingOffice2Icon className="h-4 w-4 text-[#3E667D]" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{d.name}</p>
            <code className="text-xs text-gray-400">{d.code}</code>
          </div>
        </div>
      ),
    },
    {
      key: 'userCount',
      header: 'Usuarios',
      sortable: true,
      sortValue: (d) => d.userCount ?? 0,
      render: (d) => <span className="text-sm text-gray-700">{d.userCount ?? 0}</span>,
    },
    {
      key: 'employeeCount',
      header: 'Empleados',
      sortable: true,
      sortValue: (d) => d.employeeCount ?? 0,
      render: (d) => <span className="text-sm text-gray-700">{d.employeeCount ?? 0}</span>,
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (d) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            d.isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${d.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {d.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(d)}
            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleActive(d)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            title={d.isActive ? 'Desactivar' : 'Activar'}
          >
            {d.isActive ? (
              <XCircleIcon className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            )}
          </button>
          <button
            onClick={() => handleDelete(d)}
            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-30"
            title="Eliminar"
            disabled={(d.userCount ?? 0) + (d.employeeCount ?? 0) > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
          <p className="text-gray-600">Catálogo de áreas del corporativo</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/rrhh">
            <Button variant="secondary">Volver a RRHH</Button>
          </Link>
          <Button variant="default" onClick={openCreate}>
            <PlusIcon className="h-5 w-5" />
            Nuevo Departamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Activos', value: stats.active },
          { label: 'Inactivos', value: stats.inactive },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          <DataTable<Department>
            columns={columns}
            data={rows}
            isLoading={isLoading}
            getRowKey={(d) => d.id}
            emptyState={
              <div className="py-12 text-center">
                <BuildingOffice2Icon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <h3 className="mb-2 text-lg font-bold text-gray-900">No hay departamentos</h3>
                <p className="text-gray-600">Crea el primer departamento.</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Editar Departamento' : 'Nuevo Departamento'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="MARKETING"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono uppercase focus:border-transparent focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Marketing"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={createDept.isPending || updateDept.isPending}
              >
                {createDept.isPending || updateDept.isPending
                  ? 'Guardando...'
                  : editing
                    ? 'Guardar'
                    : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
