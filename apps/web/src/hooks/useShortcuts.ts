import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

export function useShortcuts() {
  const navigate = useNavigate();
  const { setCommandPaletteOpen } = useApp();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        navigate("/");
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate, setCommandPaletteOpen]);
}
