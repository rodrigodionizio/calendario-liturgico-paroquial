/**
 * Garante que a lista ASSETS do service worker corresponde aos scripts e estilos
 * que index.html realmente carrega.
 *
 * Sem essa checagem, o precache passa a listar arquivos mortos e a omitir os vivos —
 * o site continua funcionando online e quebra silenciosamente offline.
 */
import { readFileSync } from "node:fs";

const sw = readFileSync("docs/sw.js", "utf8");
const html = readFileSync("docs/index.html", "utf8");

const bloco = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!bloco) {
  console.error("Não encontrei a lista ASSETS em docs/sw.js.");
  process.exit(1);
}

const norm = (p) => p.replace(/^\.\//, "").replace(/^\//, "");
const precache = new Set(
  [...bloco[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => norm(m[1]))
);

// Só os recursos locais: CDNs não entram no precache.
const locais = [
  ...[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
].filter((p) => !/^https?:\/\//.test(p)).map(norm);

const faltando = locais.filter((p) => !precache.has(p));
const sobrando = [...precache].filter(
  (p) => !locais.includes(p) && !["index.html", "manifest.json"].includes(p)
);

let falhou = false;
if (faltando.length) {
  console.error("Carregados por index.html mas ausentes do precache:\n  " + faltando.join("\n  "));
  falhou = true;
}
if (sobrando.length) {
  console.error("No precache mas não carregados por index.html:\n  " + sobrando.join("\n  "));
  falhou = true;
}
if (falhou) {
  console.error("\nAlinhe a lista ASSETS em docs/sw.js e incremente CACHE_NAME.");
  process.exit(1);
}
console.log(`Precache coerente: ${precache.size} arquivos.`);
