'use client';

// DuplicateProductDialog — POST /products/:id/duplicate.
// El duplicado nace INACTIVO y oculto de tienda y POS, con URL propia. No copia
// existencias, bonos ni cambios de precio programados; imágenes y precios solo
// si se piden (en kits de inscripción vienen marcados: contrato de kits §4.2,
// que además conserva posición, inscripción y cómo se surte).

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { productAdminErrorCode, productAdminErrorMessage } from './lib/errors';
import { isKitLikeType } from './lib/labels';
import { useDuplicateProduct } from './useProductsAdmin';

interface DuplicateSource {
  id: string;
  code: string;
  name: string;
  /** kit | pack | finished_good…: decide los valores por defecto y a qué sección se llega. */
  productType?: string | null;
  isEnrollmentKit?: boolean;
}

interface DuplicateProductDialogProps {
  source: DuplicateSource | null;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateProductDialog({ source, onOpenChange }: DuplicateProductDialogProps) {
  return (
    <Dialog open={!!source} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {source ? <DuplicateForm source={source} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

const CODE_RE = /^[A-Z0-9][A-Z0-9._-]*$/;

/** Se monta al abrir: el formulario siempre arranca limpio. */
function DuplicateForm({ source, onClose }: { source: DuplicateSource; onClose: () => void }) {
  const router = useRouter();
  const ids = useId();
  const duplicate = useDuplicateProduct(source.id);
  const kitLike = isKitLikeType(source.productType);
  const enrollmentKit = source.isEnrollmentKit === true;
  const [code, setCode] = useState('');
  const [name, setName] = useState(`${source.name} (copia)`.slice(0, 200));
  // Kits de inscripción: el API copia precios e imágenes por defecto; aquí se
  // refleja para que el diálogo diga la verdad y se pueda apagar.
  const [copyPrices, setCopyPrices] = useState(enrollmentKit);
  const [copyImages, setCopyImages] = useState(enrollmentKit);
  const [copyComponents, setCopyComponents] = useState(true);
  const [copyTaxes, setCopyTaxes] = useState(true);
  const [copyContent, setCopyContent] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);

  const trimmedCode = code.trim().toUpperCase();
  const liveCodeError =
    trimmedCode === ''
      ? null
      : trimmedCode === source.code.toUpperCase()
        ? 'La clave debe ser distinta a la del producto original.'
        : !CODE_RE.test(trimmedCode)
          ? 'Solo mayúsculas, números, punto, guion y guion bajo.'
          : null;
  const canSubmit = trimmedCode !== '' && !liveCodeError && name.trim() !== '' && !duplicate.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    setCodeError(null);
    try {
      const created = await duplicate.mutateAsync({
        code: trimmedCode,
        name: name.trim(),
        copyPrices,
        copyComponents,
        copyTaxes,
        copyContent,
        copyImages,
      });
      toast.success(
        kitLike
          ? `Kit duplicado como ${created.code}. Nace como borrador (inactivo, fuera del POS y de la inscripción en línea); sin bonos ni existencias.`
          : `Producto duplicado como ${created.code}. Está inactivo y oculto hasta que lo revises.`,
      );
      onClose();
      router.push(`/admin/productos/${created.id}/editar?seccion=${kitLike ? 'kit' : 'basica'}`);
    } catch (err) {
      if (productAdminErrorCode(err) === 'PRD_CODE_TAKEN') {
        setCodeError('Esa clave ya existe en otro producto.');
        return;
      }
      toast.error(productAdminErrorMessage(err, 'No se pudo duplicar el producto'));
    }
  };

  const options: { id: string; label: string; help: string; checked: boolean; set: (v: boolean) => void }[] = [
    { id: 'components', label: kitLike ? 'Copiar receta' : 'Copiar componentes', help: kitLike ? 'Receta global del kit (los renglones por país no se copian).' : 'Composición del paquete o kit.', checked: copyComponents, set: setCopyComponents },
    { id: 'taxes', label: 'Copiar datos fiscales', help: 'Claves SAT y reglas fiscales por país.', checked: copyTaxes, set: setCopyTaxes },
    { id: 'content', label: 'Copiar contenido', help: 'Descripciones, beneficios, ingredientes y traducciones.', checked: copyContent, set: setCopyContent },
    { id: 'prices', label: 'Copiar precios', help: 'Precios activos por país y tipo. Revísalos antes de activar el producto.', checked: copyPrices, set: setCopyPrices },
    { id: 'images', label: 'Copiar imágenes', help: 'Galería del producto original.', checked: copyImages, set: setCopyImages },
  ];

  const shownCodeError = codeError ?? liveCodeError;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{kitLike ? 'Duplicar kit' : 'Duplicar producto'}</DialogTitle>
        <DialogDescription>
          Se crea una copia de <strong>{source.name}</strong> ({source.code}). La copia nace inactiva (borrador) y fuera de
          la tienda, del POS y de la inscripción en línea.{' '}
          {kitLike
            ? 'Conserva la posición, si es de inscripción y cómo se surte. Nunca se copian bonos, existencias ni cambios de precio programados.'
            : 'No se copian existencias ni cambios de precio programados.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-code`}>Clave de la copia</Label>
        <Input
          id={`${ids}-code`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setCodeError(null);
          }}
          maxLength={50}
          className="font-mono"
          autoComplete="off"
          aria-required
          aria-invalid={!!shownCodeError}
          aria-describedby={shownCodeError ? `${ids}-code-error` : undefined}
        />
        {shownCodeError ? (
          <p id={`${ids}-code-error`} className="text-xs font-medium text-red-700" role="alert">
            {shownCodeError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-name`}>Nombre de la copia</Label>
        <Input
          id={`${ids}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          aria-required
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-900">Qué copiar</legend>
        {options.map((opt) => (
          <div key={opt.id} className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
            <div>
              <Label htmlFor={`${ids}-${opt.id}`} className="cursor-pointer">
                {opt.label}
              </Label>
              <p className="text-xs text-gray-600">{opt.help}</p>
            </div>
            <Switch id={`${ids}-${opt.id}`} checked={opt.checked} onCheckedChange={opt.set} />
          </div>
        ))}
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={duplicate.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit} aria-busy={duplicate.isPending}>
          {duplicate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {duplicate.isPending ? 'Duplicando…' : 'Duplicar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
