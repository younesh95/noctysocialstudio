import { env } from "cloudflare:workers";

type Provider = "chatgpt" | "gemini";
type Mode = "logo" | "image" | "text";

interface RuntimeSecrets {
  OPENAI_API_KEY?: string;
  OPENAI_TEXT_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_IMAGE_MODEL?: string;
  TEMPLATE_ASSETS: R2Bucket;
}

interface GenerationResult {
  result: string;
  assetUrl?: string;
  source: "api" | "demo";
  model: string;
}

const NOCTYS_RULES = `Tu es le directeur artistique et social media manager de NOCTYS, organisation esport CS2.
Identité: nocturne, premium, compétitive, précise. Palette: noir obsidienne, graphite, violet #9C58C2, argent lunaire. Éviter le kitsch, la surcharge, les dégradés arc-en-ciel et toute copie de marque existante. Réponds en français.`;

export async function POST(request: Request) {
  let payload: { provider?: Provider; mode?: Mode; prompt?: string };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return Response.json({ error: "Requête JSON invalide" }, { status: 400 });
  }

  const prompt = payload.prompt?.replace(/\s+/g, " ").trim() ?? "";
  if (!prompt || prompt.length > 1800 || !isMode(payload.mode) || !isProvider(payload.provider)) {
    return Response.json({ error: "Brief incomplet ou trop long" }, { status: 400 });
  }

  const secrets = env as unknown as RuntimeSecrets;
  const configured = payload.provider === "chatgpt" ? Boolean(secrets.OPENAI_API_KEY) : Boolean(secrets.GEMINI_API_KEY);

  if (!configured) {
    return Response.json({ ...demoResult(payload.mode, prompt, payload.provider), configured: false });
  }

  try {
    const generation = payload.mode === "text"
      ? await generateText(secrets, payload.provider, prompt)
      : await generateImage(secrets, payload.provider, payload.mode, prompt);
    return Response.json({ ...generation, configured: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Le fournisseur IA a refusé la génération.";
    return Response.json({ error: message }, { status: 502 });
  }
}

async function generateText(secrets: RuntimeSecrets, provider: Provider, prompt: string): Promise<GenerationResult> {
  const brief = `${NOCTYS_RULES}\n\nRédige une publication sociale prête à publier, concise, avec un appel à l’action et au maximum 4 hashtags pertinents. Brief: ${prompt}`;
  if (provider === "chatgpt") {
    const model = secrets.OPENAI_TEXT_MODEL || "gpt-5.6-luna";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${secrets.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: brief, max_output_tokens: 700, store: false }),
    });
    const data = await response.json() as OpenAIResponse;
    if (!response.ok) throw providerError(data, "OpenAI");
    const result = readOpenAIText(data);
    if (!result) throw new Error("OpenAI n’a retourné aucun texte.");
    return { result, source: "api", model };
  }

  const model = secrets.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": secrets.GEMINI_API_KEY || "", "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: brief }),
  });
  const data = await response.json() as GeminiResponse;
  if (!response.ok) throw providerError(data, "Gemini");
  const result = readGeminiText(data);
  if (!result) throw new Error("Gemini n’a retourné aucun texte.");
  return { result, source: "api", model };
}

async function generateImage(secrets: RuntimeSecrets, provider: Provider, mode: Exclude<Mode, "text">, prompt: string): Promise<GenerationResult> {
  const imagePrompt = `${NOCTYS_RULES}\n\n${mode === "logo" ? "Crée un logo original, vectoriel dans son rendu, centré, lisible à 32 px, sur fond noir uni, sans mockup et sans texte parasite." : "Crée un visuel social esport carré 1:1, premium, sans marque tierce, avec une zone calme réservée au texte."}\nBrief: ${prompt}`;
  let base64: string | undefined;
  let mimeType = "image/png";
  let result: string;
  let model: string;

  if (provider === "chatgpt") {
    model = secrets.OPENAI_IMAGE_MODEL || "gpt-image-2";
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${secrets.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: imagePrompt, size: "1024x1024", quality: "medium", output_format: "png" }),
    });
    const data = await response.json() as OpenAIImageResponse;
    if (!response.ok) throw providerError(data, "OpenAI");
    base64 = data.data?.[0]?.b64_json;
    result = data.data?.[0]?.revised_prompt || `Visuel ${mode} généré avec la charte NOCTYS.`;
  } else {
    model = secrets.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": secrets.GEMINI_API_KEY || "", "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: imagePrompt,
        response_format: { type: "image", mime_type: "image/png", aspect_ratio: "1:1", image_size: "1K" },
      }),
    });
    const data = await response.json() as GeminiResponse;
    if (!response.ok) throw providerError(data, "Gemini");
    base64 = data.output_image?.data;
    mimeType = data.output_image?.mime_type || mimeType;
    result = readGeminiText(data) || `Visuel ${mode} généré avec la charte NOCTYS.`;
  }

  if (!base64) throw new Error("Le fournisseur n’a retourné aucune image.");
  const id = crypto.randomUUID();
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  await secrets.TEMPLATE_ASSETS.put(`generated/${id}.${extension}`, decodeBase64(base64), {
    httpMetadata: { contentType: mimeType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { provider, mode, model },
  });
  return { result, assetUrl: `/api/generated/${id}?ext=${extension}`, source: "api", model };
}

function demoResult(mode: Mode, prompt: string, provider: Provider): GenerationResult {
  const engine = provider === "chatgpt" ? "ChatGPT" : "Gemini";
  const model = provider === "chatgpt" ? "mode-démo-openai" : "mode-démo-gemini";
  if (mode === "text") return { result: `La nuit ne fait que commencer. ${sentence(prompt)} Rejoignez-nous pour vivre chaque round, chaque clutch et chaque instant décisif. 🌙\n\n#NOCTYS #CS2 #Esport — Proposition ${engine}`, source: "demo", model };
  if (mode === "logo") return { result: `Direction proposée : ${sentence(prompt)} Construction en formes pleines autour d’un N angulaire, capuche suggérée par l’espace négatif, croissant et étoile conservés. Palette limitée à Noir Obsidienne, Blanc Lunaire et Violet NOCTYS. Variante lisible à 32 px, sans glow ni dégradé. Concept préparé avec ${engine}.`, source: "demo", model };
  return { result: `Direction visuelle : ${sentence(prompt)} Scène nocturne premium, cadrage cinématique, profondeur graphite et halo violet contrôlé. Logo placé dans une zone calme avec 12,5 % de protection, contraste argent lunaire et espace réservé au message principal. Prompt préparé avec ${engine}.`, source: "demo", model };
}

interface OpenAIResponse { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } }
interface OpenAIImageResponse { data?: Array<{ b64_json?: string; revised_prompt?: string }>; error?: { message?: string } }
interface GeminiResponse { output_text?: string; output_image?: { data?: string; mime_type?: string }; steps?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } }

function readOpenAIText(data: OpenAIResponse) { return data.output_text?.trim() || data.output?.flatMap((item) => item.content || []).map((item) => item.text).filter(Boolean).join("\n").trim(); }
function readGeminiText(data: GeminiResponse) { return data.output_text?.trim() || data.steps?.flatMap((step) => step.content || []).filter((item) => item.type === "text").map((item) => item.text).filter(Boolean).join("\n").trim(); }
function providerError(data: { error?: { message?: string } }, provider: string) { return new Error(data.error?.message ? `${provider}: ${data.error.message}` : `${provider}: réponse API invalide.`); }
function decodeBase64(value: string) { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
function isProvider(value?: string): value is Provider { return value === "chatgpt" || value === "gemini"; }
function isMode(value?: string): value is Mode { return value === "logo" || value === "image" || value === "text"; }
function sentence(value: string) { const clean = value.replace(/\s+/g, " ").trim(); return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[.!?]*$/, "."); }
