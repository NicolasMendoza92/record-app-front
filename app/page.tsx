"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileAudio, Loader2, CheckCircle, AlertCircle,
  Download, RotateCcw, Users, Clock, Mic,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GrabadorAudio } from "@/components/GrabadorAudio";
import { cn, descargarArchivo, formatearBytes, nombreActa } from "@/lib/utils";
import type { EstadoProceso, ResultadoTranscripcion } from "@/types";

type ModoEntrada = "subir" | "grabar";

const FORMATOS_ACEPTADOS = [".mp3", ".m4a", ".mp4", ".wav", ".ogg", ".flac"];
const TAMANIO_MAX_MB = 500;

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [modo, setModo] = useState<ModoEntrada>("subir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [speakers, setSpeakers] = useState(2);
  const [estado, setEstado] = useState<EstadoProceso>("idle");
  const [resultado, setResultado] = useState<ResultadoTranscripcion | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [vistaActa, setVistaActa] = useState<"acta" | "transcripcion">("acta");

  useEffect(() => {
    if (!sessionStorage.getItem("app_password")) router.push("/login");
  }, [router]);

  // ── manejo de archivo ─────────────────────────────────────────────────────
  function validarArchivo(file: File): string | null {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!FORMATOS_ACEPTADOS.includes(ext) && !file.type.startsWith("audio/")) {
      return "Formato no soportado. Usá MP3, M4A, WAV, OGG o FLAC.";
    }
    if (file.size > TAMANIO_MAX_MB * 1024 * 1024) {
      return `El archivo supera los ${TAMANIO_MAX_MB} MB.`;
    }
    return null;
  }

  function seleccionarArchivo(file: File) {
    const err = validarArchivo(file);
    if (err) { setErrorMsg(err); setEstado("error"); return; }
    setArchivo(file);
    setEstado("idle");
    setErrorMsg("");
    setResultado(null);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) seleccionarArchivo(file);
  }, []);

  // ── grabación lista desde el componente ───────────────────────────────────
  const onGrabacionLista = useCallback((blob: Blob, nombre: string) => {
    const file = new File([blob], nombre, { type: blob.type });
    setArchivo(file);
    setEstado("idle");
    setErrorMsg("");
    setResultado(null);
  }, []);

  // ── procesamiento ─────────────────────────────────────────────────────────
  async function procesarAudio() {
    if (!archivo) return;
    const password = sessionStorage.getItem("app_password") ?? "";

    setEstado("subiendo");
    setErrorMsg("");

    const form = new FormData();
    form.append("audio", archivo);
    form.append("speakers", String(speakers));

    setEstado("procesando");

    try {
      const res = await fetch("/api/transcribir", {
        method: "POST",
        headers: { "x-app-password": password },
        body: form,
      });

      if (res.status === 401) {
        sessionStorage.removeItem("app_password");
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje ?? "Error desconocido");

      setResultado({ ...data, nombre_archivo: archivo.name });
      setEstado("listo");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error de red. Revisá la conexión.");
      setEstado("error");
    }
  }

  function reiniciar() {
    setArchivo(null);
    setEstado("idle");
    setResultado(null);
    setErrorMsg("");
    setSpeakers(2);
    setModo("subir");
  }

  // ── vista resultado ───────────────────────────────────────────────────────
  if (estado === "listo" && resultado) {
    return (
      <div className="min-h-screen bg-muted/40 p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <span className="font-semibold">Transcriptor</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reiniciar}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Nueva transcripción
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Procesado correctamente</span>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {resultado.duracion_min} min
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {resultado.n_speakers} {resultado.n_speakers === 1 ? "speaker" : "speakers"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {(["acta", "transcripcion"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVistaActa(v)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize",
                        vistaActa === v
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {v === "acta" ? "Acta" : "Transcripción"}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => descargarArchivo(resultado.acta, nombreActa(resultado.nombre_archivo))}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Descargar acta (.md)
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                {vistaActa === "acta" ? resultado.acta : resultado.transcripcion}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── vista upload / grabar ─────────────────────────────────────────────────
  const procesando = estado === "subiendo" || estado === "procesando";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg space-y-4">

        {/* cabecera */}
        <div className="text-center space-y-1 mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Transcriptor</h1>
          <p className="text-muted-foreground text-sm">
            Grabá o subí el audio de la entrevista para generar el acta
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">

            {/* selector de modo */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => { setModo("subir"); setArchivo(null); }}
                disabled={procesando}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                  modo === "subir"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Upload className="h-4 w-4" />
                Subir archivo
              </button>
              <button
                onClick={() => { setModo("grabar"); setArchivo(null); }}
                disabled={procesando}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                  modo === "grabar"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Mic className="h-4 w-4" />
                Grabar ahora
              </button>
            </div>

            {/* ── panel subir archivo ── */}
            {modo === "subir" && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !procesando && inputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                  procesando && "pointer-events-none opacity-60"
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".mp3,.m4a,.mp4,.wav,.ogg,.flac"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && seleccionarArchivo(e.target.files[0])}
                />
                {archivo ? (
                  <>
                    <FileAudio className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{archivo.name}</p>
                      <p className="text-xs text-muted-foreground">{formatearBytes(archivo.size)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Tocá para seleccionar el audio</p>
                      <p className="text-xs text-muted-foreground">
                        o arrastrá acá · MP3, M4A, WAV, OGG
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── panel grabar ── */}
            {modo === "grabar" && (
              <div className="rounded-lg border p-4">
                <GrabadorAudio onGrabacionLista={onGrabacionLista} />
              </div>
            )}

            {/* confirmación de grabación lista (cuando viene del grabador) */}
            {modo === "grabar" && archivo && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Grabación lista · {formatearBytes(archivo.size)}</span>
              </div>
            )}

            {/* speakers */}
            <div className="space-y-2">
              <label className="text-sm font-medium">¿Cuántas personas hablan?</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSpeakers(n)}
                    disabled={procesando}
                    className={cn(
                      "flex-1 rounded-md border py-2 text-sm font-medium transition-colors",
                      speakers === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Especificarlo mejora la precisión de quién habla cuándo.
              </p>
            </div>

            {/* error */}
            {estado === "error" && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMsg || "Ocurrió un error. Intentá de nuevo."}</span>
              </div>
            )}

            {/* procesando */}
            {procesando && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-700 text-sm">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <div>
                  <p className="font-medium">
                    {estado === "subiendo" ? "Subiendo audio..." : "Procesando — puede tardar varios minutos"}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">No cierres esta pestaña</p>
                </div>
              </div>
            )}

            {/* botón principal */}
            <Button
              className="w-full"
              disabled={!archivo || procesando}
              onClick={procesarAudio}
            >
              {procesando ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <><Mic className="h-4 w-4" /> Generar transcripción y acta</>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          El procesamiento tarda ~1 min por cada 10 min de audio
        </p>
      </div>
    </div>
  );
}