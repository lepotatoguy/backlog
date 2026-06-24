import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { steamId, apiKey } = await req.json();
    if (!steamId || !apiKey) {
      return new Response(JSON.stringify({ error: "steamId and apiKey are required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Resolve vanity URL → Steam64 ID (17-digit number)
    let resolvedId = String(steamId).trim();
    if (!/^\d{17}$/.test(resolvedId)) {
      const vanityUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(resolvedId)}`;
      const vr = await fetch(vanityUrl);
      const vd = await vr.json();
      if (vd.response?.success !== 1) {
        return new Response(JSON.stringify({ error: "Could not resolve Steam ID. Check your vanity URL." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      resolvedId = vd.response.steamid;
    }

    const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${resolvedId}&include_appinfo=1&include_played_free_games=1&format=json`;
    const gr = await fetch(gamesUrl);
    const gd = await gr.json();

    if (!gd.response?.games) {
      return new Response(JSON.stringify({ error: "No games found. Make sure your Steam profile is set to Public." }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const games = gd.response.games.map((g: {
      appid: number; name: string; playtime_forever?: number; img_icon_url?: string;
    }) => ({
      appid:    g.appid,
      name:     g.name,
      playtime: g.playtime_forever ?? 0,
      icon:     g.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
        : null,
    }));

    return new Response(JSON.stringify({ games, steamId: resolvedId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
