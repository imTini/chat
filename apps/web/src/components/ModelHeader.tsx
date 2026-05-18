import { useState, useRef, useEffect } from "react";
import type { ModelInfo } from "../lib/api";

interface Props {
  models: ModelInfo[];
  loading: boolean;
  onLoad: (filename: string) => void;
}

export function ModelHeader({ models, loading, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.isLoaded);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="model-header" ref={ref}>
      <button
        className="model-selector-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        title="Switch model"
      >
        <span className="model-icon">⬡</span>
        <span className="model-name-label">
          {loading ? "Loading model…" : (current?.name ?? current?.filename ?? "No model")}
        </span>
        {current && (
          <span className="model-meta">
            {current.architecture !== "unknown" && (
              <span className="badge arch">{current.architecture}</span>
            )}
            {current.capabilities.vision && <span className="badge vision">Vision</span>}
            {current.parameterCount && (
              <span className="badge params">{current.parameterCount} params</span>
            )}
            {current.sizeMB > 0 && (
              <span className="badge size">{current.sizeMB} MB</span>
            )}
          </span>
        )}
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="model-dropdown">
          <div className="model-dropdown-title">Available models</div>
          <div className="model-list-scroll">
            {models.length === 0 && (
              <div className="model-empty">No models found in /models</div>
            )}
            {models.map((m) => (
              <button
                key={m.filename}
                className={`model-item ${m.isLoaded ? "loaded" : ""}`}
                onClick={() => {
                  if (!m.isLoaded) {
                    onLoad(m.filename);
                    setOpen(false);
                  }
                }}
                disabled={m.isLoaded || loading}
              >
                <div className="model-item-top">
                  <span className="model-item-name">{m.name || m.filename}</span>
                  {m.isLoaded && <span className="loaded-dot" title="Currently loaded" />}
                </div>
                <div className="model-item-meta">
                  {m.architecture !== "unknown" && (
                    <span className="badge arch">{m.architecture}</span>
                  )}
                  {m.capabilities.vision && <span className="badge vision">Vision</span>}
                  {m.parameterCount && (
                    <span className="badge params">{m.parameterCount} params</span>
                  )}
                  {m.contextLength && (
                    <span className="badge ctx">{(m.contextLength / 1000).toFixed(0)}k ctx</span>
                  )}
                  <span className="badge size">{m.sizeMB} MB</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
