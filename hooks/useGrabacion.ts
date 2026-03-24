import { useState, useRef, useCallback } from "react";

export type EstadoGrabacion = "idle" | "grabando" | "pausado" | "listo";

interface UseGrabacionReturn {
  estado: EstadoGrabacion;
  segundos: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  iniciar: () => Promise<void>;
  pausar: () => void;
  reanudar: () => void;
  detener: () => void;
  reiniciar: () => void;
  errorMic: string | null;
}

export function useGrabacion(): UseGrabacionReturn {
  const [estado, setEstado] = useState<EstadoGrabacion>("idle");
  const [segundos, setSegundos] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMic, setErrorMic] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // detectar el mejor formato soportado por el browser
  function getMimeType(): string {
    const candidatos = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    return candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  }

  function iniciarTimer() {
    timerRef.current = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);
  }

  function detenerTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  const iniciar = useCallback(async () => {
    setErrorMic(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setEstado("listo");
        detenerTimer();

        // liberar micrófono
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(250); // chunk cada 250ms
      setEstado("grabando");
      setSegundos(0);
      iniciarTimer();
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setErrorMic("Permiso de micrófono denegado. Habilitalo en la configuración del browser.");
        } else if (err.name === "NotFoundError") {
          setErrorMic("No se encontró micrófono. Conectá uno e intentá de nuevo.");
        } else {
          setErrorMic(`Error al acceder al micrófono: ${err.message}`);
        }
      } else {
        setErrorMic("Error desconocido al iniciar la grabación.");
      }
    }
  }, []);

  const pausar = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setEstado("pausado");
      detenerTimer();
    }
  }, []);

  const reanudar = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setEstado("grabando");
      iniciarTimer();
    }
  }, []);

  const detener = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop(); // dispara onstop → setEstado("listo")
    }
  }, []);

  const reiniciar = useCallback(() => {
    // limpiar todo
    detenerTimer();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setEstado("idle");
    setSegundos(0);
    setErrorMic(null);
  }, [audioUrl]);

  return {
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
  };
}