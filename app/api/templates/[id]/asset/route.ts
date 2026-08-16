import { env } from "cloudflare:workers";
import { ensureWorkspaceSchema, getImportedTemplateRow } from "../../../../../db/workspace";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureWorkspaceSchema();
    const { id } = await context.params;
    const row = await getImportedTemplateRow(id);
    if (!row?.asset_key) return new Response("Template introuvable", { status: 404 });
    const bucket = (env as unknown as { TEMPLATE_ASSETS?: R2Bucket }).TEMPLATE_ASSETS;
    if (!bucket) return new Response("Stockage indisponible", { status: 503 });
    const object = await bucket.get(row.asset_key);
    if (!object) return new Response("Fichier introuvable", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": row.mime_type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": object.httpEtag,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Fichier indisponible", { status: 500 });
  }
}
