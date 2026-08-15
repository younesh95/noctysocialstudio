import {
  CalendarDays,
  Files,
  ImagePlus,
  LayoutTemplate,
  PenLine,
  Shapes,
  Sparkles,
} from "lucide-react";
import type { AppView } from "../lib/types";

interface NavigationProps {
  active: AppView;
  onNavigate: (view: AppView) => void;
}

const studioItems = [
  { id: "templates" as const, label: "Templates", icon: LayoutTemplate },
  { id: "editor" as const, label: "Éditeur", icon: PenLine },
  { id: "logos" as const, label: "Générateur de logos", icon: Shapes },
  { id: "images" as const, label: "Générateur d’images", icon: ImagePlus },
  { id: "texts" as const, label: "Générateur de textes", icon: Sparkles },
];

const spaceItems = [
  { id: "creations" as const, label: "Mes créations", icon: Files },
  { id: "calendar" as const, label: "Calendrier", icon: CalendarDays },
];

export function Navigation({ active, onNavigate }: NavigationProps) {
  const studioActive = studioItems.some((item) => item.id === active);
  const spaceActive = spaceItems.some((item) => item.id === active);

  return (
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => onNavigate("templates")} aria-label="Accueil NOCTYS Creative Hub">
        <img src="/noctys-logo.webp" alt="" />
        <span><strong>NOCTYS</strong><small>CREATIVE HUB</small></span>
      </button>

      <nav aria-label="Navigation principale">
        <p className="nav-label">CRÉER</p>
        <div className={`nav-group-title ${studioActive ? "active" : ""}`}><Sparkles size={16}/><span>Studio</span></div>
        <div className="subnav">
          {studioItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? "selected" : ""} onClick={() => onNavigate(id)}>
              <Icon size={14}/><span>{label}</span>
            </button>
          ))}
        </div>

        <p className="nav-label nav-separator">ORGANISER</p>
        <div className={`nav-group-title ${spaceActive ? "active" : ""}`}><Files size={16}/><span>Espace</span></div>
        <div className="subnav">
          {spaceItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? "selected" : ""} onClick={() => onNavigate(id)}>
              <Icon size={14}/><span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-foot"><span className="online-dot" /> Système opérationnel</div>
    </aside>
  );
}
