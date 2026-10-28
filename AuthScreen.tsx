import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shield, Loader2, Lock, Mail } from "lucide-react";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") await signUp(email, password);
      else await signIn(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      if (msg.toLowerCase().includes("already registered"))
        setError("Ya existe una cuenta con ese correo. Inicia sesión.");
      else if (msg.toLowerCase().includes("invalid login"))
        setError("Correo o contraseña incorrectos.");
      else setError(msg);
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
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Obscura</h1>
          <p className="text-sm text-zinc-500">
            {mode === "signup"
              ? "Crea tu cuenta para empezar a cifrar y guardar archivos."
              : "Bienvenido de vuelta. Inicia sesión para acceder a tu caja fuerte."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Correo electrónico
              </span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Contraseña de cuenta
              </span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-zinc-500">
            {mode === "signup" ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
              className="font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              {mode === "signup" ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </form>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-600">
          Tu contraseña de cuenta autentica la sesión. La contraseña maestra de
          tu caja fuerte se usará después y nunca se almacena.
        </p>
      </div>
    </div>
  );
}
