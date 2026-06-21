import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ToastAction, ToastInput, ToastTone } from "../../types/toast";

type ToastMessage = Required<Pick<ToastInput, "message">> & {
  id: number;
  tone: ToastTone;
  duration: number;
  action?: ToastInput["action"];
  isClosing: boolean;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const toastDurationMs = 3000;
const toastCloseMs = 180;
const maxToasts = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastsRef = useRef<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const timersRef = useRef(new Set<number>());

  const updateToasts = useCallback((updater: (current: ToastMessage[]) => ToastMessage[]) => {
    const nextToasts = updater(toastsRef.current);
    toastsRef.current = nextToasts;
    setToasts(nextToasts);
  }, []);

  const setTimer = useCallback((callback: () => void, delay: number) => {
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      callback();
    }, delay);
    timersRef.current.add(timerId);
  }, []);

  const closeToast = useCallback((id: number) => {
    const toast = toastsRef.current.find((current) => current.id === id);
    if (!toast || toast.isClosing) return;

    updateToasts((current) => current.map((item) => item.id === id ? { ...item, isClosing: true } : item));
    setTimer(() => updateToasts((current) => current.filter((item) => item.id !== id)), toastCloseMs);
  }, [setTimer, updateToasts]);

  const showToast = useCallback((input: ToastInput) => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    const toast: ToastMessage = {
      id,
      message: input.message,
      tone: input.tone ?? "common",
      duration: input.duration ?? toastDurationMs,
      action: input.action,
      isClosing: false,
    };
    const appendToast = () => {
      updateToasts((current) => [...current, toast]);
      setTimer(() => closeToast(id), toast.duration);
    };
    const openToasts = toastsRef.current.filter((current) => !current.isClosing);

    if (openToasts.length >= maxToasts) {
      closeToast(openToasts[0].id);
      setTimer(appendToast, toastCloseMs);
      return;
    }

    appendToast();
  }, [closeToast, setTimer, updateToasts]);

  useEffect(() => () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div className={`toast is-${toast.tone} ${toast.isClosing ? "is-closing" : ""}`} key={toast.id}>
              <span className="toast-message">{toast.message}</span>
              {toast.action && (isToastLinkAction(toast.action) ? (
                <Link className="toast-action" to={toast.action.href} onClick={() => closeToast(toast.id)}>{toast.action.label}</Link>
              ) : (
                <button className="toast-action" type="button" onClick={() => {
                  const action = toast.action;
                  if (!action || isToastLinkAction(action)) return;
                  action.onClick();
                  closeToast(toast.id);
                }}>
                  {toast.action.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function isToastLinkAction(action: ToastAction): action is Extract<ToastAction, { href: string }> {
  return "href" in action;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}
