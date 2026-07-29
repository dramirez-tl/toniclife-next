'use client';

// Categorías de activos de TI + editor de la PLANTILLA de características.
// Lo que se defina aquí es lo que pedirá el formulario de alta de un equipo:
// agregar un campo o una categoría nueva NO requiere tocar código.

import { useState } from 'react';
import { toast } from 'sonner';
import { Squares2X2Icon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Loader2, GripVertical, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmAction } from '@/lib/utils';
import {
  useAssetCategories,
  useCreateAssetCategory,
  useDeleteAssetCategory,
  useUpdateAssetCategory,
} from '@/hooks/useAssets';
import type { AssetCategory, SpecFieldDef, SpecFieldType } from '@/types/asset';

const FIELD_TYPES: { value: SpecFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista de opciones' },
  { value: 'boolean', label: 'Sí / No' },
  { value: 'date', label: 'Fecha' },
];

interface FormState {
  code: string;
  name: string;
  description: string;
  parentId: string;
  defaultUsefulLifeMonths: string;
  requiresSerial: boolean;
  isBulk: boolean;
  isActive: boolean;
  specTemplate: SpecFieldDef[];
}

const EMPTY: FormState = {
  code: '',
  name: '',
  description: '',
  parentId: '',
  defaultUsefulLifeMonths: '',
  requiresSerial: true,
  isBulk: false,
  isActive: true,
  specTemplate: [],
};

export default function CategoriasActivosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: categories = [], isLoading } = useAssetCategories({ includeInactive: 'true' });
  const createMutation = useCreateAssetCategory();
  const updateMutation = useUpdateAssetCategory();
  const deleteMutation = useDeleteAssetCategory();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const groups = categories.filter((c) => !c.parentId);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (c: AssetCategory) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description ?? '',
      parentId: c.parentId ?? '',
      defaultUsefulLifeMonths:
        c.defaultUsefulLifeMonths !== null ? String(c.defaultUsefulLifeMonths) : '',
      requiresSerial: c.requiresSerial,
      isBulk: c.isBulk,
      isActive: c.isActive,
      specTemplate: c.specTemplate ?? [],
    });
    setModalOpen(true);
  };

  // ---------- Editor de la plantilla ----------

  const addField = () =>
    set({
      specTemplate: [
        ...form.specTemplate,
        { key: '', label: '', type: 'text', order: form.specTemplate.length + 1 },
      ],
    });

  const updateField = (index: number, patch: Partial<SpecFieldDef>) =>
    set({
      specTemplate: form.specTemplate.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    });

  const removeField = (index: number) =>
    set({ specTemplate: form.specTemplate.filter((_, i) => i !== index) });

  const moveField = (index: number, dir: -1 | 1) => {
    const next = [...form.specTemplate];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set({ specTemplate: next.map((f, i) => ({ ...f, order: i + 1 })) });
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('El código y el nombre son obligatorios');
      return;
    }
    // El backend valida igual, pero avisamos antes de mandar.
    const seen = new Set<string>();
    for (const [i, f] of form.specTemplate.entries()) {
      const key = f.key.trim();
      if (!key) {
        toast.error(`El campo #${i + 1} de la plantilla no tiene clave`);
        return;
      }
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) {
        toast.error(
          `La clave "${key}" no es válida: minúsculas, números y guion bajo, empezando por letra`,
        );
        return;
      }
      if (seen.has(key)) {
        toast.error(`La clave "${key}" está repetida`);
        return;
      }
      seen.add(key);
      if (f.type === 'select' && !(f.options ?? []).filter(Boolean).length) {
        toast.error(`El campo "${f.label || key}" es de tipo lista y no tiene opciones`);
        return;
      }
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId || null,
      defaultUsefulLifeMonths: form.defaultUsefulLifeMonths
        ? Number(form.defaultUsefulLifeMonths)
        : null,
      requiresSerial: form.requiresSerial,
      isBulk: form.isBulk,
      isActive: form.isActive,
      specTemplate: form.specTemplate.map((f, i) => ({
        ...f,
        key: f.key.trim(),
        label: f.label.trim() || f.key.trim(),
        order: i + 1,
        options: f.type === 'select' ? (f.options ?? []).filter(Boolean) : undefined,
      })),
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, dto: payload });
        toast.success('Categoría actualizada');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Categoría creada');
      }
      setModalOpen(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar la categoría');
    }
  };

  const handleDelete = async (c: AssetCategory) => {
    const ok = await confirmAction(`¿Eliminar la categoría "${c.name}"?`);
    if (!ok) return;
    try {
      const result = await deleteMutation.mutateAsync(c.id);
      toast.success(result.message);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const columns: DataTableColumn<AssetCategory>[] = [
    {
      key: 'name',
      header: 'Categoría',
      sortable: true,
      sortValue: (c) => `${c.parentName ?? ''}${c.name}`,
      render: (c) => (
        <div>
          <p className="text-sm font-medium">
            {c.parentName ? (
              <span className="text-muted-foreground">{c.parentName} › </span>
            ) : null}
            {c.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
        </div>
      ),
    },
    {
      key: 'specs',
      header: 'Características',
      render: (c) => (
        <span className="text-sm">
          {c.specTemplate.length > 0 ? `${c.specTemplate.length} campo(s)` : '—'}
        </span>
      ),
    },
    {
      key: 'life',
      header: 'Vida útil',
      render: (c) => (
        <span className="text-sm">
          {c.defaultUsefulLifeMonths ? `${c.defaultUsefulLifeMonths} meses` : '—'}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Opciones',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.requiresSerial ? <Badge variant="outline">Con serie</Badge> : null}
          {c.isBulk ? <Badge variant="info">A granel</Badge> : null}
          {!c.isActive ? <Badge variant="secondary">Inactiva</Badge> : null}
        </div>
      ),
    },
    {
      key: 'assets',
      header: 'Equipos',
      sortable: true,
      sortValue: (c) => c.assetCount,
      render: (c) => <span className="text-sm tabular-nums">{c.assetCount}</span>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleDelete(c)}>
            <TrashIcon className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <Squares2X2Icon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Categorías de activos</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Define qué características técnicas pide cada tipo de equipo
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{categories.length} categorías</h2>
              <Button onClick={openNew}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Nueva categoría
              </Button>
            </div>
            <DataTable
              columns={columns}
              data={categories}
              isLoading={isLoading}
              getRowKey={(c) => c.id}
              minWidthClassName="min-w-[840px]"
              emptyMessage="No hay categorías registradas."
            />
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.name}` : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Las características que definas aquí son las que pedirá el alta de equipos de esta
              categoría.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Código *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                  className="font-mono uppercase"
                  maxLength={40}
                  placeholder="LAPTOP"
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  maxLength={100}
                  placeholder="Laptop"
                />
              </div>
              <div className="grid gap-2">
                <Label>Grupo</Label>
                <SearchableSelect
                  options={groups
                    .filter((g) => g.id !== editing?.id)
                    .map((g) => ({ value: g.id, label: g.name }))}
                  value={form.parentId}
                  onChange={(v) => set({ parentId: v })}
                  allLabel="Sin grupo (es un grupo)"
                  allValue=""
                />
              </div>
              <div className="grid gap-2">
                <Label>Vida útil sugerida (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultUsefulLifeMonths}
                  onChange={(e) => set({ defaultUsefulLifeMonths: e.target.value })}
                  placeholder="36"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires-serial"
                  checked={form.requiresSerial}
                  onCheckedChange={(c) => set({ requiresSerial: c === true })}
                />
                <Label htmlFor="requires-serial">Normalmente trae número de serie</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-bulk"
                  checked={form.isBulk}
                  onCheckedChange={(c) => set({ isBulk: c === true })}
                />
                <Label htmlFor="is-bulk">Se lleva por cantidad (no se etiqueta por pieza)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-active"
                  checked={form.isActive}
                  onCheckedChange={(c) => set({ isActive: c === true })}
                />
                <Label htmlFor="is-active">Activa</Label>
              </div>
            </div>

            {/* Plantilla de características */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Características técnicas</h3>
                  <p className="text-xs text-muted-foreground">
                    Ej. para una laptop: RAM, procesador, almacenamiento, gráficos.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Agregar campo
                </Button>
              </div>

              {form.specTemplate.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Sin características. Categorías como &quot;Mouse&quot; o &quot;Cable&quot; casi no
                  necesitan.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.specTemplate.map((field, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end"
                    >
                      <div className="flex flex-col gap-1 pb-1">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => moveField(i, -1)}
                          disabled={i === 0}
                          aria-label="Subir"
                        >
                          ▲
                        </button>
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => moveField(i, 1)}
                          disabled={i === form.specTemplate.length - 1}
                          aria-label="Bajar"
                        >
                          ▼
                        </button>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Clave</Label>
                        <Input
                          value={field.key}
                          onChange={(e) =>
                            updateField(i, {
                              key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                            })
                          }
                          className="font-mono text-xs"
                          placeholder="ram_gb"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Etiqueta</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          placeholder="RAM"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Tipo</Label>
                        <SearchableSelect
                          options={FIELD_TYPES}
                          value={field.type}
                          onChange={(v) =>
                            updateField(i, {
                              type: v as SpecFieldType,
                              options: v === 'select' ? (field.options ?? ['']) : undefined,
                            })
                          }
                          showAllOption={false}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(i)}
                        aria-label="Quitar campo"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>

                      <div className="sm:col-span-5 sm:grid sm:grid-cols-3 sm:gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Unidad (opcional)</Label>
                          <Input
                            value={field.unit ?? ''}
                            onChange={(e) => updateField(i, { unit: e.target.value })}
                            placeholder="GB"
                          />
                        </div>
                        {field.type === 'select' && (
                          <div className="grid gap-1 sm:col-span-2">
                            <Label className="text-xs">Opciones (separadas por coma)</Label>
                            <Input
                              value={(field.options ?? []).join(', ')}
                              onChange={(e) =>
                                updateField(i, {
                                  options: e.target.value.split(',').map((o) => o.trim()),
                                })
                              }
                              placeholder="HDD, SSD, NVMe"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-5">
                          <Checkbox
                            id={`req-${i}`}
                            checked={field.required === true}
                            onCheckedChange={(c) => updateField(i, { required: c === true })}
                          />
                          <Label htmlFor={`req-${i}`} className="text-xs">
                            Obligatorio
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
