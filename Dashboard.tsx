import { useEffect, useRef, useState } from "react";
import {
  Shield,
  LogOut,
  Lock,
  Upload,
  Loader2,
  Trash2,
  Eye,
  Search,
  Lock as LockIcon,
  AlertTriangle,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
} from "lucide-react";
import type { VaultKey } from "@/lib/crypto";
import {
  deleteFile,
  listFiles,
  uploadFile,
  type StoredFile,
} from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import {
  fileKind,
  formatBytes,
  formatDate,
  isAudio,
  isImage,
  isVideo,
} from "@/lib/format";
import FilePreview from "@/components/FilePreview";

type UploadProgress = {
  name: string;
  size: number;
  percent: number;
  status: "encrypting" | "uploading" | "done" | "error";
  error?: string;
};

function fileIcon(mime: string | null) {
  if (isImage(mime)) return ImageIcon;
  if (isVideo(mime)) return Video;
  if (isAudio(mime)) return Music;
  if (mime === "application/pdf") return FileText;
  if (mime && (mime.includes("zip") || mime.includes("compressed")))
    return Archive;
  return FileText;
}

export default function Dashboard({
  key_,
  onLock,
}: {
  key_: VaultKey;
  onLock: () => void;
}) {
  const { user, signOut } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [preview, setPreview] = useState<StoredFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StoredFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listFiles(key_.key);
      setFiles(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar archivos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(fileList: FileList) {
    setError(null);
    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      setUploads((u) => [
        ...u,
        { name: file.name, size: file.size, percent: 10, status: "encrypting" },
      ]);
      try {
        // simulate progress while encrypting + uploading (no real progress hook for storage.upload)
        const tick = setInterval(() => {
          setUploads((u) =>
            u.map((x) =>
              x.name === file.name && x.status === "encrypting"
                ? { ...x, percent: Math.min(x.percent + 8, 45) }
                : x,
            ),
          );
        }, 120);
        setUploads((u) =>
          u.map((x) =>
            x.name === file.name ? { ...x, status: "uploading", percent: 50 } : x,
          ),
        );
        await uploadFile(key_.key, file);
        clearInterval(tick);
        setUploads((u) =>
          u.map((x) =>
            x.name === file.name
              ? { ...x, status: "done", percent: 100 }
              : x,
          ),
        );
      } catch (e) {
        setUploads((u) =>
          u.map((x) =>
            x.name === file.name
              ? {
                  ...x,
                  status: "error",
                  error:
                    e instanceof Error ? e.message : "Error al subir",
                }
              : x,
          ),
        );
      }
    }
    // refresh list + prune completed uploads after a delay
    await refresh();
    setTimeout(() => {
      setUploads((u) => u.filter((x) => x.status !== "done"));
    }, 2500);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  async function confirmDeleteFile() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteFile(confirmDelete);
      setFiles((f) => f.filter((x) => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const imageCount = files.filter((f) => isImage(f.mime)).length;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-[#0a0a0b]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <Shield className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <span className="text-base font-semibold tracking-tight">Obscura</span>
            <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 sm:inline-flex">
              <LockIcon className="h-3 w-3" /> Caja fuerte desbloqueada
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onLock}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
            >
              <Lock className="h-3.5 w-3.5" /> Bloquear
            </button>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {/* stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <p className="text-xs text-zinc-500">Archivos cifrados</p>
            <p className="mt-1 text-2xl font-semibold">{files.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <p className="text-xs text-zinc-500">Espacio usado</p>
            <p className="mt-1 text-2xl font-semibold">{formatBytes(totalSize)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <p className="text-xs text-zinc-500">Fotos e imágenes</p>
            <p className="mt-1 text-2xl font-semibold">{imageCount}</p>
          </div>
        </div>

        {/* dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? "border-emerald-500/60 bg-emerald-500/5"
              : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 transition group-hover:ring-emerald-500/40">
            <Upload className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-zinc-200">
            Arrastra archivos aquí o haz clic para subir
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Se cifran en tu dispositivo con AES-GCM 256 antes de subirse
          </p>
        </div>

        {/* uploads in progress */}
        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploads.map((u, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-200">
                      {u.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {u.status === "encrypting" && "Cifrando…"}
                      {u.status === "uploading" && "Subiendo blob cifrado…"}
                      {u.status === "done" && "Subido y cifrado correctamente"}
                      {u.status === "error" && u.error}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.status === "done" && (
                      <span className="text-[11px] text-emerald-400">Listo</span>
                    )}
                    {u.status === "error" && (
                      <span className="text-[11px] text-red-400">Error</span>
                    )}
                    {(u.status === "encrypting" || u.status === "uploading") && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                    )}
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      u.status === "error" ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${u.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* toolbar */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            Tus archivos{" "}
            <span className="ml-1 text-xs font-normal text-zinc-500">
              ({filtered.length})
            </span>
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* file grid */}
        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Descifrando metadatos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <FileText className="h-7 w-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400">
              {query
                ? "Sin resultados para tu búsqueda."
                : "Tu caja fuerte está vacía. Sube tu primer archivo."}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((f) => {
              const Icon = fileIcon(f.mime);
              return (
                <div
                  key={f.id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/60"
                >
                  {/* encrypted badge */}
                  <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    <LockIcon className="h-2.5 w-2.5" /> Cifrado
                  </div>

                  <button
                    onClick={() => setPreview(f)}
                    className="block w-full text-left"
                  >
                    {/* thumbnail */}
                    <div className="mb-3 grid h-28 place-items-center overflow-hidden rounded-lg bg-zinc-950/50">
                      <Icon className="h-8 w-8 text-zinc-600" />
                    </div>
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {f.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{fileKind(f.mime)}</span>
                      <span className="h-1 w-1 rounded-full bg-zinc-700" />
                      <span>{formatBytes(f.size)}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {formatDate(f.createdAt)}
                    </p>
                  </button>

                  {/* actions */}
                  <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => setPreview(f)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-zinc-800"
                    >
                      <Eye className="h-3 w-3" /> Ver
                    </button>
                    <button
                      onClick={() => setConfirmDelete(f)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30"
                    >
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* preview modal */}
      {preview && (
        <FilePreview file={preview} key_={key_} onClose={() => setPreview(null)} />
      )}

      {/* delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                <Trash2 className="h-4.5 w-4.5 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Eliminar archivo
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Se eliminará permanentemente{" "}
              <span className="font-medium text-zinc-200">
                {confirmDelete.name}
              </span>{" "}
              y su blob cifrado. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={confirmDeleteFile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-400 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-zinc-900 px-5 py-6 text-center text-[11px] text-zinc-600">
        Cifrado AES-GCM 256 · PBKDF2 600k iteraciones · La clave nunca sale de tu
        dispositivo · {user?.email}
      </footer>
    </div>
  );
}
