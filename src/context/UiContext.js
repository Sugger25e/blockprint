import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

// How long the exit animation runs (ms) - keep in sync with CSS
const TOAST_EXIT_MS = 220;

export function UiProvider({ children }) {
  // single toast at a time: { id, message, duration, closing }
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { message, resolve, okOnly }
  const hideTimerRef = useRef(null); // auto-hide timer
  const replaceTimerRef = useRef(null); // replace-wait timer when swapping toasts
  const pendingToastRef = useRef(null);

  function clearTimers() {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (replaceTimerRef.current) { clearTimeout(replaceTimerRef.current); replaceTimerRef.current = null; }
  }

  function scheduleAutoHide(t) {
    clearTimers();
    const duration = (t && t.duration) || 3200;
    hideTimerRef.current = setTimeout(() => {
      // start exit animation
      setToast(prev => prev ? { ...prev, closing: true } : null);
      // remove after exit
      replaceTimerRef.current = setTimeout(() => setToast(null), TOAST_EXIT_MS);
    }, duration);
  }

  function showToast(message, opts = {}) {
    const id = Date.now() + Math.random();
    // opts may be an object or a string/type shorthand
    const type = typeof opts === 'string' ? opts : (opts && opts.type) || undefined;
    const duration = (opts && opts.duration) || 3200;
    const t = { id, message, duration, closing: false, type };

    // If there's no current toast, show immediately
    if (!toast) {
      clearTimers();
      setToast(t);
      scheduleAutoHide(t);
      return;
    }

    // If a toast is visible, animate it out first, then show the new one
    // If already closing, just replace after the exit delay
    pendingToastRef.current = t;
    // trigger exit on current
    setToast(prev => prev ? { ...prev, closing: true } : null);
    // wait for exit animation, then show pending
    replaceTimerRef.current = setTimeout(() => {
      setToast(pendingToastRef.current);
      scheduleAutoHide(pendingToastRef.current);
      pendingToastRef.current = null;
    }, TOAST_EXIT_MS);
  }

  function confirm(message, opts = {}) {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve, okOnly: !!opts.okOnly });
    });
  }

  function handleConfirmResult(val) {
    try { confirmState?.resolve(val); } catch {};
    setConfirmState(null);
  }

  const toastValue = useMemo(() => ({ showToast }), [toast]);
  const confirmValue = useMemo(() => ({ confirm }), []);

  return (
    <ToastContext.Provider value={toastValue}>
      <ConfirmContext.Provider value={confirmValue}>
        {children}

        {/* Toast container - single toast (replace previous) */}
          {/* Toast container: center by default, but success toasts appear on the right side */}
          {(!toast || toast.type !== 'success') && (
            <div aria-live="polite" style={{ position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 2000 }}>
              <div style={{ width: 'min(920px, 92%)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                {toast && (
                  <div key={toast.id} className={`toast-item${toast.closing ? ' toast-exit' : ''}`} role="status" aria-live="polite" style={{ pointerEvents: 'auto', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', width: '100%', display: 'flex', justifyContent: 'center', fontSize: 14 }}>
                    {toast.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {toast && toast.type === 'success' && (
            <div aria-live="polite" style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pointerEvents: 'none', zIndex: 2000 }}>
              <div style={{ pointerEvents: 'auto', background: '#16a34a', color: 'white', border: '1px solid rgba(0,0,0,0.06)', padding: '10px 14px', borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', fontSize: 14 }} className={`toast-item${toast.closing ? ' toast-exit' : ''}`}>
                {toast.message}
              </div>
            </div>
          )}

        {/* Confirm dialog */}
        {confirmState && (
          <div role="dialog" aria-modal="true" className="modal-backdrop" style={{ zIndex: 2100 }}>
            <div className="modal confirm-pop" style={{ maxWidth: 540, width: '92%' }}>
              <div style={{ marginBottom: 12 }}>{confirmState.message}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {!confirmState.okOnly && (
                  <button className="btn" onClick={() => handleConfirmResult(false)}>Cancel</button>
                )}
                <button className="btn primary" onClick={() => handleConfirmResult(true)}>{confirmState.okOnly ? 'OK' : 'OK'}</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within UiProvider');
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within UiProvider');
  return ctx;
}

export default UiProvider;
