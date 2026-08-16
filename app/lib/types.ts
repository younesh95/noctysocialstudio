export type Network = "instagram" | "x" | "tiktok" | "facebook";
export type ContentKind = "image" | "texte";
export type WorkStatus = "debute" | "en_cours" | "finie";
export type TemplateSource = "json" | "image";
export type StudioView = "templates" | "editor" | "logos" | "images" | "texts";
export type SpaceView = "creations" | "calendar";
export type AppView = StudioView | SpaceView;

export interface Task {
  id: string;
  name: string;
  kind: ContentKind;
  network: Network;
  publishAt: string;
  status: WorkStatus;
  creationId: string | null;
  createdAt: string;
}

export interface Creation {
  id: string;
  title: string;
  network: Network;
  kind: ContentKind;
  status: WorkStatus;
  publishAt: string | null;
  template: string;
  body: string;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalTemplateConfig {
  headline?: string;
  subheading?: string;
  accent?: string;
}

export interface ExternalTemplate {
  id: string;
  name: string;
  network: Network;
  kind: ContentKind;
  sourceType: TemplateSource;
  fileName: string;
  mimeType: string;
  assetUrl: string | null;
  width: number;
  height: number;
  config: ExternalTemplateConfig;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceData {
  tasks: Task[];
  creations: Creation[];
  templates: ExternalTemplate[];
}

export interface TaskDraft {
  name: string;
  kind: ContentKind;
  network: Network;
  publishAt: string;
}
