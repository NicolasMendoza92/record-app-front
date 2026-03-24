"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // verificamos haciendo una llamada liviana al backend proxy
    const res = await fetch("/api/transcribir", {
      method: "POST",
      headers: { "x-app-password": password },
      body: new FormData(), // form vacío — solo verifica la contraseña
    });

    setLoading(false);

    // 401 = contraseña mal, 400/502 = contraseña OK pero falta el archivo (esperado)
    if (res.status === 401) {
      setError(true);
      return;
    }

    // guardamos en sessionStorage para no pedir de nuevo
    sessionStorage.setItem("app_password", password);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Transcriptor</CardTitle>
          <CardDescription>Ingresá la contraseña del equipo para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                autoFocus
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">Contraseña incorrecta. Intentá de nuevo.</p>
            )}
            <Button type="submit" disabled={loading || !password}>
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}