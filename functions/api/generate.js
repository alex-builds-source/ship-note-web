import { buildDraftFromGitHub } from "../../src/web/generate.js";

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 30;
const ipBuckets = globalThis.__shipNoteWebIpBuckets || (globalThis.__shipNoteWebIpBuckets = new Map());

function trimIpBuckets(now) {
  for (const [ip, rec] of ipBuckets.entries()) {
    if ((now - rec.windowStart) > WINDOW_MS * 2) ipBuckets.delete(ip);
  }
}

function enforceLocalRateLimit(ip) {
  const now = Date.now();
  trimIpBuckets(now);

  const current = ipBuckets.get(ip);
  if (!current || (now - current.windowStart) >= WINDOW_MS) {
    ipBuckets.set(ip, { windowStart: now, count: 1 });
    return null;
  }

  current.count += 1;
  if (current.count > MAX_REQ_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - current.windowStart)) / 1000));
    return { retryAfterSec };
  }
  return null;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function rateLimitHint(error, hasToken) {
  const resetUnix = Number(error?.rateLimitReset || 0);
  const resetIso = Number.isFinite(resetUnix) && resetUnix > 0
    ? new Date(resetUnix * 1000).toISOString().replace(".000", "")
    : null;

  if (hasToken) {
    return resetIso
      ? `GitHub API limit reached. Try again after ${resetIso} UTC, or reduce request frequency.`
      : "GitHub API limit reached. Try again shortly, or reduce request frequency.";
  }

  return resetIso
    ? `Anonymous GitHub API limit reached. Configure GITHUB_TOKEN and retry after ${resetIso} UTC.`
    : "Anonymous GitHub API limit reached. Configure GITHUB_TOKEN in Cloudflare Pages to raise API budget.";
}

function normalizeBody(raw) {
  const body = raw && typeof raw === "object" ? raw : {};
  const includeWhyRaw = body.includeWhy ?? body.include_why;
  return {
    repo: String(body.repo || body.repository || "").trim(),
    preset: String(body.preset || "standard").trim(),
    destination: String(body.destination || "release").trim(),
    includeWhy: includeWhyRaw === true || includeWhyRaw === "true" || includeWhyRaw === 1 || includeWhyRaw === "1",
    baseRef: String(body.baseRef || body.base_ref || "").trim(),
    targetRef: String(body.targetRef || body.target_ref || "").trim(),
    releaseUrl: String(body.releaseUrl || body.release_url || "").trim(),
  };
}

function validateInput(input) {
  if (!input.repo) return "repo is required";
  if (input.repo.length > 220) return "repo is too long";

  if (!["standard", "short"].includes(input.preset)) {
    return "preset must be one of: standard, short";
  }

  if (!["release", "update", "social", "internal"].includes(input.destination)) {
    return "destination must be one of: release, update, social, internal";
  }

  if (input.baseRef.length > 120) return "baseRef is too long";
  if (input.targetRef.length > 120) return "targetRef is too long";
  if (input.releaseUrl.length > 500) return "releaseUrl is too long";
  return null;
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const localLimit = enforceLocalRateLimit(ip);
  if (localLimit) {
    return json({
      ok: false,
      code: "LOCAL_RATE_LIMIT",
      error: "Too many requests for this endpoint.",
      hint: `Try again in ~${localLimit.retryAfterSec}s.`,
    }, 429, { "retry-after": String(localLimit.retryAfterSec) });
  }

  try {
    const rawBody = await request.json();
    const body = normalizeBody(rawBody);
    const inputError = validateInput(body);
    if (inputError) {
      return json({ ok: false, code: "BAD_REQUEST", error: inputError }, 400);
    }

    const result = await buildDraftFromGitHub({
      repoInput: body.repo,
      preset: body.preset,
      destination: body.destination,
      includeWhy: body.includeWhy,
      baseRef: body.baseRef,
      targetRef: body.targetRef,
      releaseUrl: body.releaseUrl,
      token: env.GITHUB_TOKEN,
    });

    return json({ ok: true, ...result }, 200, { "x-ship-note-schema": String(result.schema_version || "1.0") });
  } catch (error) {
    const status = Number(error?.status || 0);
    const remaining = error?.rateLimitRemaining;
    const likelyRateLimit = status === 429 || (status === 403 && (remaining === "0" || /rate limit/i.test(String(error?.message || ""))));

    if (likelyRateLimit) {
      return json({
        ok: false,
        error: "GitHub API rate limit reached.",
        code: "GITHUB_RATE_LIMIT",
        hint: rateLimitHint(error, Boolean(env.GITHUB_TOKEN)),
      }, 429);
    }

    const message = String(error?.message || error || "request failed");
    const code = status === 404 ? "NOT_FOUND" : "BAD_REQUEST";
    return json({ ok: false, code, error: message }, status >= 400 && status < 600 ? status : 400);
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Use POST /api/generate" }, 405);
}
