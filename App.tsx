import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/screens/Landing";
import AuthScreen from "@/screens/AuthScreen";
import VaultUnlock from "@/screens/VaultUnlock";
import Dashboard from "@/screens/Dashboard";
import type { VaultKey } from "@/lib/crypto";
import { Loader2 } from "lucide-react";

function AppInner() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [vaultKey, setVaultKey] = useState<VaultKey | null>(null);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0b] text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    if (showAuth) return <AuthScreen />;
    return (
      <Landing
        onEnter={() => {
          setShowAuth(true);
        }}
      />
    );
  }

  // Signed in but vault locked
  if (!vaultKey) {
    return <VaultUnlock onUnlocked={(k) => setVaultKey(k)} />;
  }

  // Signed in + vault unlocked
  return (
    <Dashboard
      key_={vaultKey}
      onLock={() => {
        setVaultKey(null);
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
