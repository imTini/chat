import { useState, useCallback } from "react";
import { fetchModels, loadModel, ModelInfo } from "../lib/api.js";

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setModels(await fetchModels());
    } catch {
      // ignore
    }
  }, []);

  const switchModel = useCallback(async (filename: string) => {
    setLoading(true);
    setError(null);
    try {
      await loadModel(filename);
      setModels((prev) =>
        prev.map((m) => ({ ...m, isLoaded: m.filename === filename }))
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const currentModel = models.find((m) => m.isLoaded) ?? null;

  return { models, loading, error, currentModel, load, switchModel };
}
