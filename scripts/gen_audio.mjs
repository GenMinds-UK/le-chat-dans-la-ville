// Generates the pronunciation clips (GAME_PLAN.md 3.5): one mp3 per item and
// phrase, per language that has content, at public/audio/<lang>/<id>.mp3.
//
//   npm run gen:audio                 # only the clips that do not exist yet
//   npm run gen:audio -- --force      # regenerate everything
//   npm run gen:audio -- --lang=fr    # one language
//   npm run gen:audio -- --only=bread,croissant
//   npm run gen:audio -- --dry-run    # list what would be generated, no API calls
//
// Needs MISTRAL_API_KEY in the environment or in .env.local. Each clip is one
// billable text-to-speech call.
//
// content/ and lib/voice/voices.ts are TypeScript with extensionless imports.
// They are loaded directly: Node strips the types itself (22.18+), and the
// small resolve hook below adds the missing ".ts".

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "audio");

// ---- loading the TypeScript content ----

if (typeof registerHooks !== "function" || !process.features?.typescript) {
  console.error(
    `gen_audio needs Node 22.18 or newer (found ${process.version}): it loads the TypeScript in content/ directly.`,
  );
  process.exit(1);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const alias = specifier.startsWith("@/");
    if (!relative && !alias) return nextResolve(specifier, context);
    // "@/x" is the project root (tsconfig paths).
    const base = alias
      ? pathToFileURL(path.join(ROOT, specifier.slice(2))).href
      : new URL(specifier, context.parentURL).href;
    for (const suffix of ["", ".ts", ".tsx", "/index.ts"]) {
      const candidate = base + suffix;
      if (statSync(fileURLToPath(candidate), { throwIfNoEntry: false })?.isFile()) {
        return nextResolve(candidate, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

// ---- options and key ----

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const force = flag("force");
const dryRun = flag("dry-run");
const onlyLang = option("lang");
const onlyIds = option("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;

function readKey() {
  if (process.env.MISTRAL_API_KEY) return process.env.MISTRAL_API_KEY;
  const envFile = path.join(ROOT, ".env.local");
  if (!existsSync(envFile)) return null;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?MISTRAL_API_KEY\s*=\s*(.*)\s*$/.exec(line);
    if (m) return m[1].replace(/^(['"])(.*)\1$/, "$2").trim() || null;
  }
  return null;
}

// ---- what to generate ----

const { LANGS, getVenues } = await import("../content/index.ts");
const { ITEM_VOICE, TTS_MODEL } = await import("../lib/voice/voices.ts");

/** A bare word is read with flat, cut-off intonation; a full stop gives it a natural ending. */
const spoken = (term) => (/[.!?…]$/.test(term.trim()) ? term.trim() : `${term.trim()}.`);

const jobs = [];
for (const { code: lang } of LANGS) {
  if (onlyLang && onlyLang !== lang) continue;
  const seen = new Map();
  for (const venue of getVenues(lang)) {
    for (const entry of [...venue.items, ...venue.phrases]) {
      if (onlyIds && !onlyIds.includes(entry.id)) continue;
      const earlier = seen.get(entry.id);
      if (earlier !== undefined) {
        if (earlier !== entry.term) {
          console.warn(`! ${lang}/${entry.id}: "${entry.term}" in ${venue.id} differs from "${earlier}"; keeping the first`);
        }
        continue;
      }
      seen.set(entry.id, entry.term);
      jobs.push({ lang, id: entry.id, term: entry.term, file: path.join(OUT_DIR, lang, `${entry.id}.mp3`) });
    }
  }
}

if (jobs.length === 0) {
  console.log("No content found for that selection.");
  process.exit(0);
}

const todo = jobs.filter((j) => force || !existsSync(j.file));
console.log(`${jobs.length} clips in content, ${jobs.length - todo.length} already exist, ${todo.length} to generate.`);
if (dryRun) {
  for (const j of todo) console.log(`  ${j.lang}/${j.id}.mp3  "${j.term}"  voice ${ITEM_VOICE[j.lang]}`);
  process.exit(0);
}
if (todo.length === 0) process.exit(0);

const apiKey = readKey();
if (!apiKey) {
  console.error("MISTRAL_API_KEY is not set (environment or .env.local).");
  process.exit(1);
}

// ---- generate ----

const { Mistral } = await import("@mistralai/mistralai");
const client = new Mistral({ apiKey });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** mp3 data starts with an ID3 tag or an MPEG frame sync (0xFFEx / 0xFFFx). */
const looksLikeMp3 = (buf) =>
  buf.length > 1000 &&
  (buf.subarray(0, 3).toString("latin1") === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0));

async function synthesise(job) {
  for (let attempt = 1; ; attempt++) {
    try {
      // SpeechResponse is { audioData: string } — the audio, base64 encoded.
      const res = await client.audio.speech.complete({
        model: TTS_MODEL,
        input: spoken(job.term),
        voiceId: ITEM_VOICE[job.lang],
        responseFormat: "mp3",
      });
      const buf = Buffer.from(res.audioData, "base64");
      if (!looksLikeMp3(buf)) throw new Error(`response is not a usable mp3 (${buf.length} bytes)`);
      return buf;
    } catch (err) {
      const status = err?.statusCode;
      const retryable = status === 429 || (status >= 500 && status < 600) || status === undefined;
      if (!retryable || attempt >= 4) throw err;
      await sleep(1500 * attempt);
    }
  }
}

let made = 0;
const failed = [];
for (const job of todo) {
  try {
    const buf = await synthesise(job);
    mkdirSync(path.dirname(job.file), { recursive: true });
    const tmp = `${job.file}.tmp`;
    writeFileSync(tmp, buf);
    renameSync(tmp, job.file);
    made++;
    console.log(`  ${job.lang}/${job.id}.mp3  ${buf.length} bytes  "${job.term}"`);
  } catch (err) {
    const message = String(err?.body ?? err?.message ?? err).slice(0, 200);
    failed.push(job);
    console.error(`x ${job.lang}/${job.id}: ${message}`);
  }
}

console.log(`Done: ${made} written${failed.length ? `, ${failed.length} failed (run again to retry them)` : ""}.`);
process.exit(failed.length ? 1 : 0);
