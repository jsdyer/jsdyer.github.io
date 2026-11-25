/* Screen Places TMDb lookup. Root can inline this module after removing export keywords.
   Dispatch /api/screenplaces/* before the ordinary shared apiRoute plan.
   Returns the shared gateway's {status, body, headers} response descriptor. */
const spApiError = (status, code, message, retry) => ({
  status,
  body: { error: { code, message } },
  headers: retry ? { "Retry-After": String(retry) } : {},
});
function screenplacesRoute(url) {
  if (url.pathname !== "/api/screenplaces/title") return null;
  const id = url.searchParams.get("wikidata");
  if (
    !id ||
    !/^Q[1-9]\d{0,11}$/.test(id) ||
    [...url.searchParams.keys()].some((k) => k !== "wikidata") ||
    url.searchParams.getAll("wikidata").length !== 1
  )
    throw new Error("invalid_query");
  return {
    id,
    target: `https://api.themoviedb.org/3/find/${id}?external_source=wikidata_id&language=en-US`,
  };
}
function screenplacesNormalize(payload) {
  let type = "movie",
    item = payload?.movie_results?.[0];
  if (!item) {
    type = "tv";
    item = payload?.tv_results?.[0];
  }
  if (!item) return null;
  if (!Number.isInteger(item.id) || item.id <= 0)
    throw new Error("invalid_source");
  const image =
    typeof item.poster_path === "string" &&
    /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(item.poster_path)
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null;
  const rating = Number(item.vote_average),
    votes = Number(item.vote_count);
  return {
    id: item.id,
    type,
    title: String(item.title || item.name || "").slice(0, 300),
    overview: String(item.overview || "").slice(0, 5000),
    poster_url: image,
    rating:
      Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : null,
    rating_count: Number.isSafeInteger(votes) && votes >= 0 ? votes : 0,
    release_date: String(item.release_date || item.first_air_date || "").slice(
      0,
      10,
    ),
    tmdb_url: `https://www.themoviedb.org/${type}/${item.id}`,
  };
}
async function spApiJson(response) {
  if (Number(response.headers.get("Content-Length") || 0) > 524288)
    throw new Error("oversize");
  if (!/application\/json/i.test(response.headers.get("Content-Type") || ""))
    throw new Error("invalid_source");
  const reader = response.body.getReader(),
    parts = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > 524288) {
        await reader.cancel();
        throw new Error("oversize");
      }
      parts.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.byteLength;
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
  );
}
async function spApiBudget(db, key, now, width, max) {
  const start = Math.floor(now / width) * width,
    expiry = start + width;
  const row = await db
    .prepare(
      "INSERT INTO screenplaces_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=CASE WHEN expiry<=? THEN 1 ELSE hits+1 END, expiry=excluded.expiry RETURNING hits",
    )
    .bind(key, expiry, now)
    .first();
  return row?.hits <= max;
}
async function screenplacesApiHandle(request, env, ctx) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== "https://coolcode.ca")
    return spApiError(403, "origin_denied", "Origin is not allowed.");
  if (request.method === "OPTIONS") return { status: 204 };
  if (request.method !== "GET")
    return spApiError(405, "method_denied", "Use GET for title lookups.");
  let plan;
  try {
    plan = screenplacesRoute(new URL(request.url));
  } catch {
    return spApiError(
      400,
      "invalid_query",
      "Provide one Wikidata item ID, such as Q2744.",
    );
  }
  if (!plan)
    return spApiError(
      404,
      "unknown_route",
      "This Screen Places endpoint does not exist.",
    );
  if (!env.TMDB_READ_ACCESS_TOKEN)
    return spApiError(
      503,
      "not_configured",
      "Film details are not configured yet. The filming-location catalogue is still available.",
    );
  const db = env.DB;
  if (!db)
    return spApiError(
      503,
      "storage_unavailable",
      "The title cache is temporarily unavailable.",
    );
  try {
    await db.batch([
      db.prepare(
        "CREATE TABLE IF NOT EXISTS screenplaces_cache(id TEXT PRIMARY KEY,payload TEXT NOT NULL,expiry INTEGER NOT NULL)",
      ),
      db.prepare(
        "CREATE TABLE IF NOT EXISTS screenplaces_budget(id TEXT PRIMARY KEY,hits INTEGER NOT NULL,expiry INTEGER NOT NULL)",
      ),
      db.prepare(
        "CREATE TABLE IF NOT EXISTS screenplaces_salts(day TEXT PRIMARY KEY,secret TEXT NOT NULL)",
      ),
    ]);
    const now = Date.now(),
      day = new Date(now).toISOString().slice(0, 10);
    await db.batch([
      db.prepare("DELETE FROM screenplaces_cache WHERE expiry<=?").bind(now),
      db.prepare("DELETE FROM screenplaces_budget WHERE expiry<=?").bind(now),
      db.prepare("DELETE FROM screenplaces_salts WHERE day<?").bind(day),
    ]);
    const cached = await db
      .prepare("SELECT payload FROM screenplaces_cache WHERE id=? AND expiry>?")
      .bind(plan.id, now)
      .first("payload");
    if (cached)
      return {
        body: JSON.parse(cached),
        headers: { "Cache-Control": "public, max-age=3600" },
      };
    const cooldown = await db
      .prepare("SELECT expiry FROM screenplaces_budget WHERE id=? AND expiry>?")
      .bind("source_cooldown", now)
      .first("expiry");
    if (cooldown)
      return spApiError(
        429,
        "source_busy",
        "TMDb is temporarily limiting requests. Please retry later.",
        Math.ceil((cooldown - now) / 1000),
      );
    const spent = await db
      .prepare("SELECT hits FROM screenplaces_budget WHERE id=? AND expiry>?")
      .bind("global", now)
      .first("hits");
    if (spent >= 2000)
      return spApiError(
        429,
        "daily_limit",
        "Today’s film-detail request budget is exhausted. The location catalogue remains available.",
        3600,
      );
    await db
      .prepare(
        "INSERT OR IGNORE INTO screenplaces_salts(day,secret) VALUES(?,?)",
      )
      .bind(day, crypto.randomUUID())
      .run();
    const salt = await db
      .prepare("SELECT secret FROM screenplaces_salts WHERE day=?")
      .bind(day)
      .first("secret");
    const ip = request.headers.get("CF-Connecting-IP") || "unknown",
      digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(salt + "|screenplaces|" + ip),
      );
    const client = Array.from(new Uint8Array(digest), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    if (!(await spApiBudget(db, "client:" + client, now, 3600000, 40)))
      return spApiError(
        429,
        "client_wait",
        "Too many uncached film lookups. Please try again later.",
        3600,
      );
    if (!(await spApiBudget(db, "global", now, 86400000, 2000)))
      return spApiError(
        429,
        "daily_limit",
        "Today’s film-detail request budget is exhausted. The location catalogue remains available.",
        3600,
      );
    let response;
    try {
      response = await fetch(plan.target, {
        headers: {
          Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
        redirect: "manual",
      });
    } catch {
      return spApiError(
        502,
        "source_network",
        "TMDb could not be reached. Please try again later.",
      );
    }
    if (response.status === 429) {
      const retry = Math.max(
        60,
        Math.min(3600, Number(response.headers.get("Retry-After")) || 60),
      );
      await response.body?.cancel();
      await db
        .prepare(
          "INSERT INTO screenplaces_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=excluded.expiry",
        )
        .bind("source_cooldown", now + retry * 1000)
        .run();
      return spApiError(
        429,
        "source_busy",
        "TMDb is temporarily limiting requests. Please retry shortly.",
        retry,
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      return spApiError(
        502,
        "source_failure",
        "TMDb could not return this title. Please retry later.",
      );
    }
    const data = screenplacesNormalize(await spApiJson(response));
    const result = { fetched_at: new Date(now).toISOString(), data };
    await db
      .prepare(
        "INSERT INTO screenplaces_cache(id,payload,expiry) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,expiry=excluded.expiry",
      )
      .bind(plan.id, JSON.stringify(result), now + (data ? 86400000 : 3600000))
      .run();
    await db
      .prepare(
        "DELETE FROM screenplaces_cache WHERE id IN (SELECT id FROM screenplaces_cache ORDER BY expiry DESC LIMIT -1 OFFSET 5000)",
      )
      .run();
    return {
      body: result,
      headers: { "Cache-Control": "public, max-age=3600" },
    };
  } catch {
    return spApiError(
      502,
      "lookup_failed",
      "Film details are temporarily unavailable. The location catalogue remains available.",
    );
  }
}
