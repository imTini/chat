import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => dismiss(), 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  const colors = {
    success: { bg: "var(--success)", icon: <CheckCircle size={14} /> },
    error: { bg: "var(--destructive)", icon: <XCircle size={14} /> },
    info: { bg: "var(--primary)", icon: <Info size={14} /> },
  };
  const c = colors[toast.type];

  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg text-sm cursor-pointer max-w-xs transition-all duration-200"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
      }}
      onClick={dismiss}
      role="status"
    >
      <span style={{ color: c.bg, flexShrink: 0 }}>{c.icon}</span>
      <span className="flex-1">{toast.message}</span>
      <button style={{ color: "var(--text-muted)", flexShrink: 0 }} onClick={dismiss}><X size={12} /></button>
    </div>
  );
}
