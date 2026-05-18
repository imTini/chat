import { useState, useRef, useEffect } from "react";
import type { ModelCapabilities, ModelInfo } from "../lib/api";

interface Props {
  models: ModelInfo[];
  loading: boolean;
  onLoad: (filename: string) => void;
}

const CAPABILITY_BADGE_META: Record<keyof ModelCapabilities, { label: string; className: string }> = {
  vision: { label: "Vision", className: "vision" },
  imageGeneration: { label: "Image Gen", className: "image-generation" },
  embedding: { label: "Embedding", className: "embedding" },
};

function renderCapabilityBadges(capabilities: ModelCapabilities) {
  return (Object.entries(capabilities) as Array<[keyof ModelCapabilities, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([capability]) => {
      const meta = CAPABILITY_BADGE_META[capability];
      return (
        <span key={capability} className={`badge ${meta.className}`}>
          {meta.label}
        </span>
      );
    });
}

export function ModelHeader({ models, loading, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.isLoaded);

  // Clear switching state when loading finishes
  useEffect(() => {
    if (!loading && switching) {
      setSwitching(null);
      setOpen(false);
    }
  }, [loading, switching]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (loading) return; // keep open while loading
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [loading]);

  return (
    <div className="model-header" ref={ref}>
      <button
        className={`model-selector-btn${loading ? " loading" : ""}`}
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={false}
        title="Switch model"
      >
        {loading ? (
          <span className="spinner" />
        ) : (
          <span className="model-icon">⬡</span>
        )}
        <span className="model-name-label">
          {loading
            ? `Loading ${switching ? (models.find((m) => m.filename === switching)?.name ?? switching) : "model"}…`
            : (current?.name ?? current?.filename ?? "No model")}
        </span>
        {!loading && current && (
          <span className="model-meta">
            {current.architecture !== "unknown" && (
              <span className="badge arch">{current.architecture}</span>
            )}
            {renderCapabilityBadges(current.capabilities)}
            {current.parameterCount && (
              <span className="badge params">{current.parameterCount} params</span>
            )}
            {current.sizeMB > 0 && (
              <span className="badge size">{current.sizeMB} MB</span>
            )}
          </span>
        )}
        {!loading && <span className="chevron">{open ? "▲" : "▼"}</span>}
      </button>

      {open && (
        <div className="model-dropdown">
          <div className="model-dropdown-title">Available models</div>
          <div className="model-list-scroll">
            {models.length === 0 && (
              <div className="model-empty">No models found in /models</div>
            )}
            {models.map((m) => {
              const isSwitching = switching === m.filename;
              return (
                <button
                  key={m.filename}
                  className={`model-item${m.isLoaded ? " loaded" : ""}${isSwitching ? " switching" : ""}`}
                  onClick={() => {
                    if (!m.isLoaded && !loading) {
                      setSwitching(m.filename);
                      onLoad(m.filename);
                    }
                  }}
                  disabled={m.isLoaded || (loading && !isSwitching)}
                >
                  <div className="model-item-top">
                    <span className="model-item-name">{m.name || m.filename}</span>
                    {m.isLoaded && !isSwitching && (
                      <span className="loaded-dot" title="Currently loaded" />
                    )}
                    {isSwitching && <span className="spinner sm" />}
                  </div>
                  <div className="model-item-meta">
                  {m.architecture !== "unknown" && (
                    <span className="badge arch">{m.architecture}</span>
                  )}
                  {renderCapabilityBadges(m.capabilities)}
                  {m.parameterCount && (
                    <span className="badge params">{m.parameterCount} params</span>
                  )}
                    {m.contextLength && (
                      <span className="badge ctx">{(m.contextLength / 1000).toFixed(0)}k ctx</span>
                    )}
                    <span className="badge size">{m.sizeMB} MB</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
