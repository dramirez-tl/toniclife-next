'use client';

import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { initializeAuth } from './slices/authSlice';

function AuthInitializer() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    store.dispatch(initializeAuth());
  }, []);
  return null;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer />
      {children}
    </Provider>
  );
}
