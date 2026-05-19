import type { ReactNode } from "react";
import { useApp } from "@/contexts/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const { sidebarCollapsed, commandPaletteOpen, setCommandPaletteOpen } = useApp();

  return (
    <div
      className="flex h-full"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar />
      <main
        className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-200"
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>
      {commandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}
    </div>
  );
}
