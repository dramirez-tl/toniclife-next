// kit-branch-choice.store.ts — sucursal elegida para VER existencias de un kit
// en la ficha (sección Inventario › Disponibilidad y sección Componentes).
// Se comparte entre ambas secciones y se recuerda por navegador (comodidad,
// nada de negocio): el `persist` cae en silencio si localStorage no está.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KitBranchChoiceState {
  branchId: string;
  setBranchId: (branchId: string) => void;
}

export const useKitBranchChoice = create<KitBranchChoiceState>()(
  persist(
    (set) => ({
      branchId: '',
      setBranchId: (branchId) => set({ branchId }),
    }),
    { name: 'tl_admin_kit_branch' },
  ),
);
