import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_ITEM_COLUMNS, signPhotos, type PublicItem } from "@/lib/items";

export interface ItemFilters {
  q?: string;
  category?: string;
  color?: string;
  location?: string;
  from?: string;
}

export function useAvailableItems(filters: ItemFilters, limit = 60) {
  return useQuery({
    queryKey: ["items", "disponible", filters, limit],
    queryFn: async () => {
      let query = supabase
        .from("found_items")
        .select(PUBLIC_ITEM_COLUMNS)
        .eq("status", "disponible")
        .order("created_at", { ascending: false })
        .limit(limit);
      const q = filters.q?.trim().replace(/[%,()*]/g, " ").trim();
      if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,location.ilike.%${q}%,color.ilike.%${q}%`);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.color) query = query.eq("color", filters.color);
      if (filters.location) query = query.eq("location", filters.location);
      if (filters.from) query = query.gte("found_date", filters.from);
      const { data, error } = await query;
      if (error) throw error;
      const items = (data ?? []) as PublicItem[];
      const photos = await signPhotos(items.map((i) => i.photo_path));
      return { items, photos };
    },
  });
}
