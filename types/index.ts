export type EstadoProceso =
  | "idle"        // esperando archivo
  | "subiendo"    // enviando al backend
  | "procesando"  // backend trabajando
  | "listo"       // resultado disponible
  | "error";      // algo falló

export interface ResultadoTranscripcion {
  transcripcion: string;   // texto crudo con speakers y timestamps
  acta: string;            // markdown generado por Claude
  duracion_min: number;    // duración en minutos
  n_speakers: number;      // cantidad de speakers detectados
  nombre_archivo: string;  // nombre original del audio (para el nombre del .md)
}

export interface ErrorAPI {
  mensaje: string;
  detalle?: string;
}