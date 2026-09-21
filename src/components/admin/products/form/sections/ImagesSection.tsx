'use client';

// (6) Imágenes y ficha técnica.

import { ProductDocumentsManager } from '../../ProductDocumentsManager';
import { ProductImagesManager } from '../../ProductImagesManager';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

export function ImagesSection() {
  const { productId, product, readOnly, notifyWrite } = useProductForm();
  return (
    <div className="space-y-6">
      <SectionCard
        title="Imágenes"
        description="Cada cambio se guarda al momento: subir, ordenar, marcar principal, texto alternativo y borrar."
      >
        <ProductImagesManager
          productId={productId}
          productName={product?.name ?? ''}
          readOnly={readOnly}
          onWrite={notifyWrite}
        />
      </SectionCard>
      <SectionCard title="Ficha técnica (PDF)">
        <ProductDocumentsManager productId={productId} readOnly={readOnly} />
      </SectionCard>
    </div>
  );
}
