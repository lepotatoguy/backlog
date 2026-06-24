import { useState, useEffect } from "react";

// ── Hooks ────────────────────────────────────────────────────────────────────
export function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function strToHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}
export function gameBg(title) {
  const h1 = strToHue(title), h2 = (h1 + 45) % 360;
  return `linear-gradient(160deg,hsl(${h1},50%,18%) 0%,hsl(${h2},60%,10%) 100%)`;
}
export function gameAccent(title) { return `hsl(${strToHue(title)},65%,62%)`; }
export function toSlug(name) { return name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }

// ── Meta ─────────────────────────────────────────────────────────────────────
export const DEFAULT_TITLE = "Backlog — Track Every Game You've Played";
export const DEFAULT_DESC  = "Log your game backlog, track what you're playing, rate and review games, and share your gaming profile with friends.";

export function setMeta({ title, description, url }) {
  document.title = title;
  const upsert = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };
  upsert('meta[name="description"]',         'content', description);
  upsert('meta[property="og:title"]',        'content', title);
  upsert('meta[property="og:description"]',  'content', description);
  upsert('meta[property="og:url"]',          'content', url);
  upsert('meta[name="twitter:title"]',       'content', title);
  upsert('meta[name="twitter:description"]', 'content', description);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', url);
}

// ── Static game data (used in LandingPage + ProfileOverview favorites) ────────
export const GAMES = [
  { id: 1,  title: "Elden Ring",             developer: "FromSoftware",        year: 2022, genre: "RPG" },
  { id: 2,  title: "Baldur's Gate 3",        developer: "Larian Studios",      year: 2023, genre: "RPG" },
  { id: 3,  title: "The Witcher 3",          developer: "CD Projekt Red",      year: 2015, genre: "RPG" },
  { id: 4,  title: "Hollow Knight",          developer: "Team Cherry",         year: 2017, genre: "Metroidvania" },
  { id: 5,  title: "Hades",                  developer: "Supergiant Games",    year: 2020, genre: "Roguelike" },
  { id: 6,  title: "God of War",             developer: "Santa Monica Studio", year: 2018, genre: "Action" },
  { id: 7,  title: "Red Dead Redemption 2",  developer: "Rockstar Games",      year: 2018, genre: "Action-Adventure" },
  { id: 8,  title: "Disco Elysium",          developer: "ZA/UM",              year: 2019, genre: "RPG" },
  { id: 9,  title: "Celeste",                developer: "Matt Makes Games",    year: 2018, genre: "Platformer" },
  { id: 10, title: "Outer Wilds",            developer: "Mobius Digital",      year: 2019, genre: "Adventure" },
  { id: 11, title: "Sekiro",                 developer: "FromSoftware",        year: 2019, genre: "Action-RPG" },
  { id: 12, title: "Portal 2",               developer: "Valve",               year: 2011, genre: "Puzzle" },
  { id: 13, title: "Stardew Valley",         developer: "ConcernedApe",        year: 2016, genre: "Simulation" },
  { id: 14, title: "Undertale",              developer: "Toby Fox",            year: 2015, genre: "RPG" },
  { id: 15, title: "Cyberpunk 2077",         developer: "CD Projekt Red",      year: 2020, genre: "RPG" },
  { id: 16, title: "Breath of the Wild",     developer: "Nintendo",            year: 2017, genre: "Action-Adventure" },
  { id: 17, title: "Resident Evil 4",        developer: "Capcom",              year: 2023, genre: "Survival Horror" },
  { id: 18, title: "Alan Wake 2",            developer: "Remedy Entertainment",year: 2023, genre: "Thriller" },
  { id: 19, title: "Divinity: Original Sin 2",developer:"Larian Studios",     year: 2017, genre: "RPG" },
  { id: 20, title: "Dark Souls III",         developer: "FromSoftware",        year: 2016, genre: "Action-RPG" },
  { id: 21, title: "Half-Life: Alyx",        developer: "Valve",               year: 2020, genre: "Shooter" },
  { id: 22, title: "Armored Core VI",        developer: "FromSoftware",        year: 2023, genre: "Action" },
  { id: 23, title: "Death Stranding",        developer: "Kojima Productions",  year: 2019, genre: "Action" },
  { id: 24, title: "The Last of Us",         developer: "Naughty Dog",         year: 2013, genre: "Action-Adventure" },
];
export const GAME_MAP = Object.fromEntries(GAMES.map(g => [g.id, g]));

// ── Shared components ─────────────────────────────────────────────────────────
export function Badge({ status }) {
  const STATUS_META = {
    "Playing":       { bg: "var(--success-bg)", text: "var(--success)", border: "var(--success-border)" },
    "Played":        { bg: "var(--primary-bg)", text: "var(--primary)", border: "var(--primary-border)" },
    "Want to Play":  { bg: "var(--accent-bg)",  text: "var(--accent)",  border: "var(--accent-border)"  },
  };
  if (!status) return null;
  const m = STATUS_META[status];
  if (!m) return null;
  return <span style={{ fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:5,
    background:m.bg,color:m.text,border:`1px solid ${m.border}`,
    letterSpacing:"0.06em",whiteSpace:"nowrap" }}>{status.toUpperCase()}</span>;
}

export function Stars({ value=0, onChange, size=18, readonly }) {
  const [hov, setHov] = useState(0);
  const disp = hov || value;
  const getVal = (e, i) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX < rect.left + rect.width / 2 ? i - 0.5 : i;
  };
  return (
    <div style={{ display:"flex",gap:2 }} onMouseLeave={() => !readonly && setHov(0)}>
      {[1,2,3,4,5].map(i => {
        const full = disp >= i;
        const half = !full && disp >= i - 0.5;
        return (
          <span key={i}
            onMouseMove={e => !readonly && setHov(getVal(e, i))}
            onClick={e => {
              if (readonly || !onChange) return;
              const v = getVal(e, i);
              onChange(v === value ? 0 : v);
            }}
            style={{ fontSize:size,cursor:readonly?"default":"pointer",lineHeight:1,
              userSelect:"none",position:"relative",display:"inline-block" }}>
            <span style={{ color:"var(--border)" }}>★</span>
            {(full || half) && (
              <span style={{ position:"absolute",left:0,top:0,overflow:"hidden",
                color:"var(--accent)",width:full?"100%":"50%",display:"block" }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function MiniCover({ title, cover=null, size=52 }) {
  return (
    <div style={{ width:size,height:size*1.35,borderRadius:6,flexShrink:0,
      background:cover ? `url(${cover}) center/cover no-repeat` : gameBg(title),
      position:"relative",overflow:"hidden" }}>
      {!cover && (
        <>
          <div style={{ position:"absolute",inset:0,
            background:"linear-gradient(to bottom,transparent 40%,#00000088 100%)" }}/>
          <div style={{ position:"absolute",bottom:3,left:0,right:0,textAlign:"center",
            fontSize:9,color:"#ffffffCC",fontWeight:700,padding:"0 4px",lineHeight:1.2 }}>
            {title.length>15 ? title.slice(0,13)+"…" : title}
          </div>
        </>
      )}
    </div>
  );
}

export function SpoilerText({ text }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ position:"relative",cursor:revealed?"default":"pointer" }}
      onClick={e=>{ if(!revealed){ e.stopPropagation(); setRevealed(true); } }}>
      <div style={{ fontSize:12,color:"#7B8099",lineHeight:1.6,
        filter:revealed?"none":"blur(4px)",transition:"filter 0.2s",userSelect:revealed?"auto":"none" }}>
        {text}
      </div>
      {!revealed && (
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <span style={{ background:"#F0A50022",border:"1px solid #F0A50044",borderRadius:6,
            padding:"3px 10px",fontSize:11,fontWeight:700,color:"#F0A500" }}>Tap to reveal spoiler</span>
        </div>
      )}
    </div>
  );
}
