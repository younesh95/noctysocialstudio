type Provider = "chatgpt" | "gemini";
type Mode = "logo" | "image" | "text";

export async function POST(request: Request) {
  const payload = await request.json() as { provider?: Provider; mode?: Mode; prompt?: string };
  const prompt = payload.prompt?.trim() ?? "";
  if (!prompt || !payload.mode || !payload.provider) return Response.json({error:"Brief incomplet"},{status:400});
  await new Promise((resolve)=>setTimeout(resolve,650));
  return Response.json({result:demoResult(payload.mode,prompt,payload.provider)});
}

function demoResult(mode: Mode, prompt: string, provider: Provider) {
  const engine = provider === "chatgpt" ? "ChatGPT" : "Gemini";
  if (mode === "text") return `La nuit ne fait que commencer. ${sentence(prompt)} Rejoignez-nous pour vivre chaque round, chaque clutch et chaque instant décisif. 🌙\n\n#NOCTYS #CS2 #Esport — Proposition ${engine}`;
  if (mode === "logo") return `Direction proposée : ${sentence(prompt)} Construction en formes pleines autour d’un N angulaire, capuche suggérée par l’espace négatif, croissant et étoile conservés. Palette limitée à Noir Obsidienne, Blanc Lunaire et Violet NOCTYS. Variante lisible à 32 px, sans glow ni dégradé. Concept préparé avec ${engine}.`;
  return `Direction visuelle : ${sentence(prompt)} Scène nocturne premium, cadrage cinématique, profondeur graphite et halo violet contrôlé. Logo placé dans une zone calme avec 12,5 % de protection, contraste argent lunaire et espace réservé au message principal. Prompt préparé avec ${engine}.`;
}

function sentence(value:string){const clean=value.replace(/\s+/g," ").trim();return clean.charAt(0).toUpperCase()+clean.slice(1).replace(/[.!?]*$/,".")}
