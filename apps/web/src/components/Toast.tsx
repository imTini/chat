import { useEffect, useRef, useState } from "react";

export interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    setExiting(true);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 250);
  };

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, 3200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`toast toast-${toast.type}${exiting ? " toast-exit" : ""}`}
      onClick={dismiss}
      role="status"
    >
      <span className="toast-icon">
        {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
      </span>
      {toast.message}
    </div>
  );
}
