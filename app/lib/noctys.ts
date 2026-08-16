import type { AppView, Network, Task, WorkStatus } from "./types";

export const NETWORKS: Record<Network, { label: string; short: string; size: string; format: string }> = {
  instagram: { label: "Instagram", short: "IG", size: "1080 × 1080", format: "Post carré" },
  x: { label: "X / Twitter", short: "X", size: "1600 × 900", format: "Publication" },
  tiktok: { label: "TikTok", short: "TK", size: "1080 × 1920", format: "Vidéo verticale" },
  facebook: { label: "Facebook", short: "FB", size: "1200 × 630", format: "Publication" },
};

export const VIEW_LABELS: Record<AppView, { section: "Studio" | "Espace"; title: string }> = {
  templates: { section: "Studio", title: "Templates" },
  editor: { section: "Studio", title: "Éditeur" },
  logos: { section: "Studio", title: "Générateur de logos" },
  images: { section: "Studio", title: "Générateur d’images" },
  texts: { section: "Studio", title: "Générateur de textes" },
  creations: { section: "Espace", title: "Mes créations" },
  calendar: { section: "Espace", title: "Calendrier" },
};

export const STATUS_LABELS: Record<WorkStatus, string> = {
  debute: "Débuté",
  en_cours: "En cours",
  finie: "Finie",
};

export function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Sans date";
  return new Intl.DateTimeFormat("fr-FR", options ?? { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function deadlineFor(publishAt: string) {
  const deadline = new Date(publishAt);
  deadline.setDate(deadline.getDate() - 1);
  return deadline;
}

export function priorityFor(task: Pick<Task, "publishAt" | "status">) {
  if (task.status === "finie") return { key: "done", label: "Livré" };
  const days = Math.ceil((deadlineFor(task.publishAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return { key: "urgent", label: "Urgent" };
  if (days <= 3) return { key: "high", label: "Prioritaire" };
  return { key: "planned", label: "Planifié" };
}

export function googleCalendarUrl(task: Task) {
  const start = new Date(task.publishAt);
  const end = new Date(start.getTime() + 30 * 60_000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.name,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `Publication ${task.kind} · ${NETWORKS[task.network].label}\nCréée depuis NOCTYS Creative Hub.`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
