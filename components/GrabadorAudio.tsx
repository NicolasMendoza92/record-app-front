"use client";

import { useEffect, useRef } from "react";
import { Mic, Square, Pause, Play, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGrabacion, type EstadoGrabacion } from "@/hooks/useGrabacion";

interface GrabadorAudioProps {
  /** Se llama cuando hay una grabación lista para procesar */
  onGrabacionLista: (blob: Blob, nombre: string) => void;
}

function formatearTiempo(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Visualizador de onda animado con canvas
function VisualizadorOnda({ activo }: { activo: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barrasRef = useRef<number[]>(Array(28).fill(4));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function animar() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const W = canvas.width;
      const H = canvas.height;
      const n = barrasRef.current.length;
      const barW = 3;
      const gap = (W - n * barW) / (n + 1);

      barrasRef.current = barrasRef.current.map((h) => {
        if (!activo) {
          // decae suavemente a la altura mínima
          return Math.max(4, h * 0.85);
        }
        // animación aleatoria cuando está grabando
        const target = 4 + Math.random() * (H - 8);
        return h + (target - h) * 0.3;
      });

      barrasRef.current.forEach((h, i) => {
        const x = gap + i * (barW + gap);
        const y = (H - h) / 2;
        ctx.fillStyle = activo ? "#3b82f6" : "#94a3b8";
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, 2);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(animar);
    }

    animRef.current = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(animRef.current);
  }, [activo]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={40}
      className="opacity-90"
    />
  );
}

export function GrabadorAudio({ onGrabacionLista }: GrabadorAudioProps) {
  const {
    estado,
    segundos,
    audioBlob,
    audioUrl,
    iniciar,
    pausar,
    reanudar,
    detener,
    reiniciar,
    errorMic,
  } = useGrabacion();

  // cuando hay blob listo, avisamos al padre
  useEffect(() => {
    if (estado === "listo" && audioBlob) {
      const fecha = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
      const nombre = `grabacion_${fecha}.webm`;
      onGrabacionLista(audioBlob, nombre);
    }
  }, [estado, audioBlob, onGrabacionLista]);

  const grabando = estado === "grabando";
  const pausado  = estado === "pausado";
  const listo    = estado === "listo";
  const enCurso  = grabando || pausado;

  return (
    <div className="flex flex-col items-center gap-4 py-2">

      {/* ── estado idle ── */}
      {estado === "idle" && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-2 border-red-200">
            <Mic className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Grabá directamente desde el micrófono del dispositivo
          </p>
          <Button
            onClick={iniciar}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            <Mic className="h-4 w-4" />
            Iniciar grabación
          </Button>
        </div>
      )}

      {/* ── en curso (grabando o pausado) ── */}
      {enCurso && (
        <div className="flex flex-col items-center gap-4 w-full">
          {/* indicador + tiempo */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                grabando ? "bg-red-500 animate-pulse" : "bg-yellow-400"
              )}
            />
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {formatearTiempo(segundos)}
            </span>
            <span className="text-xs text-muted-foreground">
              {grabando ? "grabando" : "pausado"}
            </span>
          </div>

          {/* visualizador de onda */}
          <VisualizadorOnda activo={grabando} />

          {/* controles */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={grabando ? pausar : reanudar}
            >
              {grabando ? (
                <><Pause className="h-4 w-4" /> Pausar</>
              ) : (
                <><Play className="h-4 w-4" /> Reanudar</>
              )}
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              onClick={detener}
            >
              <Square className="h-4 w-4" />
              Detener
            </Button>
          </div>

          <button
            onClick={reiniciar}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Cancelar y empezar de nuevo
          </button>
        </div>
      )}

      {/* ── grabación lista ── */}
      {listo && audioUrl && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Grabación lista — {formatearTiempo(segundos)}
            </span>
          </div>

          {/* reproductor nativo para escuchar antes de procesar */}
          <audio
            src={audioUrl}
            controls
            className="w-full h-10"
          />

          <button
            onClick={reiniciar}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Grabar de nuevo
          </button>
        </div>
      )}

      {/* ── error de micrófono ── */}
      {errorMic && (
        <p className="text-sm text-red-500 text-center">{errorMic}</p>
      )}
    </div>
  );
}