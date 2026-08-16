import type { ApprovalStatus, AppView, Network, SocialFormat, Task, WorkStatus } from "./types";

export const SOCIAL_FORMATS: Record<Network, SocialFormat[]> = {
  instagram: [
    { id:"ig-square",label:"Post carré",usage:"Fil & carrousel",width:1080,height:1080,ratio:"1:1",recommended:true },
    { id:"ig-portrait",label:"Post portrait",usage:"Fil immersif",width:1080,height:1350,ratio:"4:5",recommended:true },
    { id:"ig-story",label:"Story / Reel",usage:"Plein écran mobile",width:1080,height:1920,ratio:"9:16",recommended:true },
    { id:"ig-landscape",label:"Paysage",usage:"Fil horizontal",width:1080,height:566,ratio:"1.91:1" },
  ],
  x: [
    { id:"x-square",label:"Image carrée",usage:"Post autonome",width:1200,height:1200,ratio:"1:1",recommended:true },
    { id:"x-landscape",label:"Image paysage",usage:"Post & lien",width:1200,height:628,ratio:"1.91:1",recommended:true },
    { id:"x-portrait",label:"Image portrait",usage:"Post étendu",width:1440,height:1800,ratio:"4:5" },
    { id:"x-wide",label:"Écran large",usage:"Vidéo & annonce",width:1920,height:1080,ratio:"16:9" },
  ],
  tiktok: [
    { id:"tk-vertical",label:"TikTok vertical",usage:"In-feed / plein écran",width:1080,height:1920,ratio:"9:16",recommended:true },
    { id:"tk-square",label:"TikTok carré",usage:"Placement carré",width:1080,height:1080,ratio:"1:1" },
    { id:"tk-landscape",label:"TikTok horizontal",usage:"Placement paysage",width:1920,height:1080,ratio:"16:9" },
  ],
  facebook: [
    { id:"fb-landscape",label:"Publication paysage",usage:"Fil & lien",width:1200,height:630,ratio:"1.91:1",recommended:true },
    { id:"fb-square",label:"Publication carrée",usage:"Fil mobile",width:1080,height:1080,ratio:"1:1",recommended:true },
    { id:"fb-portrait",label:"Publication portrait",usage:"Fil immersif",width:1080,height:1350,ratio:"4:5" },
    { id:"fb-story",label:"Story / Reel",usage:"Plein écran mobile",width:1080,height:1920,ratio:"9:16",recommended:true },
  ],
};

export const NETWORKS: Record<Network, { label: string; short: string; size: string; format: string }> = {
  instagram: { label: "Instagram", short: "IG", size: "1080 × 1080", format: "Post carré" },
  x: { label: "X / Twitter", short: "X", size: "1600 × 900", format: "Publication" },
  tiktok: { label: "TikTok", short: "TK", size: "1080 × 1920", format: "Vidéo verticale" },
  facebook: { label: "Facebook", short: "FB", size: "1200 × 630", format: "Publication" },
};

export const VIEW_LABELS: Record<AppView, { section: "Studio" | "Espace"; title: string }> = {
  templates: { section: "Studio", title: "Templates" },
  sketchup: { section: "Studio", title: "Sketchup" },
  editor: { section: "Studio", title: "Éditeur" },
  logos: { section: "Studio", title: "Générateur de logos" },
  images: { section: "Studio", title: "Générateur d’images" },
  texts: { section: "Studio", title: "Générateur de textes" },
  brand: { section: "Studio", title: "Brand Kit" },
  creations: { section: "Espace", title: "Mes créations" },
  calendar: { section: "Espace", title: "Calendrier" },
};

export const STATUS_LABELS: Record<WorkStatus, string> = {
  debute: "Débuté",
  en_cours: "En cours",
  finie: "Finie",
};

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  draft: "Brouillon",
  review: "À valider",
  approved: "Approuvée",
  scheduled: "Planifiée",
  published: "Publiée",
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
