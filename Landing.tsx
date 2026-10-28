import { Shield, Lock, Eye, Server, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[100px]" />

      {/* nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Obscura</span>
        </div>
        <button
          onClick={onEnter}
          className="group inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white"
        >
          {user ? "Abrir mi caja fuerte" : "Empezar"}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </header>

      {/* hero */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 text-center md:pt-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-zinc-400 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Cifrado AES-GCM 256 · Zero-Knowledge
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
          Tu nube, privada de
          <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            {" "}
            extremo a extremo
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Almacenamiento cifrado en tu dispositivo antes de subir nada. Ni
          nosotros, ni nadie, puede ver tus archivos sin tu contraseña maestra.
          La soberanía de tus datos, garantizada por diseño.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onEnter}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            {user ? "Ir a mi caja fuerte" : "Crear cuenta gratis"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
          >
            Cómo funciona
          </a>
        </div>

        {/* feature grid */}
        <div id="how" className="mt-24 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Lock,
              title: "Cifrado en tu dispositivo",
              desc: "AES-GCM 256 bits. El archivo se cifra en el navegador antes de salir de tu equipo.",
            },
            {
              icon: Eye,
              title: "Cero conocimiento",
              desc: "La clave se deriva de tu contraseña maestra y nunca se envía al servidor.",
            },
            {
              icon: Server,
              title: "Solo bloques ilegibles",
              desc: "El servidor almacena únicamente datos binarios cifrados. Sin metadatos legibles.",
            },
            {
              icon: Shield,
              title: "Soberanía de datos",
              desc: "Tú controlas la clave. Sin contraseña, el contenido es matemáticamente inaccesible.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 backdrop-blur transition hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 transition group-hover:ring-emerald-500/40">
                <f.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-zinc-900 px-6 py-8 text-center text-xs text-zinc-600">
        Obscura · Almacenamiento de conocimiento cero. Tus datos, tu control.
      </footer>
    </div>
  );
}
