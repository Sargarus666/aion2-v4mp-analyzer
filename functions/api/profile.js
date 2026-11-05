// Cloudflare Pages Function scaffold.
// This endpoint only checks whether the public profile page is reachable.
// It does not bypass anti-bot controls or claim to parse character data.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const profile = url.searchParams.get("url");
  if (!profile) return Response.json({ ok: false, error: "Missing url parameter" }, { status: 400 });

  let parsed;
  try { parsed = new URL(profile); } catch {
    return Response.json({ ok: false, error: "Invalid URL" }, { status: 400 });
  }
  if (parsed.hostname !== "shugo.gg" || !parsed.pathname.startsWith("/character/")) {
    return Response.json({ ok: false, error: "Only public Shuggo.GG character URLs are allowed" }, { status: 400 });
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "AION2-v4mp-analyzer/0.1 (+read-only profile availability check)" }
    });
    return Response.json({
      ok: response.ok,
      status: response.status,
      reachable: response.ok,
      parser: "not_implemented",
      message: "Page reachability checked only; profile parsing is not implemented."
    }, { status: 200 });
  } catch {
    return Response.json({ ok: false, reachable: false, parser: "not_implemented", error: "Upstream request failed" }, { status: 502 });
  }
}