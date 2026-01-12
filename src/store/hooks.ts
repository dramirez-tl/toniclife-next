import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Hook tipado para dispatch
 * Usar en lugar de useDispatch directo
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Hook tipado para selector
 * Usar en lugar de useSelector directo
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
