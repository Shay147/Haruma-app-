import { useState } from "react";
import { Lock, Loader2, Shield, KeyRound, AlertTriangle } from "lucide-react";
import {
  setupVault,
  unlockVault,
  vaultExists,
} from "@/lib/storage";
import type { VaultKey } from "@/lib/crypto";
import { useAuth } from "@/context/AuthContext";

export default function VaultUnlock({
  onUnlocked,
}: {
  onUnlocked: (key: VaultKey) => void;
}) {
  const { signOut, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<"loading" | "setup" | "unlock">("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // determine if vault already exists
  if (mode === "loading") {
    vaultExists()
      .then((exists) => setMode(exists ? "unlock" : "setup"))
      .catch(() => setMode("setup"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "setup") {
        if (password.length < 6) {
          setError("La contraseña maestra debe tener al menos 6 caracteres.");
          return;
        }
        if (password !== confirm) {
          setError("Las contraseñas no coinciden.");
          return;
        }
        const key = await setupVault(password);
        onUnlocked(key);
      } else {
        const key = await unlockVault(password);
        if (!key) {
          setError("Contraseña maestra incorrecta. Inténtalo de nuevo.");
          return;
        }
        onUnlocked(key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 grid place-items-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <KeyRound className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "setup" ? "Crea tu caja fuerte" : "Desbloquea tu caja fuerte"}
          </h1>
          <p className="text-sm text-zinc-500">
            {mode === "setup"
              ? "Define una contraseña maestra. Se usa para derivar tu clave de cifrado en este dispositivo."
              : "Introduce tu contraseña maestra para derivar la clave y descifrar tus archivos."}
          </p>
        </div>

        {mode === "setup" && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <span>
              Esta contraseña nunca se almacena ni se envía al servidor. Si la
              olvidas, tus archivos cifrados serán irrecuperables de forma
              permanente.
            </span>
          </div>
        )}

        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Contraseña maestra
              </span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </label>

            {mode === "setup" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Confirmar contraseña maestra
                </span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
              </label>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || mode === "loading"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "setup" ? "Crear y cifrar" : "Desbloquear"}
            </button>
          </div>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-zinc-600">
            <Shield className="h-3.5 w-3.5" />
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
