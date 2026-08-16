import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the NOCTYS application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="fr">/i);
  assert.match(html, /<title>NOCTYS Creative Hub<\/title>/i);
  assert.match(html, /NOCTYS/);
  assert.match(html, /Creative Hub/);
  assert.match(html, /STUDIO/);
  assert.match(html, /Espace/);
  assert.match(html, /INITIALISATION DU HUB/);
});

test("keeps provider secrets server-side and provisions persistent imports", async () => {
  const [generatorRoute, integrationsRoute, templateRoute, hosting, example] = await Promise.all([
    readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/integrations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/templates/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../examples/template-import-match-night.json", import.meta.url), "utf8"),
  ]);

  assert.match(generatorRoute, /OPENAI_API_KEY/);
  assert.match(generatorRoute, /GEMINI_API_KEY/);
  assert.match(generatorRoute, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(generatorRoute, /https:\/\/generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.doesNotMatch(integrationsRoute, /value:\s*secrets\.(?:OPENAI|GEMINI)_API_KEY/);
  assert.match(templateRoute, /image\/png/);
  assert.match(templateRoute, /application\/json/);
  assert.equal(JSON.parse(hosting).r2, "TEMPLATE_ASSETS");
  assert.equal(JSON.parse(example).network, "instagram");
});
