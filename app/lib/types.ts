export type Network = "instagram" | "x" | "tiktok" | "facebook";
export type ContentKind = "image" | "texte";
export type WorkStatus = "debute" | "en_cours" | "finie";
export type ApprovalStatus = "draft" | "review" | "approved" | "scheduled" | "published";
export type TemplateSource = "json" | "image";
export type StudioView = "templates" | "sketchup" | "editor" | "logos" | "images" | "texts" | "brand";
export type SpaceView = "creations" | "calendar";
export type AppView = StudioView | SpaceView;

export interface Task {
  id: string;
  name: string;
  kind: ContentKind;
  network: Network;
  publishAt: string;
  status: WorkStatus;
  approvalStatus: ApprovalStatus;
  creationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Creation {
  id: string;
  title: string;
  network: Network;
  kind: ContentKind;
  status: WorkStatus;
  approvalStatus: ApprovalStatus;
  publishAt: string | null;
  template: string;
  body: string;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  versionCount: number;
}

export interface CreationVersion {
  id: string;
  creationId: string;
  version: number;
  title: string;
  network: Network;
  kind: ContentKind;
  template: string;
  body: string;
  createdAt: string;
}

export interface BrandSettings {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  headlineFont: string;
  bodyFont: string;
  logoUrl: string;
  signature: string;
  tone: string;
  sponsors: string[];
  updatedAt: string;
}

export interface SocialFormat {
  id: string;
  label: string;
  usage: string;
  width: number;
  height: number;
  ratio: string;
  recommended?: boolean;
}

export type CanvasElementType = "text" | "shape" | "image";

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  align?: "left" | "center" | "right";
  src?: string;
  radius?: number;
}

export interface CanvasDocument {
  version: 1;
  width: number;
  height: number;
  background: string;
  formatId: string;
  elements: CanvasElement[];
}

export interface CreationPayload {
  canvas?: CanvasDocument;
  title?: string;
  opponent?: string;
  result?: string;
  assetUrl?: string;
  formatId?: string;
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
  trash: Creation[];
  brand: BrandSettings;
}

export interface TaskDraft {
  name: string;
  kind: ContentKind;
  network: Network;
  publishAt: string;
}

export interface CampaignDraft {
  opponent: string;
  competition: string;
  bestOf: string;
  matchAt: string;
  sponsors: string;
  networks: Network[];
}
