import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  "Celular", "Llaves", "Billetera", "Documentos/Carnet", "Ropa", "Mochila",
  "Libros/Cuadernos", "Electrónicos", "Otros",
] as const;

export const LOCATIONS = [
  "Bloque A", "Bloque B", "Bloque C", "Biblioteca", "Cafetería", "Canchas",
  "Estacionamiento", "Auditorio", "Otro",
] as const;

export const COLORS = [
  "Negro", "Blanco", "Gris", "Azul", "Rojo", "Verde", "Amarillo", "Café", "Rosado", "Morado", "Varios colores",
] as const;

export type ItemStatus = "por_recibir" | "disponible" | "en_revision" | "entregado";

export const STATUS: Record<ItemStatus, { label: string; className: string }> = {
  por_recibir: { label: "Por recibir", className: "bg-status-info text-status-info-foreground" },
  disponible: { label: "Disponible", className: "bg-status-success text-status-success-foreground" },
  en_revision: { label: "En revisión", className: "bg-status-warning text-status-warning-foreground" },
  entregado: { label: "Entregado", className: "bg-status-neutral text-status-neutral-foreground" },
};

export const OFFICE = {
  name: "Oficina de Bienestar Estudiantil",
  hours: "Lunes a viernes, de 8:00 a 18:00",
};

export const PUBLIC_ITEM_COLUMNS = "id, name, category, color, location, found_date, photo_path, status, created_at";

export interface PublicItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  location: string;
  found_date: string;
  photo_path: string;
  status: ItemStatus;
  created_at: string;
}

export const BUCKET = "item-photos";

/** Returns path -> temporary viewable URL. */
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60);
  const map: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" });
}
