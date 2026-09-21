'use client';

// ProductMediaSection — imágenes + ficha técnica PDF. Envoltorio que usan el
// editor de kits (/admin/kits/[id]) y la ficha de producto: toda la lógica vive
// en ProductImagesManager y ProductDocumentsManager (orden, alt, confirmación
// al borrar, avisos de peso/tamaño).

import { Card, CardContent } from '@/components/ui/card';
import { ProductDocumentsManager } from './ProductDocumentsManager';
import { ProductImagesManager } from './ProductImagesManager';

interface ProductMediaSectionProps {
  productId: string;
  /** Sugerencia para el texto alternativo de las imágenes. */
  productName?: string;
  readOnly?: boolean;
  onWrite?: () => void;
}

export function ProductMediaSection({ productId, productName = '', readOnly = false, onWrite }: ProductMediaSectionProps) {
  return (
    <div className="space-y-6">
      <Card className="p-0">
        <CardContent className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Imágenes del producto</h2>
          <ProductImagesManager
            productId={productId}
            productName={productName}
            readOnly={readOnly}
            onWrite={onWrite}
          />
        </CardContent>
      </Card>
      <Card className="p-0">
        <CardContent className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Ficha técnica (PDF)</h2>
          <ProductDocumentsManager productId={productId} readOnly={readOnly} />
        </CardContent>
      </Card>
    </div>
  );
}
