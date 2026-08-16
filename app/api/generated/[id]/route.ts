import { env } from "cloudflare:workers";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const extension = new URL(request.url).searchParams.get("ext") === "jpg" ? "jpg" : "png";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Fichier introuvable", { status: 404 });
  const object = await env.TEMPLATE_ASSETS.get(`generated/${id}.${extension}`);
  if (!object) return new Response("Fichier introuvable", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
