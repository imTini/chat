import { Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { ChatPage } from "@/pages/ChatPage";
import { Toast } from "@/components/Toast";

function AppShell() {
  const { user, authLoading, login, toasts, dismissToast } = useApp();

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
        </Routes>
      </Layout>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

