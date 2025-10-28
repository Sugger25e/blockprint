import React, { createContext, useContext, useMemo, useRef } from 'react';

const ViewerStateContext = createContext(null);

export function ViewerStateProvider({ children }) {
  // Use a ref-backed Map to avoid excessive re-renders on frequent camera changes
  const storeRef = useRef(new Map());

  const api = useMemo(() => ({
    getState(id) {
      if (id == null) return null;
      return storeRef.current.get(id) || null;
    },
    setState(id, state) {
      if (id == null || !state) return;
      storeRef.current.set(id, state);
    }
  }), []);

  return (
    <ViewerStateContext.Provider value={api}>{children}</ViewerStateContext.Provider>
  );
}

export function useViewerState() {
  const ctx = useContext(ViewerStateContext);
  if (!ctx) throw new Error('useViewerState must be used within ViewerStateProvider');
  return ctx;
}
