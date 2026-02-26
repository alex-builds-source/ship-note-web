import { buildDraftFromGitHub } from "../../src/web/generate.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
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

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const result = await buildDraftFromGitHub({
      repoInput: body.repo,
      preset: body.preset,
      baseRef: body.baseRef,
      targetRef: body.targetRef,
      releaseUrl: body.releaseUrl,
      token: env.GITHUB_TOKEN,
    });
    return json({ ok: true, ...result });
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

    return json({ ok: false, error: String(error.message || error) }, 400);
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Use POST /api/generate" }, 405);
}
