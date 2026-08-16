import { env } from "cloudflare:workers";
import { ensureWorkspaceSchema, getWorkspaceDb, toExternalTemplate, type ImportedTemplateRow } from "../../../db/workspace";
import type { ExternalTemplateConfig, Network } from "../../lib/types";

const NETWORKS: Network[] = ["instagram", "x", "tiktok", "facebook"];
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_JSON_BYTES = 1024 * 1024;
const FALLBACK_DIMENSIONS: Record<Network, [number, number]> = {
  instagram: [1080, 1080], x: [1600, 900], tiktok: [1080, 1920], facebook: [1200, 630],
};

interface TemplateManifest {
  name?: unknown;
  network?: unknown;
  width?: unknown;
  height?: unknown;
  headline?: unknown;
  subheading?: unknown;
  accent?: unknown;
}

export async function GET() {
  try {
    await ensureWorkspaceSchema();
    const rows = await getWorkspaceDb().prepare("SELECT * FROM imported_templates ORDER BY created_at DESC").all<ImportedTemplateRow>();
    return Response.json({ templates: rows.results.map(toExternalTemplate) });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let uploadedKey: string | undefined;
  try {
    await ensureWorkspaceSchema();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Sélectionnez un fichier valide." }, { status: 400 });

    const fileName = safeFileName(file.name);
    const isJson = file.type === "application/json" || fileName.toLowerCase().endsWith(".json");
    const isImage = IMAGE_TYPES.has(file.type);
    if (!isJson && !isImage) return Response.json({ error: "Formats acceptés : JSON, PNG, JPG et WebP." }, { status: 415 });
    if (file.size > (isJson ? MAX_JSON_BYTES : MAX_IMAGE_BYTES)) return Response.json({ error: isJson ? "Le manifeste dépasse 1 Mo." : "L’image dépasse 8 Mo." }, { status: 413 });

    let manifest: TemplateManifest = {};
    if (isJson) {
      try { manifest = JSON.parse(await file.text()) as TemplateManifest; }
      catch { return Response.json({ error: "Le manifeste JSON est invalide." }, { status: 400 }); }
    }

    const requestedNetwork = clean(manifest.network) || clean(form.get("network"));
    const network = NETWORKS.includes(requestedNetwork as Network) ? requestedNetwork as Network : "instagram";
    const [fallbackWidth, fallbackHeight] = FALLBACK_DIMENSIONS[network];
    const width = dimension(manifest.width ?? form.get("width"), fallbackWidth);
    const height = dimension(manifest.height ?? form.get("height"), fallbackHeight);
    const name = limit(clean(manifest.name) || clean(form.get("name")) || fileName.replace(/\.[^.]+$/, ""), 80);
    if (!name) return Response.json({ error: "Le template doit avoir un nom." }, { status: 400 });

    const config: ExternalTemplateConfig = {
      headline: optionalText(manifest.headline, 80),
      subheading: optionalText(manifest.subheading, 140),
      accent: safeAccent(manifest.accent),
    };
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const mimeType = isJson ? "application/json" : file.type;
    if (isImage) {
      const bucket = getTemplateBucket();
      uploadedKey = `templates/${id}/${fileName}`;
      await bucket.put(uploadedKey, await file.arrayBuffer(), {
        httpMetadata: { contentType: mimeType, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { originalName: fileName },
      });
    }

    const db = getWorkspaceDb();
    await db.prepare(`INSERT INTO imported_templates
      (id,name,network,kind,source_type,file_name,mime_type,asset_key,width,height,config_json,created_at,updated_at)
      VALUES (?,?,?,'image',?,?,?,?,?,?,?,?,?)`)
      .bind(id,name,network,isJson?"json":"image",fileName,mimeType,uploadedKey??null,width,height,JSON.stringify(config),now,now).run();
    const row = await db.prepare("SELECT * FROM imported_templates WHERE id=?").bind(id).first<ImportedTemplateRow>();
    return Response.json({ template: toExternalTemplate(row!) }, { status: 201 });
  } catch (error) {
    if (uploadedKey) await getTemplateBucket().delete(uploadedKey).catch(() => undefined);
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

function getTemplateBucket() {
  const bucket = (env as unknown as { TEMPLATE_ASSETS?: R2Bucket }).TEMPLATE_ASSETS;
  if (!bucket) throw new Error("Le stockage des templates n’est pas disponible.");
  return bucket;
}

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function limit(value: string, length: number) { return value.slice(0, length); }
function optionalText(value: unknown, length: number) { const text = clean(value); return text ? limit(text, length) : undefined; }
function safeAccent(value: unknown) { const accent = clean(value); return /^#[0-9a-f]{6}$/i.test(accent) ? accent : undefined; }
function safeFileName(value: string) { return value.split(/[\\/]/).pop()?.replace(/[^a-z0-9._-]/gi, "-").slice(0, 100) || "template"; }
function dimension(value: unknown, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 256 && parsed <= 8192 ? parsed : fallback; }
function message(error: unknown) { return error instanceof Error ? error.message : "Erreur inattendue"; }
