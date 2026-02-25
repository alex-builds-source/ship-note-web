import { buildDraftFromGitHub } from "../../src/web/generate.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const result = await buildDraftFromGitHub({
      repoInput: body.repo,
      preset: body.preset,
      baseRef: body.baseRef,
      releaseUrl: body.releaseUrl,
      token: env.GITHUB_TOKEN,
    });
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, 400);
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Use POST /api/generate" }, 405);
}
