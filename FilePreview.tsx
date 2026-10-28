import { useEffect, useState } from "react";
import { Loader2, X, Download, FileText } from "lucide-react";
import type { StoredFile } from "@/lib/storage";
import { downloadFile } from "@/lib/storage";
import type { VaultKey } from "@/lib/crypto";
import { isImage, isVideo, isAudio, formatBytes } from "@/lib/format";

export default function FilePreview({
  file,
  key_,
  onClose,
}: {
  file: StoredFile;
  key_: VaultKey;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    setLoading(true);
    setError(null);
    downloadFile(key_.key, file)
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        revoke = u;
        setUrl(u);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al descargar"))
      .finally(() => setLoading(false));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [file, key_]);

  async function handleDownload() {
    try {
      const blob = await downloadFile(key_.key, file);
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al descargar");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">{file.name}</p>
            <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" /> Descargar
            </button>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid max-h-[70vh] place-items-center overflow-auto rounded-xl border border-zinc-900 bg-black/40 p-2">
          {loading && (
            <div className="flex items-center gap-2 py-20 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Descifrando en tu
              dispositivo…
            </div>
          )}
          {error && <p className="py-20 text-sm text-red-400">{error}</p>}
          {!loading && !error && url && isImage(file.mime) && (
            <img src={url} alt={file.name} className="max-h-[65vh] rounded-lg" />
          )}
          {!loading && !error && url && isVideo(file.mime) && (
            <video src={url} controls className="max-h-[65vh] rounded-lg" />
          )}
          {!loading && !error && url && isAudio(file.mime) && (
            <audio src={url} controls />
          )}
          {!loading && !error && url &&
            !isImage(file.mime) &&
            !isVideo(file.mime) &&
            !isAudio(file.mime) && (
              <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
                <FileText className="h-10 w-10" />
                <p className="text-sm">Sin vista previa disponible</p>
                <p className="text-xs text-zinc-600">
                  Usa el botón Descargar para abrir el archivo.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
