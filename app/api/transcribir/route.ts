import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const APP_PASSWORD = process.env.APP_PASSWORD ?? "fundacion2026";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  // ── 1. verificar contraseña ───────────────────────────────────────────────
  const password = req.headers.get("x-app-password");
  if (password !== APP_PASSWORD) {
    return NextResponse.json({ mensaje: "Contraseña incorrecta" }, { status: 401 });
  }

  // ── 2. reenviar el multipart/form-data al backend Python ──────────────────
  try {
    const formData = await req.formData();

    const backendRes = await fetch(`${BACKEND_URL}/transcribir`, {
      method: "POST",
      // NO pongas Content-Type — fetch lo construye con el boundary correcto
      body: formData,
      // el procesamiento puede tardar varios minutos
      signal: AbortSignal.timeout(30 * 60 * 1000), // 30 min máximo
    });

    if (!backendRes.ok) {
      const error = await backendRes.json().catch(() => ({ detalle: "Error desconocido en el backend" }));
      return NextResponse.json(
        { mensaje: "Error en el servidor de transcripción", detalle: error.detail ?? error.mensaje },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error de red";
    return NextResponse.json({ mensaje: "No se pudo conectar al backend", detalle: mensaje }, { status: 502 });
  }
}