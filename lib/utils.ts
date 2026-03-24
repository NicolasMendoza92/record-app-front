import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── descarga de archivos ───────────────────────────────────────────────────
 
/**
 * Descarga una string como archivo en el browser.
 * @param contenido  Texto a guardar
 * @param nombreArchivo  Nombre con extensión, ej: "acta_entrevista.md"
 * @param tipo  MIME type. Por defecto text/markdown.
 */
export function descargarArchivo(
  contenido: string,
  nombreArchivo: string,
  tipo = "text/markdown; charset=utf-8"
): void {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
 
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
 
  // limpieza
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
 
// ── formato de tamaño ──────────────────────────────────────────────────────
 
/**
 * Convierte bytes a string legible: "1.4 MB", "320 KB", etc.
 */
export function formatearBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_024 ** 3) return `${(bytes / 1_024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1_024 ** 3).toFixed(1)} GB`;
}
 
// ── nombre del acta ────────────────────────────────────────────────────────
 
/**
 * Genera el nombre del archivo .md para descargar.
 * Ej: "entrevista Juan.mp3" → "acta_entrevista_Juan_2025-01-15.md"
 */
export function nombreActa(nombreArchivoAudio: string): string {
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const base = nombreArchivoAudio
    .replace(/\.[^.]+$/, "")          // saca la extensión
    .replace(/[^a-zA-Z0-9_\-áéíóúñü]/gi, "_") // reemplaza caracteres raros
    .replace(/_+/g, "_")              // colapsa underscores múltiples
    .slice(0, 50);                    // máximo 50 chars para no romper el FS
 
  return `acta_${base}_${fecha}.md`;
}
 
