import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children, width = 480, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(23, 20, 15, 0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        ref={dialogRef}
        style={{
          position: "relative",
          background: "#FAF7F0",
          borderRadius: 6,
          boxShadow: "0 24px 80px rgba(23,20,15,0.25), 0 0 0 1px rgba(23,20,15,0.08)",
          width: "100%",
          maxWidth: width,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(23,20,15,0.08)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h2
              id="modal-title"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 400,
                color: "#17140F",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: 10, color: "#7A6F5E", marginTop: 3 }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              color: "#7A6F5E",
              padding: 4,
              borderRadius: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#17140F")}
            onMouseLeave={e => (e.currentTarget.style.color = "#7A6F5E")}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: "16px 20px",
          overflowY: "auto",
          flex: 1,
          scrollbarWidth: "none",
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: "12px 20px",
            borderTop: "1px solid rgba(23,20,15,0.08)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger = false }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={380}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              fontSize: 11,
              border: "1px solid rgba(23,20,15,0.15)",
              borderRadius: 4,
              background: "transparent",
              color: "#7A6F5E",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#EDE8DF"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              padding: "7px 16px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: 4,
              background: danger ? "#C0392B" : "#17140F",
              color: "#FAF7F0",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "#5A4E3C", lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7A6F5E", fontWeight: 500 }}>
        {label}{required && <span style={{ color: "#B8975A", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 11,
  border: "1px solid rgba(23,20,15,0.15)",
  borderRadius: 4,
  background: "#F5F2EC",
  color: "#17140F",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
};

export function Input({ style, onFocus, onBlur, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{ ...inputBase, ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = "#B8975A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(184,151,90,0.15)"; onFocus?.(e); }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(23,20,15,0.15)"; e.currentTarget.style.boxShadow = "none"; onBlur?.(e); }}
      {...props}
    />
  );
}

export function Textarea({ style, onFocus, onBlur, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      style={{ ...inputBase, resize: "vertical", minHeight: 70, fontFamily: "inherit", ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = "#B8975A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(184,151,90,0.15)"; onFocus?.(e); }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(23,20,15,0.15)"; e.currentTarget.style.boxShadow = "none"; onBlur?.(e); }}
      {...props}
    />
  );
}

export function Select({ style, onFocus, onBlur, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={{ ...inputBase, cursor: "pointer", ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = "#B8975A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(184,151,90,0.15)"; onFocus?.(e); }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(23,20,15,0.15)"; e.currentTarget.style.boxShadow = "none"; onBlur?.(e); }}
      {...props}
    />
  );
}

export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {children}
    </div>
  );
}

export function Btn({
  children, onClick, variant = "primary", type = "button", disabled, id,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  id?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "#17140F", color: "#FAF7F0", border: "none" },
    secondary: { background: "transparent", color: "#7A6F5E", border: "1px solid rgba(23,20,15,0.15)" },
    danger:    { background: "#C0392B", color: "#FAF7F0", border: "none" },
    ghost:     { background: "transparent", color: "#B8975A", border: "none" },
  };
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 16px",
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        ...styles[variant],
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}
