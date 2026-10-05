import { Link } from "@tanstack/react-router";
import { MapPin, CalendarDays, ImageOff } from "lucide-react";
import { STATUS, formatDate, type ItemStatus, type PublicItem } from "@/lib/items";

export function StatusBadge({ status }: { status: ItemStatus }) {
  const s = STATUS[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${s.className}`}>{s.label}</span>;
}

export function ItemCard({ item, photoUrl }: { item: PublicItem; photoUrl?: string }) {
  return (
    <Link
      to="/objeto/$id"
      params={{ id: item.id }}
      className="group overflow-hidden rounded-2xl bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {photoUrl ? (
          <img src={photoUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{item.category}</span>
        <p className="truncate font-bold text-primary">{item.name}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{item.location}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDate(item.found_date)}</p>
      </div>
    </Link>
  );
}

export function ItemGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  );
}
