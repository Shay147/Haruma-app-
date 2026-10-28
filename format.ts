export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

export function isVideo(mime: string | null): boolean {
  return !!mime && mime.startsWith("video/");
}

export function isAudio(mime: string | null): boolean {
  return !!mime && mime.startsWith("audio/");
}

export function fileKind(mime: string | null): string {
  if (!mime) return "Archivo";
  if (mime.startsWith("image/")) return "Imagen";
  if (mime.startsWith("video/")) return "Vídeo";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("zip") || mime.includes("compressed")) return "Comprimido";
  if (mime.startsWith("text/")) return "Texto";
  return "Archivo";
}
