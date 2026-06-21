import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

// ─── Toast Context ────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "warning" | "error" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [{ ...toast, id }, ...prev].slice(0, 5));
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const toast = {
    success: (title: string, message?: string) => addToast({ variant: "success", title, message }),
    warning: (title: string, message?: string) => addToast({ variant: "warning", title, message }),
    error: (title: string, message?: string) => addToast({ variant: "error", title, message }),
    info: (title: string, message?: string) => addToast({ variant: "info", title, message }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

const TOAST_ICON: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={13} className="text-emerald-600" />,
  warning: <AlertTriangle size={13} className="text-amber-500" />,
  error:   <AlertTriangle size={13} className="text-red-500" />,
  info:    <Info size={13} className="text-sky-500" />,
};

const TOAST_BORDER: Record<ToastVariant, string> = {
  success: "border-l-emerald-400",
  warning: "border-l-amber-400",
  error:   "border-l-red-400",
  info:    "border-l-sky-400",
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role="alert"
      style={{
        pointerEvents: "all",
        background: "#FAF7F0",
        border: "1px solid rgba(23,20,15,0.1)",
        borderLeftWidth: 3,
        borderRadius: 4,
        padding: "10px 12px",
        minWidth: 280,
        maxWidth: 340,
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
      }}
      className={`border-l-[3px] ${TOAST_BORDER[toast.variant]}`}
    >
      <span style={{ marginTop: 1, flexShrink: 0 }}>{TOAST_ICON[toast.variant]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#17140F", lineHeight: 1.4 }}>{toast.title}</p>
        {toast.message && (
          <p style={{ fontSize: 10, color: "#7A6F5E", marginTop: 2, lineHeight: 1.4 }}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ color: "#7A6F5E", flexShrink: 0, marginTop: 1 }}
        className="hover:text-foreground transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  );
}
