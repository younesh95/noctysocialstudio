import { env } from "cloudflare:workers";

interface RuntimeSecrets {
  OPENAI_API_KEY?: string;
  OPENAI_TEXT_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_IMAGE_MODEL?: string;
}

export async function GET() {
  const secrets = env as unknown as RuntimeSecrets;
  return Response.json({
    chatgpt: {
      configured: Boolean(secrets.OPENAI_API_KEY),
      textModel: secrets.OPENAI_TEXT_MODEL || "gpt-5.6-luna",
      imageModel: secrets.OPENAI_IMAGE_MODEL || "gpt-image-2",
    },
    gemini: {
      configured: Boolean(secrets.GEMINI_API_KEY),
      textModel: secrets.GEMINI_TEXT_MODEL || "gemini-3.6-flash",
      imageModel: secrets.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
