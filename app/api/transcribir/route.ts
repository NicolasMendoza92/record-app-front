import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const APP_PASSWORD = process.env.APP_PASSWORD;

// ── crítico: sin esto Next.js corta la request a los 10 segundos ──────────
export const maxDuration = 1800; // 30 minutos en segundos (máximo en Vercel Pro)
                                  // en Vercel Free el límite es 60s — ver nota abajo
 
export async function POST(req: NextRequest) {
  // ── 1. verificar contraseña ───────────────────────────────────────────────
  const password = req.headers.get("x-app-password");
  if (password !== APP_PASSWORD) {
    return NextResponse.json({ mensaje: "Contraseña incorrecta" }, { status: 401 });
  }
 
  // ── 2. reenviar el multipart/form-data al backend Python ──────────────────
  try {
    const formData = await req.formData();
 
    // verificación de contraseña sin archivo — solo para el login check
    const audioFile = formData.get("audio");
    if (!audioFile) {
      return NextResponse.json({ mensaje: "Sin archivo — contraseña OK" }, { status: 400 });
    }
 
    const backendRes = await fetch(`${BACKEND_URL}/transcribir`, {
      method: "POST",
      body: formData,
      // @ts-expect-error — Node 18+ soporta keepalive pero los tipos no lo incluyen siempre
      duplex: "half",
    });
 
    if (!backendRes.ok) {
      const error = await backendRes.json().catch(() => ({
        detail: "Error desconocido en el backend",
      }));
      return NextResponse.json(
        {
          mensaje: "Error en el servidor de transcripción",
          detalle: error.detail ?? error.mensaje,
        },
        { status: backendRes.status }
      );
    }
 
    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error de red";
    return NextResponse.json(
      { mensaje: "No se pudo conectar al backend", detalle: mensaje },
      { status: 502 }
    );
  }
}