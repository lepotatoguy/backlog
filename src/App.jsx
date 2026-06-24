import { supabase } from "./supabase.js"
import { getPopular, searchGames, searchGamesFiltered, getDetail, fmtGame } from "./rawg.js"
import { useTheme } from "./ThemeContext.jsx"
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

const GAMES = [
  { id: 1, title: "Elden Ring", developer: "FromSoftware", year: 2022, genre: "RPG", description: "An open-world action RPG built with George R.R. Martin. Vast, interconnected, and relentlessly demanding — the Souls formula perfected and expanded." },
  { id: 2, title: "Baldur's Gate 3", developer: "Larian Studios", year: 2023, genre: "RPG", description: "Every choice carries weight. Gather your party and navigate a richly simulated world of consequence. The new gold standard for CRPGs." },
  { id: 3, title: "The Witcher 3", developer: "CD Projekt Red", year: 2015, genre: "RPG", description: "Geralt hunts for his adopted daughter across a war-ravaged world. Hundreds of hours of densely written quests, each with genuine moral weight." },
  { id: 4, title: "Hollow Knight", developer: "Team Cherry", year: 2017, genre: "Metroidvania", description: "Descend into the haunting underground kingdom of Hallownest. Hand-crafted, atmospheric, and fiercely unforgiving — one of the best Metroidvanias ever made." },
  { id: 5, title: "Hades", developer: "Supergiant Games", year: 2020, genre: "Roguelike", description: "Defy the god of the dead. Every failed run reveals more story. Tight combat, gorgeous art, and an exceptional cast make every attempt feel meaningful." },
  { id: 6, title: "God of War", developer: "Santa Monica Studio", year: 2018, genre: "Action", description: "A father and son's journey through the Norse realms. Kratos and Atreus face gods, giants, and each other in an emotionally powerful reinvention of the series." },
  { id: 7, title: "Red Dead Redemption 2", developer: "Rockstar Games", year: 2018, genre: "Action-Adventure", description: "Arthur Morgan rides across a dying American frontier. A slow, meditative epic about loyalty and mortality set in gaming's most detailed open world." },
  { id: 8, title: "Disco Elysium", developer: "ZA/UM", year: 2019, genre: "RPG", description: "A detective RPG where your own mind is the dungeon. Choose your skills, build an ideology, and solve a murder in the crumbling city of Revachol." },
  { id: 9, title: "Celeste", developer: "Matt Makes Games", year: 2018, genre: "Platformer", description: "Climb a mountain. A precision platformer with extraordinary heart — the real challenge is the protagonist's battle with herself, not the level design." },
  { id: 10, title: "Outer Wilds", developer: "Mobius Digital", year: 2019, genre: "Adventure", description: "Explore a solar system trapped in an endless 22-minute loop. Pure discovery — no quest markers, no waypoints. Just curiosity and a dying star." },
  { id: 11, title: "Sekiro", developer: "FromSoftware", year: 2019, genre: "Action-RPG", description: "Shinobi arts in Sengoku Japan. Patience, posture, and precision define the hardest — and most satisfying — game in the genre." },
  { id: 12, title: "Portal 2", developer: "Valve", year: 2011, genre: "Puzzle", description: "Think with portals, again. The pinnacle of environmental puzzle design, wrapped in pitch-perfect dark comedy and an exceptional co-op mode." },
  { id: 13, title: "Stardew Valley", developer: "ConcernedApe", year: 2016, genre: "Simulation", description: "Inherit your grandfather's farm. Built alone by one developer, it became one of the most beloved games ever made — a quiet masterpiece of cozy depth." },
  { id: 14, title: "Undertale", developer: "Toby Fox", year: 2015, genre: "RPG", description: "A game about choosing not to fight. Uniquely self-aware about what games are, what players expect, and what it means to care about fictional characters." },
  { id: 15, title: "Cyberpunk 2077", developer: "CD Projekt Red", year: 2020, genre: "RPG", description: "Night City never sleeps. After a rough launch, Phantom Liberty transformed this into one of the most immersive RPG worlds in the medium's history." },
  { id: 16, title: "Breath of the Wild", developer: "Nintendo", year: 2017, genre: "Action-Adventure", description: "Link wakes in a ruined Hyrule. A reinvention of open-world design where every system feeds every other and curiosity is always, always rewarded." },
  { id: 17, title: "Resident Evil 4", developer: "Capcom", year: 2023, genre: "Survival Horror", description: "A definitive remake of a landmark title. Tighter, scarier, and more stylish than the original without losing what made it revolutionary twenty years ago." },
  { id: 18, title: "Alan Wake 2", developer: "Remedy Entertainment", year: 2023, genre: "Thriller", description: "Part psychological thriller, part live-action musical. Remedy's most ambitious game — a layered story about stories, told with stunning confidence." },
  { id: 19, title: "Divinity: Original Sin 2", developer: "Larian Studios", year: 2017, genre: "RPG", description: "A co-op RPG where every action has consequence. Rich, systemic, and generously creative — a world that rewards experimentation at every turn." },
  { id: 20, title: "Dark Souls III", developer: "FromSoftware", year: 2016, genre: "Action-RPG", description: "A farewell to Lordran's legacy. The series' most polished combat paired with its most elegiac world — an ending that earns its melancholy." },
  { id: 21, title: "Half-Life: Alyx", developer: "Valve", year: 2020, genre: "Shooter", description: "The VR game that proved the medium. Set between Half-Life and Half-Life 2, it's both a technical marvel and a deeply affecting story." },
  { id: 22, title: "Armored Core VI", developer: "FromSoftware", year: 2023, genre: "Action", description: "Mech combat refined to a razor edge. FromSoftware applies their encounter design mastery to a beloved franchise revival — angular, fast, and brutal." },
  { id: 23, title: "Death Stranding", developer: "Kojima Productions", year: 2019, genre: "Action", description: "Deliver packages across a shattered America. Divisive, meditative, and unlike anything else — a game about connection in an age of isolation." },
  { id: 24, title: "The Last of Us", developer: "Naughty Dog", year: 2013, genre: "Action-Adventure", description: "Joel and Ellie cross a ravaged America. A benchmark in narrative game design — every relationship earned through play, every loss genuinely felt." },
];

const GAME_MAP = Object.fromEntries(GAMES.map(g => [g.id, g]));

function strToHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}
function gameBg(title) {
  const h1 = strToHue(title), h2 = (h1 + 45) % 360;
  return `linear-gradient(160deg,hsl(${h1},50%,18%) 0%,hsl(${h2},60%,10%) 100%)`;
}
function gameAccent(title) { return `hsl(${strToHue(title)},65%,62%)`; }
function toSlug(name) { return name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }

function setMeta({ title, description, url }) {
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

const DEFAULT_TITLE = "Backlog — Track Every Game You've Played";
const DEFAULT_DESC  = "Log your game backlog, track what you're playing, rate and review games, and share your gaming profile with friends.";

const STATUS_META = {
  "Playing":       { bg: "var(--success-bg)", text: "var(--success)", border: "var(--success-border)" },
  "Played":        { bg: "var(--primary-bg)", text: "var(--primary)", border: "var(--primary-border)" },
  "Want to Play":  { bg: "var(--accent-bg)", text: "var(--accent)", border: "var(--accent-border)" },
};
function Badge({ status }) {
  if (!status) return null;
  const m = STATUS_META[status];
  return <span style={{ fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:5,
    background:m.bg,color:m.text,border:`1px solid ${m.border}`,
    letterSpacing:"0.06em",whiteSpace:"nowrap" }}>{status.toUpperCase()}</span>;
}

function Stars({ value=0, onChange, size=18, readonly }) {
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

// ── Toast system ──────────────────────────────────────────────────────────────
let _toastDispatch = null;
function showToast(msg, type="success") {
  if (_toastDispatch) _toastDispatch({ msg, type, id: Date.now() });
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const w = useWindowWidth();
  const mobile = w < 640;
  useEffect(() => {
    _toastDispatch = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 2800);
    };
    return () => { _toastDispatch = null; };
  }, []);
  if (!toasts.length) return null;
  return (
    <div style={{ position:"fixed",bottom:mobile?90:24,right:16,zIndex:999,
      display:"flex",flexDirection:"column-reverse",gap:8,pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:t.type==="error"?"#1C0A0A":t.type==="info"?"var(--bg-tertiary)":"#0A2818",
          border:`1px solid ${t.type==="error"?"#3D1515":t.type==="info"?"var(--border)":"#14532D"}`,
          color:t.type==="error"?"#EF4444":t.type==="info"?"var(--text-primary)":"#4ADE80",
          padding:"10px 16px",borderRadius:10,fontSize:13,fontWeight:600,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",whiteSpace:"nowrap",
          animation:"toastIn 0.2s ease-out" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function MiniCover({ title, cover=null, size=52 }) {
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

function Card({ game, ug, onOpen, onQuickAdd }) {
  const [hov, setHov] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [picking, setPicking] = useState(false);
  const w = useWindowWidth();
  const mobile = w < 640;
  const accent = gameAccent(game.title);

  const handleTap = () => {
    if (mobile) {
      setTapped(true);
      setTimeout(() => setTapped(false), 150);
    }
    onOpen(game);
  };

  const metascoreColor = game.metascore >= 85 ? '#4ADE80' : game.metascore >= 70 ? '#FBBF24' : '#EF4444';

  return (
    <div onClick={handleTap}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setPicking(false); }}
      style={{ borderRadius:mobile?12:10,overflow:"hidden",cursor:"pointer",
        background:"var(--bg-secondary)",border:`1px solid ${hov||tapped?accent+"40":"var(--border)"}`,
        transition:"transform 0.18s,box-shadow 0.18s,border-color 0.18s",
        transform:hov?"translateY(-4px)":(tapped?"scale(0.98)":"none"),
        boxShadow:hov?"0 12px 32px var(--accent)20":"none",
        ...(mobile && { minHeight:200 }) }}>
      <div style={{ aspectRatio:"3/4",position:"relative",overflow:"hidden",
        background:game.cover ? `url(${game.cover}) center/cover no-repeat` : gameBg(game.title) }}>
        <div style={{ position:"absolute",inset:0,
          background:"var(--gradient-overlay)" }}/>
        {game.metascore && !mobile && (
          <div style={{ position:"absolute",top:8,left:8,zIndex:1,
            padding:"4px 8px",borderRadius:6,background:"rgba(0,0,0,0.8)",
            color:metascoreColor,fontSize:11,fontWeight:800 }}>
            {game.metascore}
          </div>
        )}
        {ug?.status && (
          <div style={{ position:"absolute",bottom:8,left:8,zIndex:1 }}>
            <Badge status={ug.status}/>
          </div>
        )}
        {/* Quick add button / status picker */}
        {hov && onQuickAdd && !ug?.status && !mobile && (
          picking ? (
            <div onClick={e=>e.stopPropagation()}
              style={{ position:"absolute",bottom:8,left:8,right:8,zIndex:2,
                display:"flex",flexDirection:"column",gap:5 }}>
              {["Want to Play","Playing","Played"].map(s=>(
                <button key={s}
                  onClick={e=>{ e.stopPropagation(); onQuickAdd(game, s); setPicking(false); }}
                  style={{ padding:"7px 10px",borderRadius:7,fontSize:11,fontWeight:700,
                    cursor:"pointer",border:"none",textAlign:"left",
                    background:s==="Played"?"#14532D":s==="Playing"?"#1e3a5f":"#1C1A0A",
                    color:s==="Played"?"#4ADE80":s==="Playing"?"#60A5FA":"#F0A500",
                    WebkitTapHighlightColor:"transparent" }}>
                  {s==="Played"?"✓ Played":s==="Playing"?"▶ Playing":"＋ Want to Play"}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setPicking(true); }}
              style={{ position:"absolute",bottom:8,right:8,zIndex:2,
                padding:"6px 10px",borderRadius:6,
                background:"var(--accent)",color:"#000",
                border:"none",fontWeight:700,fontSize:10,cursor:"pointer",
                transition:"all 0.15s",WebkitTapHighlightColor:"transparent" }}>
              + Add
            </button>
          )
        )}
        {/* Hover info overlay */}
        {hov && !mobile && (
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",
            display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:12 }}>
            {game.platforms?.length > 0 && (
              <div style={{ fontSize:9,color:"var(--text-secondary)",marginBottom:4,opacity:0.8 }}>
                {game.platforms.slice(0,3).join(" · ")}{game.platforms.length>3?"...":""}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ padding:mobile?"12px 14px 14px":"9px 11px 12px" }}>
        <div style={{ fontWeight:700,fontSize:mobile?13:12,color:"var(--text-primary)",lineHeight:1.3,
          marginBottom:mobile?4:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
          {game.title}
        </div>
        <div style={{ fontSize:mobile?12:11,color:"var(--text-tertiary)",marginBottom:mobile?8:6 }}>
          {[game.year,game.genre].filter(Boolean).join(" · ")}
        </div>
        {ug?.rating>0 ? <Stars value={ug.rating} readonly size={mobile?14:12}/> :
          <div style={{ fontSize:mobile?12:11,color:"var(--text-muted)" }}>Not rated</div>}
      </div>
    </div>
  );
}

const COMPLETION_TYPES = ["", "Main Story", "100%", "Just Started", "Dropped", "Abandoned"];
const PLATFORM_OPTIONS = ["", "PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", "Nintendo Switch", "Steam Deck", "iOS", "Android", "Other"];

function Modal({ game, ug, onClose, onSave, onDelete }) {
  const [status, setStatus]             = useState(ug?.status??null);
  const [rating, setRating]             = useState(ug?.rating??0);
  const [review, setReview]             = useState(ug?.review??"");
  const [saved, setSaved]               = useState(!!ug?.status);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detail, setDetail]             = useState(null);
  const [platform, setPlatform]         = useState(ug?.platform??"");
  const [timePlayed, setTimePlayed]     = useState(ug?.time_played??"");
  const [completionType, setCompletion] = useState(ug?.completion_type??"");
  const [spoiler, setSpoiler]           = useState(ug?.spoiler||false);
  const [shareMsg, setShareMsg]         = useState("");
  const accent = gameAccent(game.title);
  const w = useWindowWidth();
  const mobile = w < 640;

  useEffect(() => {
    getDetail(game.id).then(setDetail).catch(()=>{});
  }, [game.id]);

  const g = detail || game;

  useEffect(() => {
    const fn = e => {
      if (e.key==="Escape") { onClose(); return; }
      if (e.key==="ArrowRight") setRating(r => Math.min(5, +(r+0.5).toFixed(1)));
      if (e.key==="ArrowLeft")  setRating(r => Math.max(0, +(r-0.5).toFixed(1)));
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSave = () => {
    onSave(game.id, {
      status, rating, review, date: new Date().toISOString(),
      title: g.title, cover: g.cover, year: g.year,
      genre: g.genre, developer: g.developer,
      platform: platform||null,
      time_played: timePlayed ? parseFloat(timePlayed) : null,
      completion_type: completionType||null,
      tags: g.tags||[],
      spoiler,
    });
    setSaved(true);
  };

  const shareOnX = () => {
    const text = `${rating > 0 ? `${"★".repeat(Math.floor(rating))} ` : ""}${g.title}${review ? ` — "${review.slice(0,100)}${review.length>100?"...":""}"` : ""} on Backlog`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin+"/backlog/")}`;
    window.open(url, "_blank", "noopener");
    setShareMsg("Opened X/Twitter");
    setTimeout(() => setShareMsg(""), 2000);
  };

  const CoverPanel = () => (
    <div style={{ background: g.cover ? `url(${g.cover}) center/cover no-repeat` : gameBg(game.title), position:"relative",
      overflow:"hidden", flexShrink:0,
      width:160, minHeight:"100%" }}>
      <div style={{ position:"absolute",inset:0,
        background:"linear-gradient(to right,transparent 60%,var(--bg-secondary) 100%)" }}/>
    </div>
  );

  const handleSaveWithToast = () => {
    handleSave();
    showToast(saved ? "Entry updated" : "Saved to library");
  };

  const handleDeleteWithToast = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(game.id);
    showToast("Removed from library", "info");
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:200,
      background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:mobile?"flex-end":"center",
      justifyContent:"center",padding:mobile?0:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--bg-secondary)",
        border:"1px solid var(--border)",
        borderRadius:mobile?"20px 20px 0 0":16,
        width:"100%",maxWidth:mobile?"100%":720,
        maxHeight:mobile?"95vh":"92vh",overflow:"hidden",display:"flex",flexDirection:"column",
        animation:mobile?"modalSlideUp 0.25s ease-out":"modalFadeIn 0.2s ease-out" }}>

        {/* Header */}
        {mobile ? (
          <div style={{ flexShrink:0 }}>
            <div style={{ display:"flex",justifyContent:"center",paddingTop:10,paddingBottom:4 }}>
              <div style={{ width:36,height:4,borderRadius:2,background:"var(--border-hover)" }}/>
            </div>
            <div style={{ position:"relative",height:150,overflow:"hidden",
              background:g.cover?`url(${g.cover}) center/cover no-repeat`:gameBg(game.title) }}>
              <div style={{ position:"absolute",inset:0,
                background:"linear-gradient(to bottom,transparent 20%,var(--bg-secondary) 100%)" }}/>
              <button onClick={onClose}
                style={{ position:"absolute",top:10,right:10,
                  width:32,height:32,borderRadius:16,
                  background:"rgba(0,0,0,0.55)",border:"none",cursor:"pointer",
                  color:"#fff",fontSize:18,display:"flex",alignItems:"center",
                  justifyContent:"center",WebkitTapHighlightColor:"transparent" }}>×</button>
            </div>
            <div style={{ padding:"0 20px 16px",marginTop:-32,position:"relative" }}>
              <div style={{ fontSize:19,fontWeight:800,color:"var(--text-primary)",lineHeight:1.25,marginBottom:4 }}>{g.title}</div>
              <div style={{ fontSize:12,color:"var(--text-secondary)",marginBottom:14 }}>
                {[g.developer,g.year,g.genre].filter(Boolean).join(" · ")}
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {["Want to Play","Playing","Played"].map(s=>(
                  <button key={s} onClick={()=>setStatus(status===s?null:s)}
                    style={{ padding:"8px 14px",borderRadius:8,fontSize:12,fontWeight:600,
                      cursor:"pointer",WebkitTapHighlightColor:"transparent",
                      border:`1px solid ${status===s?accent:"var(--border)"}`,
                      background:status===s?accent+"22":"var(--bg-tertiary)",
                      color:status===s?accent:"var(--text-secondary)" }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display:"flex",flexShrink:0,height:200 }}>
            <CoverPanel/>
            <div style={{ flex:1,padding:"24px 24px 20px 20px",minWidth:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:22,fontWeight:800,color:"var(--text-primary)",lineHeight:1.2,marginBottom:4 }}>{g.title}</div>
                  <div style={{ fontSize:12,color:"var(--text-tertiary)",marginBottom:12 }}>
                    {[g.developer,g.year,g.genre].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",
                  color:"var(--text-tertiary)",fontSize:24,lineHeight:1,padding:0,flexShrink:0,alignSelf:"flex-start" }}>×</button>
              </div>
              {g.description && (
                <div style={{ fontSize:13,color:"var(--text-secondary)",lineHeight:1.65,marginBottom:16,
                  display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                  {g.description}
                </div>
              )}
              <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
                {["Want to Play","Playing","Played"].map(s=>(
                  <button key={s} onClick={()=>setStatus(status===s?null:s)} style={{
                    padding:"6px 13px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",
                    border:`1px solid ${status===s?accent:"var(--border)"}`,
                    background:status===s?accent+"22":"var(--bg-tertiary)",
                    color:status===s?accent:"var(--text-tertiary)" }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ height:1,background:"var(--border)",flexShrink:0 }}/>
        <div style={{ overflowY:"auto",padding:mobile?"20px 20px 32px":"20px 24px 28px",flex:1 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
              color:"var(--text-muted)",textTransform:"uppercase",marginBottom:9 }}>Your rating</div>
            <Stars value={rating} onChange={setRating} size={mobile?26:30}/>
            {rating>0 && <div style={{ fontSize:10,color:"var(--text-tertiary)",marginTop:4 }}>{rating} / 5</div>}
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
              color:"var(--text-muted)",textTransform:"uppercase",marginBottom:9 }}>Your review</div>
            <textarea value={review} onChange={e=>setReview(e.target.value)}
              placeholder="What did you think?"
              style={{ width:"100%",minHeight:80,background:"var(--bg-primary)",
                border:"1px solid var(--border)",borderRadius:8,padding:"10px 13px",
                color:"var(--text-primary)",fontSize:13,lineHeight:1.6,resize:"vertical",
                outline:"none",fontFamily:"inherit",boxSizing:"border-box" }}/>
            <label style={{ display:"flex",alignItems:"center",gap:6,marginTop:6,cursor:"pointer",userSelect:"none" }}>
              <input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)}
                style={{ accentColor:"var(--accent)",width:13,height:13 }}/>
              <span style={{ fontSize:11,color:"var(--text-tertiary)" }}>Mark as spoiler</span>
            </label>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:12,marginBottom:16 }}>
            <div>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text-muted)",textTransform:"uppercase",marginBottom:6 }}>Platform played on</div>
              <select value={platform} onChange={e=>setPlatform(e.target.value)}
                style={{ width:"100%",padding:"8px 10px",background:"var(--bg-primary)",border:"1px solid var(--border)",
                  borderRadius:7,color:platform?"var(--text-primary)":"var(--text-tertiary)",fontSize:12,outline:"none" }}>
                {PLATFORM_OPTIONS.map(p=><option key={p} value={p}>{p||"Select platform..."}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text-muted)",textTransform:"uppercase",marginBottom:6 }}>Completion</div>
              <select value={completionType} onChange={e=>setCompletion(e.target.value)}
                style={{ width:"100%",padding:"8px 10px",background:"var(--bg-primary)",border:"1px solid var(--border)",
                  borderRadius:7,color:completionType?"var(--text-primary)":"var(--text-tertiary)",fontSize:12,outline:"none" }}>
                {COMPLETION_TYPES.map(c=><option key={c} value={c}>{c||"Select completion..."}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text-muted)",textTransform:"uppercase",marginBottom:6 }}>Hours played</div>
              <input type="number" value={timePlayed} onChange={e=>setTimePlayed(e.target.value)}
                placeholder="e.g. 42" min="0" step="0.5"
                style={{ width:"100%",padding:"8px 10px",background:"var(--bg-primary)",border:"1px solid var(--border)",
                  borderRadius:7,color:"var(--text-primary)",fontSize:12,outline:"none",boxSizing:"border-box" }}/>
            </div>
            {g.tags?.length>0 && (
              <div>
                <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
                  color:"var(--text-muted)",textTransform:"uppercase",marginBottom:6 }}>Tags</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                  {g.tags.map(t=>(
                    <span key={t} style={{ fontSize:10,color:"#F0A500",background:"#F0A50011",
                      border:"1px solid #F0A50033",borderRadius:4,padding:"2px 7px" }}>#{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <button onClick={handleSaveWithToast} style={{ flex:mobile?1:undefined,
              padding:"11px 22px",borderRadius:8,
              background:saved?"#14532D":accent,color:saved?"#4ADE80":"#000",
              border:"none",fontWeight:800,fontSize:13,cursor:"pointer",
              transition:"all 0.18s",letterSpacing:"0.03em" }}>
              {saved?"Saved ✓":"Save to library"}
            </button>
            {saved && !confirmDelete && (
              <button onClick={handleDeleteWithToast} style={{ padding:"11px 16px",borderRadius:8,
                background:"#1C0A0A",color:"#EF4444",
                border:"1px solid #3D1515",fontWeight:700,fontSize:13,cursor:"pointer",
                transition:"all 0.18s" }}>
                Remove
              </button>
            )}
            {saved && confirmDelete && (
              <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                <span style={{ fontSize:12,color:"#EF4444",fontWeight:600 }}>Are you sure?</span>
                <button onClick={handleDeleteWithToast} style={{ padding:"8px 12px",borderRadius:7,
                  background:"#EF4444",color:"#fff",border:"none",
                  fontWeight:700,fontSize:12,cursor:"pointer" }}>Yes, remove</button>
                <button onClick={()=>setConfirmDelete(false)} style={{ padding:"8px 12px",borderRadius:7,
                  background:"var(--bg-tertiary)",color:"var(--text-secondary)",border:"1px solid var(--border)",
                  fontWeight:600,fontSize:12,cursor:"pointer" }}>Cancel</button>
              </div>
            )}
            <button onClick={shareOnX} style={{ padding:"11px 14px",borderRadius:8,
              background:"var(--bg-tertiary)",color:"var(--text-secondary)",border:"1px solid var(--border)",
              fontWeight:600,fontSize:12,cursor:"pointer",flexShrink:0 }}>
              {shareMsg || "Share on 𝕏"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
const GENRES = [
  { label:"All",         slug:"" },
  { label:"Action",      slug:"action" },
  { label:"RPG",         slug:"role-playing-games-rpg" },
  { label:"Shooter",     slug:"shooter" },
  { label:"Adventure",   slug:"adventure" },
  { label:"Puzzle",      slug:"puzzle" },
  { label:"Strategy",    slug:"strategy" },
  { label:"Sports",      slug:"sports" },
  { label:"Platformer",  slug:"platformer" },
  { label:"Fighting",    slug:"fighting" },
  { label:"Simulation",  slug:"simulation" },
  { label:"Racing",      slug:"racing" },
];

const RAWG_PLATFORMS = [
  { label:"All Platforms", id:"" },
  { label:"PC",            id:"4"   },
  { label:"PS5",           id:"187" },
  { label:"PS4",           id:"18"  },
  { label:"Xbox Series",   id:"186" },
  { label:"Xbox One",      id:"1"   },
  { label:"Switch",        id:"7"   },
  { label:"iOS",           id:"3"   },
  { label:"Android",       id:"21"  },
];

function SkeletonCard() {
  return (
    <div style={{ borderRadius:10,overflow:"hidden",background:"var(--bg-secondary)",border:"1px solid var(--border)" }}>
      <div style={{ aspectRatio:"3/4",background:"linear-gradient(90deg,var(--border) 25%,var(--border-hover) 50%,var(--border) 75%)",
        backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite" }}/>
      <div style={{ padding:"9px 11px 12px" }}>
        <div style={{ height:11,background:"var(--border)",borderRadius:4,marginBottom:6 }}/>
        <div style={{ height:9,background:"var(--bg-secondary)",borderRadius:4,width:"55%" }}/>
      </div>
    </div>
  );
}

function Discover({ userGames, onOpen, q, onQuickAdd }) {
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [genre, setGenre]       = useState("");
  const [platform, setPlatform] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo]     = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const observerTargetRef       = useRef();
  const w = useWindowWidth();
  const mobile = w < 640;
  const wide   = w >= 960;

  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 450);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setGames([]);
    setPage(1);
    setHasMore(true);
  }, [debouncedQ, genre, platform, yearFrom, yearTo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fn = debouncedQ
      ? searchGamesFiltered(debouncedQ, page, platform)
      : getPopular(page, genre, platform, yearFrom, yearTo);
    fn.then(results => {
      if (cancelled) return;
      setGames(prev => page===1 ? results : [...prev, ...results]);
      setHasMore(results.length===24);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQ, genre, platform, yearFrom, yearTo, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && !loading && hasMore) setPage(p => p + 1); },
      { threshold: 0.1, rootMargin: "200px" }
    );
    if (observerTargetRef.current) observer.observe(observerTargetRef.current);
    return () => { if (observerTargetRef.current) observer.unobserve(observerTargetRef.current); };
  }, [loading, hasMore]);

  const activeFilters = [platform, yearFrom, yearTo].filter(Boolean).length;

  const FiltersPanel = () => (
    <div style={{ display:"flex",flexDirection:wide?"column":"row",
      gap:wide?14:12,flexWrap:wide?"nowrap":"wrap",alignItems:wide?"stretch":"flex-end" }}>
      <div>
        <div style={{ fontSize:9,fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.1em",
          textTransform:"uppercase",marginBottom:5 }}>Platform</div>
        <select value={platform} onChange={e=>setPlatform(e.target.value)}
          style={{ width:"100%",padding:"6px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",
            borderRadius:6,color:platform?"var(--text-primary)":"var(--text-tertiary)",fontSize:12,outline:"none" }}>
          {RAWG_PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize:9,fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.1em",
          textTransform:"uppercase",marginBottom:5 }}>Year from</div>
        <input type="number" value={yearFrom} onChange={e=>setYearFrom(e.target.value)}
          placeholder="2000" min="1970" max="2030"
          style={{ width:wide?"100%":80,padding:"6px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",
            borderRadius:6,color:"var(--text-primary)",fontSize:12,outline:"none",boxSizing:"border-box" }}/>
      </div>
      <div>
        <div style={{ fontSize:9,fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.1em",
          textTransform:"uppercase",marginBottom:5 }}>Year to</div>
        <input type="number" value={yearTo} onChange={e=>setYearTo(e.target.value)}
          placeholder="2025" min="1970" max="2030"
          style={{ width:wide?"100%":80,padding:"6px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",
            borderRadius:6,color:"var(--text-primary)",fontSize:12,outline:"none",boxSizing:"border-box" }}/>
      </div>
      {activeFilters>0 && (
        <button onClick={()=>{ setPlatform(""); setYearFrom(""); setYearTo(""); }}
          style={{ padding:"6px 12px",borderRadius:6,background:"var(--border)",color:"#EF4444",
            border:"1px solid #3D1515",fontSize:11,fontWeight:600,cursor:"pointer" }}>
          Clear filters
        </button>
      )}
    </div>
  );

  const GameGrid = () => (
    <>
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"repeat(2,1fr)":wide?"repeat(auto-fill,minmax(160px,1fr))":"repeat(auto-fill,minmax(150px,1fr))",
        gap:mobile?12:14 }}>
        {games.filter(game=>!userGames[game.id]?.status).map(game=>(
          <Card key={game.id} game={game} ug={userGames[game.id]} onOpen={onOpen} onQuickAdd={onQuickAdd}/>
        ))}
        {loading && Array.from({length:mobile?6:12}).map((_,i)=><SkeletonCard key={`sk${i}`}/>)}
      </div>
      <div ref={observerTargetRef} style={{ height:mobile?60:40 }} />
      {!loading && games.filter(game=>!userGames[game.id]?.status).length===0 && games.length>0 && (
        <div style={{ textAlign:"center",padding:"60px 0",color:"var(--text-muted)" }}>
          <div style={{ fontSize:36,marginBottom:10 }}>✅</div>
          <div style={{ fontSize:14 }}>All games in these results are already in your library</div>
        </div>
      )}
      {!loading && games.length===0 && (
        <div style={{ textAlign:"center",padding:"60px 0",color:"var(--text-muted)" }}>
          <div style={{ fontSize:36,marginBottom:10 }}>🔎</div>
          <div style={{ fontSize:14 }}>No games found</div>
        </div>
      )}
      {!loading && !hasMore && games.length>0 && (
        <div style={{ textAlign:"center",padding:mobile?24:32,color:"var(--text-muted)",fontSize:mobile?13:14 }}>
          You've reached the end
        </div>
      )}
    </>
  );

  return (
    <div style={{ padding:mobile?"12px 12px 80px":"20px 20px 48px" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes modalSlideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
        @keyframes modalFadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:none}}
      `}</style>

      {wide ? (
        /* Desktop two-column: sidebar + grid */
        <div style={{ display:"flex",gap:28,alignItems:"flex-start" }}>
          {/* Left sidebar: genres + filters */}
          <div style={{ width:160,flexShrink:0,position:"sticky",top:70 }}>
            <div style={{ fontSize:9,fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:10 }}>Genre</div>
            <div style={{ display:"flex",flexDirection:"column",gap:3,marginBottom:20 }}>
              {GENRES.map(g=>(
                <button key={g.slug} onClick={()=>setGenre(g.slug)}
                  style={{ padding:"7px 12px",borderRadius:7,fontSize:12,fontWeight:genre===g.slug?700:500,
                    cursor:"pointer",textAlign:"left",
                    border:`1px solid ${genre===g.slug?"#F0A500":"transparent"}`,
                    background:genre===g.slug?"#F0A50018":"none",
                    color:genre===g.slug?"#F0A500":"var(--text-tertiary)",
                    WebkitTapHighlightColor:"transparent",transition:"all 0.12s" }}>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize:9,fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:10 }}>Filters</div>
            <FiltersPanel/>
          </div>
          {/* Right: grid */}
          <div style={{ flex:1,minWidth:0 }}><GameGrid/></div>
        </div>
      ) : (
        /* Mobile/tablet: chips row + optional filter panel */
        <>
          <div style={{ display:"flex",alignItems:"center",gap:mobile?8:6,marginBottom:mobile?12:10,overflowX:"auto",
            scrollbarWidth:"none",paddingBottom:4 }}>
            {GENRES.map(g=>(
              <button key={g.slug} onClick={()=>setGenre(g.slug)}
                style={{ padding:mobile?"8px 16px":"4px 12px",borderRadius:mobile?24:20,fontSize:mobile?12:11,fontWeight:600,
                  cursor:"pointer",flexShrink:0,minHeight:mobile?44:32,
                  border:`1px solid ${genre===g.slug?"#F0A500":"var(--border)"}`,
                  background:genre===g.slug?"#F0A50020":"var(--bg-secondary)",
                  color:genre===g.slug?"#F0A500":"var(--text-tertiary)",
                  WebkitTapHighlightColor:"transparent",transition:"all 0.15s" }}>
                {g.label}
              </button>
            ))}
            <button onClick={()=>setShowFilters(f=>!f)} style={{ flexShrink:0,
              padding:mobile?"8px 14px":"4px 12px",borderRadius:mobile?24:20,fontSize:mobile?12:11,fontWeight:600,
              cursor:"pointer",minHeight:mobile?44:32,
              border:`1px solid ${showFilters||activeFilters?"#7C3AED":"var(--border)"}`,
              background:activeFilters?"#7C3AED22":"var(--bg-secondary)",
              color:showFilters||activeFilters?"#A78BFA":"var(--text-tertiary)",
              WebkitTapHighlightColor:"transparent",transition:"all 0.15s" }}>
              ⚙ Filters{activeFilters ? ` (${activeFilters})` : ""}
            </button>
          </div>
          {showFilters && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:10,
              padding:"14px 16px",marginBottom:14 }}>
              <FiltersPanel/>
            </div>
          )}
          <GameGrid/>
        </>
      )}
    </div>
  );
}

function MyGames({ games, userGames, onOpen }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All","Playing","Played","Want to Play"];
  const w = useWindowWidth();
  const mobile = w < 640;
  const counts = useMemo(() => ({
    All: games.filter(g=>userGames[g.id]?.status).length,
    Playing: games.filter(g=>userGames[g.id]?.status==="Playing").length,
    Played: games.filter(g=>userGames[g.id]?.status==="Played").length,
    "Want to Play": games.filter(g=>userGames[g.id]?.status==="Want to Play").length,
  }), [games,userGames]);
  const list = useMemo(()=>
    games.filter(g=>userGames[g.id]?.status&&(filter==="All"||userGames[g.id].status===filter)),
    [games,userGames,filter]);

  if (counts.All===0) return (
    <div style={{ padding:"48px 24px",textAlign:"center" }}>
      <div style={{ fontSize:44,marginBottom:14 }}>📚</div>
      <div style={{ fontSize:15,color:"var(--text-secondary)",fontWeight:700,marginBottom:6 }}>Library empty</div>
      <div style={{ fontSize:13,color:"var(--text-muted)" }}>Browse Discover and log your first game</div>
    </div>
  );

  return (
    <div style={{ padding:mobile?"16px 12px 80px":"22px 20px 48px" }}>
      <div style={{ display:"flex",gap:6,marginBottom:18,flexWrap:"wrap" }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 11px",
            borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
            border:`1px solid ${filter===f?"#F0A500":"var(--border)"}`,
            background:filter===f?"#F0A50020":"var(--bg-secondary)",
            color:filter===f?"#F0A500":"var(--text-tertiary)",
            WebkitTapHighlightColor:"transparent" }}>{f} ({counts[f]})</button>
        ))}
      </div>
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"repeat(auto-fill,minmax(110px,1fr))":"repeat(auto-fill,minmax(150px,1fr))",
        gap:mobile?10:14 }}>
        {list.map(game=>(
          <Card key={game.id} game={game} ug={userGames[game.id]} onOpen={onOpen}/>
        ))}
      </div>
    </div>
  );
}

function Diary({ games, userGames, onOpen }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const entries = useMemo(() => {
    return games
      .filter(g => userGames[g.id]?.date)
      .map(g => ({ game:g, ...userGames[g.id] }))
      .sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [games, userGames]);

  if (entries.length === 0) return (
    <div style={{ padding:"48px 24px",textAlign:"center" }}>
      <div style={{ fontSize:44,marginBottom:14 }}>📔</div>
      <div style={{ fontSize:15,color:"var(--text-secondary)",fontWeight:700,marginBottom:6 }}>Diary empty</div>
      <div style={{ fontSize:13,color:"var(--text-muted)" }}>Every game you log appears here in order</div>
    </div>
  );

  let lastMonth = null;
  return (
    <div style={{ padding:mobile?"16px 12px 80px":"22px 20px 48px",maxWidth:680,margin:"0 auto" }}>
      {entries.map(({ game, rating, review, date, status }) => {
        const d = new Date(date);
        const month = d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
        const showMonth = month !== lastMonth;
        lastMonth = month;
        return (
          <div key={game.id+date}>
            {showMonth && (
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:"0.1em",
                color:"var(--text-muted)",textTransform:"uppercase",
                padding:"14px 0 8px",borderBottom:"1px solid var(--border)",marginBottom:14,
                position:"sticky",top:54,background:"var(--bg-primary)",zIndex:2 }}>
                {month}
              </div>
            )}
            <div onClick={()=>onOpen(game)}
              style={{ display:"flex",gap:14,alignItems:"center",padding:"10px 0",
                borderBottom:"1px solid var(--bg-secondary)",cursor:"pointer" }}>
              <div style={{ width:36,color:"var(--text-muted)",fontSize:12,fontWeight:700,
                flexShrink:0,textAlign:"right",lineHeight:1.2 }}>
                <div>{d.getDate()}</div>
                <div style={{ fontSize:10 }}>{d.toLocaleDateString("en-US",{weekday:"short"})}</div>
              </div>
              <MiniCover title={game.title} cover={game.cover} size={38}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"var(--text-primary)",fontSize:13,
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                <div style={{ fontSize:11,color:"var(--text-tertiary)",marginTop:2 }}>{game.genre} · {game.year}</div>
              </div>
              {rating>0 && <Stars value={rating} readonly size={11}/>}
              <Badge status={status}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Profile section ─────────────────────────────────────────────
function ProfileOverview({ games, userGames, onOpen, favorites, setFavorites }) {
  const [pickingFav, setPickingFav] = useState(false);
  const played = games.filter(g=>userGames[g.id]?.status==="Played");

  const recentActivity = useMemo(() =>
    games.filter(g=>userGames[g.id]?.date)
      .map(g=>({ game:g,...userGames[g.id] }))
      .sort((a,b)=>new Date(b.date)-new Date(a.date))
      .slice(0,8),
    [games,userGames]);

  const toggleFav = (id) => {
    setFavorites(prev => prev.includes(id)
      ? prev.filter(f=>f!==id)
      : prev.length<4 ? [...prev,id] : prev);
  };

  return (
    <div>
      {/* Favorite games */}
      <div style={{ marginBottom:36 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",textTransform:"uppercase" }}>
            Favorite Games
          </div>
          {played.length>0 && (
            <button onClick={()=>setPickingFav(!pickingFav)}
              style={{ fontSize:11,color:pickingFav?"#F0A500":"#555D7A",background:"none",
                border:"none",cursor:"pointer",fontWeight:600 }}>
              {pickingFav?"Done":"Edit"}
            </button>
          )}
        </div>
        {favorites.length===0 && !pickingFav ? (
          <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>
            {played.length===0
              ? "Log some games to set favorites"
              : <span>Click <b style={{color:"#555D7A"}}>Edit</b> to pick up to 4 favorite games</span>}
          </div>
        ) : (
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            {/* Show selected favorites */}
            {favorites.map(id=>{
              const game = GAME_MAP[id];
              if (!game) return null;
              return (
                <div key={id} onClick={()=>pickingFav?toggleFav(id):onOpen(game)}
                  style={{ position:"relative",cursor:"pointer" }}>
                  <MiniCover title={game.title} size={72}/>
                  {pickingFav && (
                    <div style={{ position:"absolute",top:-5,right:-5,
                      width:18,height:18,borderRadius:"50%",background:"#EF4444",
                      color:"#fff",fontSize:12,display:"flex",alignItems:"center",
                      justifyContent:"center",fontWeight:700,lineHeight:1 }}>×</div>
                  )}
                </div>
              );
            })}
            {/* Empty slots */}
            {Array.from({length:4-favorites.length}).map((_,i)=>(
              <div key={"empty"+i}
                onClick={()=>setPickingFav(true)}
                style={{ width:72,height:97,borderRadius:6,border:"1px dashed #2E3450",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#2E3450",fontSize:20,cursor:"pointer" }}>+</div>
            ))}
          </div>
        )}
        {/* Pick panel */}
        {pickingFav && played.length>0 && (
          <div style={{ marginTop:14,background:"#0D0F17",borderRadius:10,
            border:"1px solid #1A1E2E",padding:14,maxHeight:220,overflowY:"auto" }}>
            <div style={{ fontSize:11,color:"#3A4060",marginBottom:10 }}>
              Select up to 4 — {favorites.length}/4 chosen
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {played.map(game=>{
                const sel = favorites.includes(game.id);
                return (
                  <button key={game.id} onClick={()=>toggleFav(game.id)}
                    style={{ padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,
                      cursor:"pointer",transition:"all 0.12s",
                      border:`1px solid ${sel?"#F0A500":"#22263A"}`,
                      background:sel?"#F0A50022":"#181B25",
                      color:sel?"#F0A500":"#7B8099" }}>{game.title}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
          color:"#3A4060",textTransform:"uppercase",marginBottom:14 }}>Recent Activity</div>
        {recentActivity.length===0 ? (
          <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No activity yet</div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {recentActivity.map(({ game, rating, status, date })=>(
              <div key={game.id} onClick={()=>onOpen(game)}
                style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 12px",
                  background:"var(--bg-secondary)",borderRadius:10,
                  border:"1px solid var(--border)",cursor:"pointer" }}>
                <MiniCover title={game.title} cover={game.cover} size={44}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:13,color:"var(--text-primary)",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                  {date && (
                    <div style={{ fontSize:11,color:"#555D7A",marginTop:3 }}>
                      {new Date(date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0 }}>
                  <Badge status={status}/>
                  {rating>0 && <Stars value={rating} readonly size={11}/>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileGames({ games, userGames, onOpen }) {
  const [filter,setFilter]=useState("All");
  const filters=["All","Playing","Played","Want to Play"];
  const counts=useMemo(()=>({
    All:games.filter(g=>userGames[g.id]?.status).length,
    Playing:games.filter(g=>userGames[g.id]?.status==="Playing").length,
    Played:games.filter(g=>userGames[g.id]?.status==="Played").length,
    "Want to Play":games.filter(g=>userGames[g.id]?.status==="Want to Play").length,
  }),[games,userGames]);
  const list=useMemo(()=>games.filter(g=>userGames[g.id]?.status&&(filter==="All"||userGames[g.id].status===filter)),[games,userGames,filter]);
  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:18,flexWrap:"wrap" }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"4px 11px",
            borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
            border:`1px solid ${filter===f?"#F0A500":"var(--border)"}`,
            background:filter===f?"#F0A50020":"var(--bg-secondary)",
            color:filter===f?"#F0A500":"var(--text-tertiary)" }}>{f} ({counts[f]})</button>
        ))}
      </div>
      {list.length===0
        ? <div style={{ fontSize:13,color:"var(--text-muted)",fontStyle:"italic",padding:"20px 0" }}>Nothing here yet</div>
        : <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12 }}>
            {list.map(game=><Card key={game.id} game={game} ug={userGames[game.id]} onOpen={onOpen}/>)}
          </div>
      }
    </div>
  );
}

function ProfileDiary({ games, userGames, onOpen }) {
  const entries=useMemo(()=>
    games.filter(g=>userGames[g.id]?.date)
      .map(g=>({ game:g,...userGames[g.id] }))
      .sort((a,b)=>new Date(b.date)-new Date(a.date)),
    [games,userGames]);
  if (entries.length===0) return <div style={{ fontSize:13,color:"var(--text-muted)",fontStyle:"italic",padding:"20px 0" }}>No diary entries yet</div>;
  let lastMonth=null;
  return (
    <div>
      {entries.map(({ game, rating, date, status })=>{
        const d=new Date(date), month=d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
        const showMonth=month!==lastMonth; lastMonth=month;
        return (
          <div key={game.id+date}>
            {showMonth && <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.1em",
              color:"var(--text-muted)",textTransform:"uppercase",padding:"14px 0 8px",
              borderBottom:"1px solid var(--border)",marginBottom:10 }}>{month}</div>}
            <div onClick={()=>onOpen(game)} style={{ display:"flex",gap:12,alignItems:"center",
              padding:"8px 0",borderBottom:"1px solid var(--bg-secondary)",cursor:"pointer" }}>
              <div style={{ width:30,color:"var(--text-muted)",fontSize:11,fontWeight:700,textAlign:"right",flexShrink:0 }}>
                <div>{d.getDate()}</div>
                <div style={{ fontSize:10 }}>{d.toLocaleDateString("en-US",{weekday:"short"})}</div>
              </div>
              <MiniCover title={game.title} cover={game.cover} size={34}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"var(--text-primary)",fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                <div style={{ fontSize:11,color:"var(--text-tertiary)" }}>{game.genre}</div>
              </div>
              {rating>0 && <Stars value={rating} readonly size={11}/>}
              <Badge status={status}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpoilerText({ text }) {
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

function ProfileReviews({ games, userGames, onOpen }) {
  const list=useMemo(()=>
    games.filter(g=>userGames[g.id]?.review)
      .map(g=>({ game:g,...userGames[g.id] }))
      .sort((a,b)=>new Date(b.date)-new Date(a.date)),
    [games,userGames]);
  if (list.length===0) return <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>No reviews written yet</div>;
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      {list.map(({ game, rating, review, date, status, spoiler, platform, completion_type, time_played, tags })=>(
        <div key={game.id} onClick={()=>onOpen(game)}
          style={{ background:"#0D0F17",border:"1px solid #1A1E2E",borderRadius:10,
            padding:16,display:"flex",gap:12,cursor:"pointer" }}>
          <MiniCover title={game.title} cover={game.cover} size={44}/>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",gap:8,marginBottom:4 }}>
              <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13 }}>{game.title}</div>
              <Badge status={status}/>
            </div>
            {rating>0 && <div style={{ marginBottom:6 }}><Stars value={rating} readonly size={12}/></div>}
            <div style={{ display:"flex",gap:8,marginBottom:6,flexWrap:"wrap" }}>
              {platform && <span style={{ fontSize:10,color:"#555D7A",background:"#1A1E2E",borderRadius:4,padding:"2px 7px" }}>{platform}</span>}
              {completion_type && <span style={{ fontSize:10,color:"#A78BFA",background:"#7C3AED22",borderRadius:4,padding:"2px 7px" }}>{completion_type}</span>}
              {time_played>0 && <span style={{ fontSize:10,color:"#555D7A" }}>{time_played}h</span>}
            </div>
            {spoiler ? <SpoilerText text={review}/> : <div style={{ fontSize:12,color:"#7B8099",lineHeight:1.6 }}>{review}</div>}
            {tags?.length>0 && (
              <div style={{ display:"flex",gap:4,marginTop:6,flexWrap:"wrap" }}>
                {tags.map(t=><span key={t} style={{ fontSize:10,color:"#F0A500",background:"#F0A50011",
                  borderRadius:4,padding:"1px 6px" }}>#{t}</span>)}
              </div>
            )}
            {date && <div style={{ fontSize:10,color:"#2E3450",marginTop:6 }}>
              {new Date(date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileWatchlist({ games, userGames, onOpen }) {
  const [priorities, setPriorities] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wishlist_priorities")||"{}"); } catch { return {}; }
  });
  const setPriority = (id, p) => {
    setPriorities(prev => {
      const next = { ...prev, [id]: p };
      localStorage.setItem("wishlist_priorities", JSON.stringify(next));
      return next;
    });
  };

  const list = useMemo(()=>games.filter(g=>userGames[g.id]?.status==="Want to Play"),[games,userGames]);
  const soon    = list.filter(g => (priorities[g.id]||"someday")==="soon");
  const someday = list.filter(g => (priorities[g.id]||"someday")==="someday");

  if (list.length===0) return <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>No games in your backlog</div>;

  const Section = ({ title, items, targetPriority }) => items.length===0 ? null : (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
        textTransform:"uppercase",marginBottom:12 }}>{title} ({items.length})</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12 }}>
        {items.map(game=>(
          <div key={game.id} style={{ position:"relative" }}>
            <Card game={game} ug={userGames[game.id]} onOpen={onOpen}/>
            <button onClick={e=>{ e.stopPropagation(); setPriority(game.id, targetPriority); }}
              style={{ position:"absolute",top:6,right:6,fontSize:9,fontWeight:700,padding:"2px 6px",
                borderRadius:4,border:"none",cursor:"pointer",zIndex:2,
                background:targetPriority==="soon"?"#1e3a5f":"#0D1A0D",
                color:targetPriority==="soon"?"#60A5FA":"#4ADE80" }}>
              {targetPriority==="soon"?"Move to Soon":"Move to Someday"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <Section title="Play Soon" items={soon} targetPriority="someday"/>
      <Section title="Someday" items={someday} targetPriority="soon"/>
    </div>
  );
}

function ProfileStats({ games, userGames }) {
  const stats=useMemo(()=>{
    const ents=Object.entries(userGames).map(([id,v])=>({ ...v, game:games.find(g=>g.id===parseInt(id))||GAME_MAP[parseInt(id)] })).filter(e=>e.game);
    const played=ents.filter(e=>e.status==="Played");
    const ratings=ents.filter(e=>e.rating>0).map(e=>e.rating);
    const avg=ratings.length?(ratings.reduce((s,r)=>s+r,0)/ratings.length).toFixed(1):null;

    const genreCounts={};
    played.forEach(e=>{ if(e.game.genre) genreCounts[e.game.genre]=(genreCounts[e.game.genre]||0)+1; });
    const topGenres=Object.entries(genreCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);

    const ratingDist=[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5].map(r=>({ r, count:ratings.filter(x=>x===r).length }));
    const maxDist=Math.max(...ratingDist.map(x=>x.count),1);

    const yearCounts={};
    played.forEach(e=>{ if(e.game.year) yearCounts[e.game.year]=(yearCounts[e.game.year]||0)+1; });
    const topYears=Object.entries(yearCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const platformCounts={};
    ents.forEach(e=>{ if(e.platform) platformCounts[e.platform]=(platformCounts[e.platform]||0)+1; });
    const topPlatforms=Object.entries(platformCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const totalHours=ents.reduce((s,e)=>s+(e.time_played||0),0);

    const completionCounts={};
    ents.filter(e=>e.completion_type).forEach(e=>{ completionCounts[e.completion_type]=(completionCounts[e.completion_type]||0)+1; });

    return { played:played.length, avg, topGenres, ratingDist, maxDist, topYears, topPlatforms, totalHours, completionCounts, allEnts:ents };
  },[games,userGames]);

  const exportCSV = () => {
    const rows = [
      ["Title","Status","Rating","Genre","Year","Platform","Hours","Completion","Spoiler","Tags","Review","Date"],
      ...Object.entries(userGames).map(([id,ug])=>[
        ug.title||`Game #${id}`,ug.status||"",ug.rating||"",ug.genre||"",ug.year||"",
        ug.platform||"",ug.time_played||"",ug.completion_type||"",ug.spoiler?"yes":"no",
        (ug.tags||[]).join(";"),
        `"${(ug.review||"").replace(/"/g,'""')}"`,
        ug.date||""
      ])
    ];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = "backlog-library.csv";
    a.click();
  };

  if (stats.played===0) return (
    <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>
      Log some games to see stats
      <button onClick={exportCSV} style={{ display:"block",marginTop:12,padding:"8px 14px",borderRadius:7,
        background:"#12141C",border:"1px solid #1A1E2E",color:"#555D7A",fontSize:11,cursor:"pointer" }}>
        Export library (CSV)
      </button>
    </div>
  );

  return (
    <div>
      {/* Key numbers */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:24 }}>
        {[
          { label:"Games played",  value:stats.played },
          { label:"Avg rating",    value:stats.avg?`★ ${stats.avg}`:"—" },
          { label:"Reviews",       value:Object.values(userGames).filter(g=>g.review).length },
          { label:"Hours logged",  value:stats.totalHours>0?`${stats.totalHours.toFixed(0)}h`:"—" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",
            borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontSize:22,fontWeight:900,color:"#F0A500",lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:9,color:"#3A4060",marginTop:4,fontWeight:700,
              letterSpacing:"0.07em",textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rating distribution — half-star buckets */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
          textTransform:"uppercase",marginBottom:14 }}>Rating distribution</div>
        <div style={{ display:"flex",gap:3,alignItems:"flex-end",height:72 }}>
          {stats.ratingDist.map(({ r, count })=>(
            <div key={r} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
              {count>0 && <div style={{ fontSize:9,color:"#555D7A" }}>{count}</div>}
              <div style={{ width:"100%",borderRadius:2,background:"#F0A500",
                height:`${(count/stats.maxDist)*52}px`,minHeight:count>0?3:0 }}/>
              <div style={{ fontSize:8,color:"#3A4060" }}>{r}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top genres */}
      {stats.topGenres.length>0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
            textTransform:"uppercase",marginBottom:14 }}>Genres played</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {stats.topGenres.map(([genre,count],i)=>{
              const max=stats.topGenres[0][1];
              return (
                <div key={genre} style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:90,fontSize:11,color:"#7B8099",textAlign:"right",flexShrink:0 }}>{genre}</div>
                  <div style={{ flex:1,height:7,background:"#1A1E2E",borderRadius:4,overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:4,transition:"width 0.5s",
                      width:`${(count/max)*100}%`,background:`hsl(${220+i*28},65%,58%)` }}/>
                  </div>
                  <div style={{ fontSize:11,color:"#3A4060",width:16,flexShrink:0 }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platforms */}
      {stats.topPlatforms.length>0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
            textTransform:"uppercase",marginBottom:12 }}>Platforms</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {stats.topPlatforms.map(([plat,count])=>(
              <div key={plat} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",
                borderRadius:8,padding:"6px 12px",textAlign:"center" }}>
                <div style={{ fontSize:13,fontWeight:800,color:"#EAEBF2" }}>{count}</div>
                <div style={{ fontSize:9,color:"#3A4060" }}>{plat}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion breakdown */}
      {Object.keys(stats.completionCounts).length>0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
            textTransform:"uppercase",marginBottom:12 }}>Completion types</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {Object.entries(stats.completionCounts).map(([type,count])=>(
              <div key={type} style={{ background:"#7C3AED22",border:"1px solid #7C3AED44",
                borderRadius:8,padding:"6px 12px",textAlign:"center" }}>
                <div style={{ fontSize:13,fontWeight:800,color:"#A78BFA" }}>{count}</div>
                <div style={{ fontSize:9,color:"#7B8099" }}>{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top years */}
      {stats.topYears.length>0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
            textTransform:"uppercase",marginBottom:12 }}>Favorite eras</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {stats.topYears.map(([year,count])=>(
              <div key={year} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",
                borderRadius:8,padding:"8px 14px",textAlign:"center" }}>
                <div style={{ fontSize:16,fontWeight:800,color:"#EAEBF2" }}>{year}</div>
                <div style={{ fontSize:10,color:"#3A4060" }}>{count} game{count!==1?"s":""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={exportCSV} style={{ padding:"9px 18px",borderRadius:8,
        background:"#0D0F17",border:"1px solid #1A1E2E",color:"#555D7A",
        fontSize:12,fontWeight:600,cursor:"pointer" }}>
        Export library (CSV)
      </button>
    </div>
  );
}

function Profile({ games, userGames, onOpen, favorites, setFavorites, profile, setProfile, session }) {
  const [subTab, setSubTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const [draftPublic, setDraftPublic] = useState(profile.isPublic||false);
  const [copied, setCopied] = useState(false);
  const w = useWindowWidth();
  const mobile = w < 640;
  const profileUrl = `${window.location.origin}/backlog/#/u/${profile.username||toSlug(profile.name)}`;

  const subTabs = [
    ["profile","Profile"],["activity","Activity"],
    ["games","Games"],["diary","Diary"],
    ["reviews","Reviews"],["backlog","Backlog"],
    ["stats","Stats"],["lists","Lists"],
    ["yearinreview","Year in Review"],["users","Find Users"],
  ];

  const totals = useMemo(()=>({
    played: games.filter(g=>userGames[g.id]?.status==="Played").length,
    thisYear: games.filter(g=>{
      const ug=userGames[g.id];
      return ug?.status==="Played" && ug?.date && new Date(ug.date).getFullYear()===new Date().getFullYear();
    }).length,
    backlog: games.filter(g=>userGames[g.id]?.status==="Want to Play").length,
    reviews: games.filter(g=>userGames[g.id]?.review).length,
  }),[games,userGames]);

  const saveProfile = () => {
    setProfile({ name:draftName, bio:draftBio, isPublic:draftPublic });
    setEditing(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    showToast("Profile link copied!", "info");
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ background:"var(--bg-secondary)",borderBottom:"1px solid var(--border)",padding:mobile?"20px 16px 0":"28px 20px 0" }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>

          {/* Avatar + name + stats */}
          <div style={{ display:"flex",flexDirection:mobile?"column":"row",
            alignItems:"flex-start",gap:16,marginBottom:20 }}>
            <div style={{ display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0 }}>
              <div style={{ width:mobile?56:72,height:mobile?56:72,borderRadius:"50%",flexShrink:0,
                background:"linear-gradient(135deg,#F0A500,#7C3AED)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:mobile?20:26,fontWeight:900,color:"#fff" }}>
                {profile.name[0].toUpperCase()}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                {editing ? (
                  <div>
                    <input value={draftName} onChange={e=>setDraftName(e.target.value)}
                      style={{ background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:6,
                        color:"var(--text-primary)",fontSize:16,fontWeight:800,padding:"4px 10px",
                        outline:"none",width:"100%",marginBottom:8,boxSizing:"border-box" }}/>
                    <input value={draftBio} onChange={e=>setDraftBio(e.target.value)}
                      placeholder="Short bio..."
                      style={{ background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:6,
                        color:"var(--text-primary)",fontSize:13,padding:"4px 10px",
                        outline:"none",width:"100%",boxSizing:"border-box" }}/>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:10,marginBottom:2 }}>
                      <span style={{ fontSize:11,color:"var(--text-tertiary)",fontWeight:600 }}>Profile visibility:</span>
                      <button onClick={()=>setDraftPublic(p=>!p)}
                        style={{ padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                          border:`1px solid ${draftPublic?"#22C55E":"var(--border-hover)"}`,
                          background:draftPublic?"#14532D":"var(--bg-tertiary)",
                          color:draftPublic?"#4ADE80":"var(--text-tertiary)" }}>
                        {draftPublic?"Public":"Private"}
                      </button>
                    </div>
                    <div style={{ display:"flex",gap:8,marginTop:8 }}>
                      <button onClick={saveProfile} style={{ padding:"5px 14px",borderRadius:6,
                        background:"var(--accent)",color:"#000",border:"none",
                        fontWeight:700,fontSize:12,cursor:"pointer" }}>Save</button>
                      <button onClick={()=>setEditing(false)} style={{ padding:"5px 14px",borderRadius:6,
                        background:"var(--bg-tertiary)",color:"var(--text-secondary)",border:"1px solid var(--border)",
                        fontSize:12,cursor:"pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:mobile?16:20,fontWeight:800,color:"var(--text-primary)",marginBottom:2 }}>{profile.name}</div>
                    {profile.bio && <div style={{ fontSize:12,color:"var(--text-secondary)",marginBottom:6 }}>{profile.bio}</div>}
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                      <button onClick={()=>{ setDraftName(profile.name); setDraftBio(profile.bio); setDraftPublic(profile.isPublic||false); setEditing(true); }}
                        style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:5,background:"none",
                          border:"1px solid var(--border-hover)",color:"var(--text-tertiary)",cursor:"pointer",letterSpacing:"0.05em" }}>
                        EDIT PROFILE
                      </button>
                      <span style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:5,
                        border:`1px solid ${profile.isPublic?"#22C55E":"var(--border-hover)"}`,
                        color:profile.isPublic?"#4ADE80":"var(--text-muted)",letterSpacing:"0.05em" }}>
                        {profile.isPublic?"PUBLIC":"PRIVATE"}
                      </span>
                      {profile.isPublic && (
                        <button onClick={copyLink}
                          style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:5,
                            background:copied?"#14532D":"none",
                            border:`1px solid ${copied?"#22C55E":"var(--border-hover)"}`,
                            color:copied?"#4ADE80":"var(--text-tertiary)",cursor:"pointer",letterSpacing:"0.05em" }}>
                          {copied?"COPIED!":"SHARE PROFILE"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:"grid",
              gridTemplateColumns:mobile?"repeat(4,1fr)":"repeat(4,auto)",
              gap:mobile?"8px 16px":"0 24px",
              width:mobile?"100%":"auto",flexShrink:0,
              marginTop:mobile?4:0 }}>
              {[
                { label:"GAMES",    value:totals.played },
                { label:"THIS YEAR",value:totals.thisYear },
                { label:"BACKLOG",  value:totals.backlog },
                { label:"REVIEWS",  value:totals.reviews },
              ].map(s=>(
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:mobile?18:22,fontWeight:900,color:"var(--text-primary)",lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:9,fontWeight:700,letterSpacing:"0.07em",color:"var(--text-muted)",marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-nav */}
          <div style={{ display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none",marginLeft:-4,
            WebkitOverflowScrolling:"touch" }}>
            {subTabs.map(([id,label])=>(
              <button key={id} onClick={()=>setSubTab(id)}
                style={{ padding:"10px 14px",background:"none",border:"none",cursor:"pointer",
                  fontSize:13,fontWeight:subTab===id?700:500,
                  whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent",
                  color:subTab===id?"var(--text-primary)":"var(--text-tertiary)",
                  borderBottom:subTab===id?"2px solid var(--text-primary)":"2px solid transparent",
                  marginBottom:-1,transition:"color 0.12s" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:mobile?"20px 16px 80px":"28px 20px 56px",maxWidth:760,margin:"0 auto" }}>
        {subTab==="profile"      && <ProfileOverview games={games} userGames={userGames} onOpen={onOpen} favorites={favorites} setFavorites={setFavorites}/>}
        {subTab==="activity"     && <ActivityFeed session={session}/>}
        {subTab==="games"        && <ProfileGames games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="diary"        && <ProfileDiary games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="reviews"      && <ProfileReviews games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="backlog"      && <ProfileWatchlist games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="stats"        && <ProfileStats games={games} userGames={userGames}/>}
        {subTab==="lists"        && <ProfileLists games={games} userGames={userGames} session={session} onOpen={onOpen}/>}
        {subTab==="yearinreview" && <YearInReview games={games} userGames={userGames}/>}
        {subTab==="users"        && <UserSearch/>}
      </div>
    </div>
  );
}

// ─── Year in Review ────────────────────────────────────────────────
function YearInReview({ games, userGames }) {
  const years = useMemo(()=>[...new Set(
    Object.values(userGames).map(ug=>ug.date?new Date(ug.date).getFullYear():null).filter(Boolean)
  )].sort((a,b)=>b-a),[userGames]);

  const [year, setYear] = useState(()=>years[0]||new Date().getFullYear());

  const yearEntries = useMemo(()=>{
    const gMap = Object.fromEntries(games.map(g=>[g.id,g]));
    return Object.entries(userGames)
      .filter(([,ug])=>ug.date&&new Date(ug.date).getFullYear()===year)
      .map(([id,ug])=>({ game:gMap[parseInt(id)]||{id:parseInt(id),title:ug.title,cover:ug.cover,genre:ug.genre}, ...ug }));
  },[games,userGames,year]);

  const played   = yearEntries.filter(e=>e.status==="Played");
  const ratings  = yearEntries.filter(e=>e.rating>0).map(e=>e.rating);
  const avg      = ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):null;
  const best     = played.filter(e=>e.rating>0).sort((a,b)=>b.rating-a.rating)[0];
  const genreMap = {};
  played.forEach(e=>{ if(e.game?.genre) genreMap[e.game.genre]=(genreMap[e.game.genre]||0)+1; });
  const topGenre = Object.entries(genreMap).sort((a,b)=>b[1]-a[1])[0];

  const monthCounts = Array(12).fill(0);
  yearEntries.forEach(e=>{ if(e.date) monthCounts[new Date(e.date).getMonth()]++; });
  const maxMonth = Math.max(...monthCounts, 1);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (!yearEntries.length) return (
    <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>
      {years.length===0?"Log games to generate your Year in Review.":"No games logged in "+year+"."}
    </div>
  );

  return (
    <div>
      {years.length>1 && (
        <div style={{ display:"flex",gap:6,marginBottom:20,flexWrap:"wrap" }}>
          {years.map(y=>(
            <button key={y} onClick={()=>setYear(y)}
              style={{ padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                border:`1px solid ${y===year?"#F0A500":"#1A1E2E"}`,
                background:y===year?"#F0A50020":"#12141C",
                color:y===year?"#F0A500":"#555D7A" }}>{y}</button>
          ))}
        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:24 }}>
        {[
          { label:"Games logged",   value:yearEntries.length },
          { label:"Games played",   value:played.length },
          { label:"Avg rating",     value:avg?`★ ${avg}`:"—" },
          { label:"Top genre",      value:topGenre?topGenre[0]:"—" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",
            borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontSize:20,fontWeight:900,color:"#F0A500",lineHeight:1.1 }}>{s.value}</div>
            <div style={{ fontSize:9,color:"#3A4060",marginTop:4,fontWeight:700,
              letterSpacing:"0.07em",textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {best && (
        <div style={{ background:"linear-gradient(135deg,#1A1025,#0D1A0D)",border:"1px solid #22263A",
          borderRadius:10,padding:16,marginBottom:24,display:"flex",gap:12,alignItems:"center" }}>
          <div style={{ width:48,height:64,borderRadius:6,overflow:"hidden",flexShrink:0,
            background:best.game?.cover?`url(${best.game.cover}) center/cover no-repeat`:gameBg(best.game?.title||"") }}/>
          <div>
            <div style={{ fontSize:9,fontWeight:700,color:"#F0A500",letterSpacing:"0.12em",
              textTransform:"uppercase",marginBottom:4 }}>Your best of {year}</div>
            <div style={{ fontSize:15,fontWeight:800,color:"#EAEBF2",marginBottom:4 }}>{best.game?.title}</div>
            <Stars value={best.rating} readonly size={13}/>
          </div>
        </div>
      )}

      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
          textTransform:"uppercase",marginBottom:14 }}>Activity by month</div>
        <div style={{ display:"flex",gap:6,alignItems:"flex-end",height:70 }}>
          {monthCounts.map((count,i)=>(
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
              <div style={{ width:"100%",borderRadius:3,background:count>0?"#F0A500":"#1A1E2E",
                height:`${(count/maxMonth)*50}px`,minHeight:count>0?4:0 }}/>
              <div style={{ fontSize:8,color:"#3A4060" }}>{MONTHS[i].slice(0,1)}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
          textTransform:"uppercase",marginBottom:12 }}>All {year} logs</div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {yearEntries.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>(
            <div key={e.game.id} style={{ display:"flex",gap:12,alignItems:"center",
              padding:"8px 12px",background:"#0D0F17",borderRadius:8,border:"1px solid #1A1E2E" }}>
              <div style={{ width:36,height:48,borderRadius:4,flexShrink:0,overflow:"hidden",
                background:e.game?.cover?`url(${e.game.cover}) center/cover no-repeat`:gameBg(e.game?.title||"") }}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:12,color:"#EAEBF2",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{e.game?.title}</div>
                <div style={{ fontSize:10,color:"#555D7A",marginTop:2 }}>
                  {new Date(e.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
                <Badge status={e.status}/>
                {e.rating>0 && <Stars value={e.rating} readonly size={10}/>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Custom Lists ───────────────────────────────────────────────────
function ProfileLists({ games, userGames, session, onOpen }) {
  const [lists, setLists]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [creating, setCreating]   = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [listGames, setListGames] = useState([]);
  const [addingGame, setAddingGame] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadLists = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error: err } = await supabase
        .from("lists")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (err) { setError(true); return; }
      setLists(data||[]);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { loadLists(); }, [loadLists]);

  const loadListGames = async (listId) => {
    try {
      const { data } = await supabase.from("list_items").select("*").eq("list_id", listId).order("position");
      setListGames(data||[]);
    } catch {}
  };

  const createList = async () => {
    if (!newTitle.trim() || !session) return;
    const { data } = await supabase.from("lists").insert({
      user_id: session.user.id, title: newTitle.trim(),
      description: newDesc.trim()||null, is_public: newPublic
    }).select().single();
    if (data) { setLists(prev=>[data,...prev]); setCreating(false); setNewTitle(""); setNewDesc(""); }
  };

  const deleteList = async (listId) => {
    await supabase.from("lists").delete().eq("id", listId);
    setLists(prev=>prev.filter(l=>l.id!==listId));
    if (selectedList?.id===listId) setSelectedList(null);
    setDeleteConfirm(null);
  };

  const addGameToList = async (gameId, gameTitle, gameCover) => {
    if (!selectedList) return;
    const { error: err } = await supabase.from("list_items").insert({
      list_id: selectedList.id, game_id: gameId, position: listGames.length
    });
    if (!err) {
      setListGames(prev=>[...prev, { list_id:selectedList.id, game_id:gameId }]);
      setAddingGame(false);
    }
  };

  const removeFromList = async (gameId) => {
    await supabase.from("list_items").delete().match({ list_id: selectedList.id, game_id: gameId });
    setListGames(prev=>prev.filter(i=>i.game_id!==gameId));
  };

  if (loading) return <div style={{ fontSize:13,color:"#3A4060",padding:"20px 0" }}>Loading lists...</div>;
  if (error) return (
    <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>
      Lists require a database migration. Run the SQL from the setup guide to enable this feature.
    </div>
  );

  if (selectedList) {
    const myGamesNotInList = games.filter(g=>userGames[g.id]?.status&&!listGames.find(i=>i.game_id===g.id));
    return (
      <div>
        <button onClick={()=>{ setSelectedList(null); setAddingGame(false); }}
          style={{ background:"none",border:"none",cursor:"pointer",color:"#555D7A",
            fontSize:12,fontWeight:600,marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:6 }}>
          ← Back to lists
        </button>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:"#EAEBF2",marginBottom:4 }}>{selectedList.title}</div>
            {selectedList.description && <div style={{ fontSize:12,color:"#7B8099" }}>{selectedList.description}</div>}
          </div>
          <span style={{ fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,
            border:`1px solid ${selectedList.is_public?"#22C55E":"#2E3450"}`,
            color:selectedList.is_public?"#4ADE80":"#3A4060" }}>
            {selectedList.is_public?"PUBLIC":"PRIVATE"}
          </span>
        </div>
        <div style={{ display:"flex",gap:8,marginBottom:16 }}>
          <button onClick={()=>setAddingGame(a=>!a)}
            style={{ padding:"7px 14px",borderRadius:7,background:"#F0A500",color:"#000",
              border:"none",fontWeight:700,fontSize:12,cursor:"pointer" }}>
            {addingGame?"Cancel":"+ Add game"}
          </button>
        </div>
        {addingGame && (
          <div style={{ background:"#0D0F17",border:"1px solid #1A1E2E",borderRadius:10,
            padding:14,marginBottom:16,maxHeight:200,overflowY:"auto" }}>
            <div style={{ fontSize:11,color:"#3A4060",marginBottom:8 }}>Pick from your library:</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {myGamesNotInList.map(g=>(
                <button key={g.id} onClick={()=>addGameToList(g.id,g.title,g.cover)}
                  style={{ padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",
                    background:"#181B25",border:"1px solid #22263A",color:"#9CA3AF" }}>
                  {g.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {listGames.length===0 ? (
          <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No games in this list yet</div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {listGames.map((item,idx)=>{
              const g = games.find(x=>x.id===item.game_id)||{id:item.game_id,title:`Game #${item.game_id}`,cover:null};
              const ug = userGames[item.game_id];
              return (
                <div key={item.game_id} style={{ display:"flex",gap:12,alignItems:"center",
                  padding:"10px 12px",background:"#0D0F17",borderRadius:8,border:"1px solid #1A1E2E" }}>
                  <div style={{ color:"#3A4060",fontSize:11,fontWeight:700,width:20,textAlign:"center" }}>{idx+1}</div>
                  <div style={{ width:36,height:48,borderRadius:4,flexShrink:0,overflow:"hidden",
                    background:g.cover?`url(${g.cover}) center/cover no-repeat`:gameBg(g.title) }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:"#EAEBF2",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{g.title}</div>
                    {ug?.rating>0 && <Stars value={ug.rating} readonly size={10}/>}
                  </div>
                  <button onClick={()=>removeFromList(item.game_id)}
                    style={{ background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:14,padding:4 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {creating ? (
        <div style={{ background:"#0D0F17",border:"1px solid #1A1E2E",borderRadius:10,padding:16,marginBottom:20 }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#EAEBF2",marginBottom:12 }}>New list</div>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="List title"
            style={{ width:"100%",padding:"8px 11px",background:"#0A0B0F",border:"1px solid #1A1E2E",
              borderRadius:7,color:"#EAEBF2",fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box" }}/>
          <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Description (optional)"
            style={{ width:"100%",padding:"8px 11px",background:"#0A0B0F",border:"1px solid #1A1E2E",
              borderRadius:7,color:"#EAEBF2",fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box" }}/>
          <label style={{ display:"flex",alignItems:"center",gap:7,marginBottom:12,cursor:"pointer" }}>
            <input type="checkbox" checked={newPublic} onChange={e=>setNewPublic(e.target.checked)}
              style={{ accentColor:"#22C55E" }}/>
            <span style={{ fontSize:12,color:"#555D7A" }}>Make list public</span>
          </label>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={createList} style={{ padding:"7px 16px",borderRadius:7,background:"#F0A500",
              color:"#000",border:"none",fontWeight:700,fontSize:12,cursor:"pointer" }}>Create</button>
            <button onClick={()=>setCreating(false)} style={{ padding:"7px 14px",borderRadius:7,
              background:"#1A1E2E",color:"#7B8099",border:"1px solid #22263A",fontSize:12,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setCreating(true)} style={{ padding:"8px 16px",borderRadius:8,
          background:"#F0A500",color:"#000",border:"none",fontWeight:700,fontSize:12,
          cursor:"pointer",marginBottom:16 }}>+ New list</button>
      )}
      {lists.length===0 ? (
        <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No lists yet. Create one to curate your favorite games.</div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {lists.map(l=>(
            <div key={l.id} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",borderRadius:10,
              padding:"12px 14px",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ flex:1,minWidth:0,cursor:"pointer" }}
                onClick={()=>{ setSelectedList(l); loadListGames(l.id); }}>
                <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13,marginBottom:2 }}>{l.title}</div>
                {l.description && <div style={{ fontSize:11,color:"#7B8099" }}>{l.description}</div>}
                <span style={{ fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,
                  border:`1px solid ${l.is_public?"#22C55E":"#2E3450"}`,
                  color:l.is_public?"#4ADE80":"#3A4060",marginTop:4,display:"inline-block" }}>
                  {l.is_public?"PUBLIC":"PRIVATE"}
                </span>
              </div>
              {deleteConfirm===l.id ? (
                <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                  <button onClick={()=>deleteList(l.id)} style={{ padding:"5px 10px",borderRadius:6,
                    background:"#EF4444",color:"#fff",border:"none",fontSize:11,fontWeight:700,cursor:"pointer" }}>Delete</button>
                  <button onClick={()=>setDeleteConfirm(null)} style={{ padding:"5px 10px",borderRadius:6,
                    background:"#1A1E2E",color:"#7B8099",border:"1px solid #22263A",fontSize:11,cursor:"pointer" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={()=>setDeleteConfirm(l.id)}
                  style={{ background:"none",border:"none",cursor:"pointer",color:"#3A4060",fontSize:16,padding:4 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User Search ────────────────────────────────────────────────────
function UserSearch() {
  const [q, setQ]         = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("username, bio, is_public")
          .ilike("username", `%${q.trim()}%`)
          .limit(12);
        setResults(data||[]);
      } catch {}
      setLoading(false);
      setSearched(true);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div style={{ position:"relative",marginBottom:16 }}>
        <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}>🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Find users by username..."
          style={{ width:"100%",padding:"10px 12px 10px 32px",background:"var(--bg-primary)",
            border:"1px solid var(--border)",borderRadius:9,color:"var(--text-primary)",fontSize:13,
            outline:"none",boxSizing:"border-box" }}/>
      </div>
      {loading && <div style={{ fontSize:13,color:"#3A4060" }}>Searching...</div>}
      {searched && !loading && results.length===0 && (
        <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No public users found for "{q}"</div>
      )}
      {results.length>0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {results.map(u=>(
            <a key={u.username} href={`/backlog/#/u/${u.username}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"flex",gap:12,alignItems:"center",padding:"12px 14px",
                background:"#0D0F17",border:"1px solid #1A1E2E",borderRadius:10,
                textDecoration:"none",transition:"border-color 0.15s" }}>
              <div style={{ width:40,height:40,borderRadius:"50%",flexShrink:0,
                background:`linear-gradient(135deg,hsl(${strToHue(u.username)},60%,45%),hsl(${(strToHue(u.username)+45)%360},70%,30%))`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,fontWeight:900,color:"#fff" }}>
                {u.username[0].toUpperCase()}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13,marginBottom:2 }}>{u.username}</div>
                {u.bio && <div style={{ fontSize:11,color:"#7B8099",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{u.bio}</div>}
              </div>
              <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                background:"#F0A50022",border:"1px solid #F0A50044",color:"#F0A500" }}>View →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Follow Button ──────────────────────────────────────────────────
function FollowButton({ targetUserId, currentUserId }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!currentUserId||!targetUserId||currentUserId===targetUserId) { setLoading(false); return; }
    supabase.from("follows")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => { setFollowing(!!data); setLoading(false); })
      .catch(()=>setLoading(false));
  }, [currentUserId, targetUserId]);

  const toggle = async () => {
    if (!currentUserId) return;
    if (following) {
      await supabase.from("follows").delete().match({ follower_id:currentUserId, following_id:targetUserId });
    } else {
      await supabase.from("follows").insert({ follower_id:currentUserId, following_id:targetUserId });
    }
    setFollowing(f=>!f);
  };

  if (!currentUserId||!targetUserId||currentUserId===targetUserId||loading) return null;
  return (
    <button onClick={toggle}
      style={{ padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:12,cursor:"pointer",
        border:`1px solid ${following?"#22263A":"#F0A500"}`,
        background:following?"#181B25":"#F0A500",
        color:following?"#7B8099":"#000",transition:"all 0.15s" }}>
      {following?"Following":"Follow"}
    </button>
  );
}

// ─── Notification Bell ──────────────────────────────────────────────
function NotificationBell({ session }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]   = useState(false);
  const panelRef          = useRef();

  useEffect(() => {
    if (!session) return;
    supabase.from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data||[]))
      .catch(()=>{});
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const markRead = async () => {
    const unreadIds = notifications.filter(n=>!n.read).map(n=>n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ read:true }).in("id", unreadIds).catch(()=>{});
    setNotifications(prev=>prev.map(n=>({ ...n, read:true })));
  };

  const unread = notifications.filter(n=>!n.read).length;

  return (
    <div style={{ position:"relative" }} ref={panelRef}>
      <button onClick={()=>{ setOpen(o=>!o); if(!open) markRead(); }}
        style={{ background:"none",border:"none",cursor:"pointer",
          fontSize:20,padding:"0 8px",position:"relative",
          WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center" }}>
        🔔
        {unread>0 && (
          <span style={{ position:"absolute",top:-2,right:2,background:"#EF4444",color:"#fff",
            borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,
            display:"flex",alignItems:"center",justifyContent:"center" }}>{unread>9?"9+":unread}</span>
        )}
      </button>
      {open && (
        <div style={{ position:"absolute",right:0,top:"calc(100% + 8px)",width:280,
          background:"#12141C",border:"1px solid #1A1E2E",borderRadius:10,
          boxShadow:"0 8px 32px #00000088",zIndex:200,overflow:"hidden" }}>
          <div style={{ padding:"10px 14px",borderBottom:"1px solid #1A1E2E",
            fontSize:11,fontWeight:700,color:"#3A4060",letterSpacing:"0.08em",textTransform:"uppercase" }}>
            Notifications
          </div>
          {notifications.length===0 ? (
            <div style={{ padding:"20px 14px",fontSize:12,color:"#3A4060",textAlign:"center",fontStyle:"italic" }}>
              No notifications yet
            </div>
          ) : (
            <div style={{ maxHeight:320,overflowY:"auto" }}>
              {notifications.map(n=>(
                <div key={n.id} style={{ padding:"10px 14px",borderBottom:"1px solid #0D0F17",
                  background:n.read?"transparent":"#F0A50008" }}>
                  <div style={{ fontSize:12,color:"#9CA3AF",lineHeight:1.5 }}>
                    {n.payload?.text || n.type}
                  </div>
                  <div style={{ fontSize:10,color:"#3A4060",marginTop:3 }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Feed ──────────────────────────────────────────────────
function ActivityFeed({ session }) {
  const [feed, setFeed]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!session) return;
    async function load() {
      try {
        const { data: following, error: fe } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", session.user.id);
        if (fe) { setError(true); setLoading(false); return; }
        if (!following?.length) { setLoading(false); return; }
        const ids = following.map(f=>f.following_id);
        const { data: rows } = await supabase
          .from("user_games")
          .select("*, profiles!inner(username)")
          .in("user_id", ids)
          .order("logged_at", { ascending:false })
          .limit(40);
        setFeed(rows||[]);
      } catch { setError(true); }
      setLoading(false);
    }
    load();
  }, [session]);

  if (loading) return <div style={{ fontSize:13,color:"#3A4060",padding:"20px 0" }}>Loading activity...</div>;
  if (error) return (
    <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>
      Activity feed requires the follow system. Run the SQL migration to enable this feature.
    </div>
  );
  if (!feed.length) return (
    <div style={{ padding:"32px 0",textAlign:"center" }}>
      <div style={{ fontSize:36,marginBottom:10 }}>👥</div>
      <div style={{ fontSize:14,color:"#7B8099",fontWeight:700,marginBottom:6 }}>No activity yet</div>
      <div style={{ fontSize:12,color:"#3A4060" }}>Follow other users to see their game logs here</div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {feed.map((row,i)=>(
        <div key={i} style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 12px",
          background:"#0D0F17",borderRadius:10,border:"1px solid #1A1E2E" }}>
          <div style={{ width:36,height:48,borderRadius:4,flexShrink:0,overflow:"hidden",
            background:row.game_cover?`url(${row.game_cover}) center/cover no-repeat`:gameBg(row.game_title||"?") }}/>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,color:"#9CA3AF",marginBottom:2 }}>
              <a href={`/backlog/#/u/${row.profiles?.username}`} target="_blank"
                style={{ color:"#F0A500",fontWeight:700,textDecoration:"none" }}>
                {row.profiles?.username}
              </a>{" "}
              {row.status==="Played"?"played":"added"}{" "}
              <span style={{ color:"#EAEBF2",fontWeight:600 }}>{row.game_title}</span>
            </div>
            <div style={{ fontSize:10,color:"#3A4060" }}>
              {new Date(row.logged_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
            <Badge status={row.status}/>
            {row.rating>0 && <Stars value={row.rating} readonly size={10}/>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Landing page ──────────────────────────────────────────────────
const POPULAR_IDS  = [1,5,2,8,10,3,6,16,4,7,15,9];
const TOPFAN_IDS   = [2,1,5,8,3,15,17,18,6,7,10,4];
const NEWREL_IDS   = [17,18,2,22,15,1,23,24,9,12,19,20];
const HERO_IDS     = [1,7,13,19,5,16,10,4,22,8,3,17,6,11,2,15,9,20,14,23,12,18,24,21];

const SAMPLE_REVIEWS = [
  { user:"kingslayer",  gameId:1,  rating:5, text:"A masterpiece. Every dungeon tells a story worth uncovering. From Software's finest work — and they've had some fine work.", likes:234 },
  { user:"pixel_witch", gameId:5,  rating:5, text:"I just kept saying one more run. Hades perfected the roguelike formula and wrapped it in one of gaming's best stories.", likes:187 },
  { user:"neonsamurai", gameId:8,  rating:5, text:"Nothing else feels like this. Disco Elysium broke my brain and put it back together differently. Required for anyone who cares about games.", likes:156 },
  { user:"ghostrunner", gameId:10, rating:5, text:"The ending left me sitting in silence for ten minutes. Outer Wilds is the closest games have ever come to literature.", likes:143 },
  { user:"starforged",  gameId:2,  rating:5, text:"I've never had a tabletop session this good. Baldur's Gate 3 is a generational achievement that will be studied for decades.", likes:98 },
];

const SAMPLE_LISTS = [
  { title:"Games That Will Make You Cry",    user:"ghostrunner", count:12, covers:[10,9,24,7]  },
  { title:"The 10 Best RPGs of the Decade",  user:"kingslayer",  count:10, covers:[1,2,3,8]   },
  { title:"Perfect One-Sitting Experiences", user:"pixel_witch", count:8,  covers:[12,9,14,5] },
  { title:"Backlog's Top 100 Games",         user:"Backlog",     count:100,covers:[1,5,2,8]   },
];

const SAMPLE_MEMBERS = [
  { name:"kingslayer",  played:148, hue:30  },
  { name:"pixel_witch", played:203, hue:300 },
  { name:"neonsamurai", played:89,  hue:180 },
  { name:"ghostrunner", played:167, hue:120 },
  { name:"starforged",  played:211, hue:240 },
  { name:"voidwalker",  played:94,  hue:60  },
];

const SAMPLE_STORIES = [
  { tag:"FEATURE", title:"The 10 Best Games to Play Right Now", excerpt:"From brutal action RPGs to cozy sims — the essential playlist for any serious gamer this season.", coverId:5 },
  { tag:"DEEP DIVE", title:"Why Outer Wilds Is the Most Important Game of the Decade", excerpt:"A meditation on why Mobius Digital's quiet masterpiece changed the medium forever.", coverId:10 },
  { tag:"REVIEW", title:"Elden Ring Two Years Later: Still the Greatest Open World Ever", excerpt:"From Software's magnum opus holds up — and then some. A look back at a landmark release.", coverId:1 },
  { tag:"GUIDE", title:"Where to Start with FromSoftware in 2024", excerpt:"Overwhelmed by the catalog? We map the best entry points for newcomers and returning fans.", coverId:11 },
  { tag:"LIST", title:"Games That Defined Each Year of the Decade", excerpt:"From Hollow Knight to Baldur's Gate 3 — one game per year that said everything about its moment.", coverId:4 },
  { tag:"INTERVIEW", title:"How Team Cherry Built Hollow Knight for $57,000", excerpt:"The two-person studio that created one of the most beloved indie games ever talks craft, luck, and persistence.", coverId:4 },
];

function PosterCard({ game, onGoAuth }) {
  const [hov, setHov] = useState(false);
  const accent = gameAccent(game.title);
  const hasCover = game.cover && game.cover.length > 0 && game.cover !== 'null';
  return (
    <div onClick={()=>onGoAuth("signup")} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      title={game.title} style={{ width:88,flexShrink:0,cursor:"pointer" }}>
      <div style={{ width:88,height:118,borderRadius:6,overflow:"hidden",
        backgroundImage: hasCover ? `url(${game.cover})` : gameBg(game.title),
        backgroundSize: "cover",
        backgroundPosition: "center",
        position:"relative",
        outline:hov?`2px solid ${accent}`:"2px solid transparent",
        transition:"outline 0.15s,transform 0.15s",
        transform:hov?"scale(1.04)":"scale(1)" }}>
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(to bottom,transparent 50%,#00000099 100%)" }}/>
        <div style={{ position:"absolute",bottom:5,left:5,right:5,
          fontSize:8,fontWeight:700,color:"#ffffffCC",lineHeight:1.3 }}>{game.title}</div>
      </div>
    </div>
  );
}

function HeroCoverTile({ game }) {
  const hasCover = game.cover && game.cover.length > 0 && game.cover !== 'null';
  return (
    <div style={{ backgroundImage: hasCover ? `url(${game.cover})` : gameBg(game.title),
      backgroundSize: "cover",
      backgroundPosition: "center",
      borderRadius:4,overflow:"hidden",width:"100%",height:"100%" }}/>
  );
}

function GameStrip({ title, games, onGoAuth }) {
  return (
    <div style={{ marginBottom:36 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:12,padding:"0 32px" }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",
          color:"#555D7A",textTransform:"uppercase" }}>{title}</div>
        <button onClick={()=>onGoAuth("signup")}
          style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",
            border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>MORE</button>
      </div>
      <div style={{ display:"flex",gap:8,overflowX:"auto",
        padding:"4px 32px 8px",scrollbarWidth:"none" }}>
        {games.map(g=><PosterCard key={g.id} game={g} onGoAuth={onGoAuth}/>)}
      </div>
    </div>
  );
}

function LandingPage({ onGoAuth }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const tablet = w < 1024;
  const [liveGames, setLiveGames] = useState(null); // null=loading, []=failed, [...]= loaded

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 1. Always try RAWG first — real fresh covers
      try {
        const [p1, p2, p3] = await Promise.all([getPopular(1), getPopular(2), getPopular(3)]);
        const rawgGames = [...p1, ...p2, ...p3].slice(0, 60);

        if (rawgGames.length > 0) {
          if (!cancelled) setLiveGames(rawgGames);

          // 2. Save to cache in background (used when RAWG rate-limits)
          try {
            await supabase.from('games_cache').upsert(
              rawgGames.map(g=>({
                id: g.id, title: g.title, cover_url: g.cover,
                year: g.year, genre: g.genre,
                updated_at: new Date().toISOString()
              })),
              { onConflict:'id' }
            );
          } catch (cacheErr) {
            // Cache save failed - non-critical, don't fall through
          }
          return;
        }
      } catch (e) {
        // RAWG failed (rate limit / network) — try Supabase cache
      }

      // 3. RAWG failed — try Supabase cache
      try {
        const { data: cached } = await supabase
          .from('games_cache').select('*').limit(48);
        if (!cancelled && cached?.length > 0) {
          const mapped = cached.map(g=>({ id:g.id, title:g.title, cover:g.cover_url, year:g.year, genre:g.genre }));
          setLiveGames(mapped);
          return;
        }
      } catch (e2) {
        // Cache failed
      }

      // 4. Both failed — static fallback
      if (!cancelled) setLiveGames([]);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Use live games if loaded, otherwise fall back to static GAMES
  const staticFallback = GAMES.map(g=>({ id:g.id, title:g.title, cover:null, year:g.year, genre:g.genre }));
  const displayGames = liveGames?.length > 0 ? liveGames : staticFallback;

  // Non-overlapping game slices for each section
  const heroEndIndex  = mobile ? 12 : 24;
  const heroGames     = displayGames.slice(0, heroEndIndex);
  const popularGames  = displayGames.slice(heroEndIndex, heroEndIndex + 12);
  const topGames      = displayGames.slice(heroEndIndex + 12, heroEndIndex + 24);
  // New section picks from remaining games, sorted by year
  const remainingGames = displayGames.slice(heroEndIndex + 24);
  const newGames      = remainingGames.length > 0
    ? [...remainingGames].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 12)
    : [...displayGames].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 12);

  return (
    <div style={{ background:"#0A0B0F",fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",
      color:"#EAEBF2",minHeight:"100vh" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:0px}
        ::-webkit-scrollbar-track{background:#0A0B0F}
        ::-webkit-scrollbar-thumb{background:#22263A;border-radius:3px}
        .lnav-link{color:#9CA3AF;font-size:13px;font-weight:500;background:none;border:none;cursor:pointer;padding:0;transition:color 0.12s}
        .lnav-link:hover{color:#EAEBF2}
        .story-card:hover .story-title{color:#F0A500!important}
        .review-card:hover{border-color:#2E3450!important}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ display:"flex",alignItems:"center",padding:mobile?"0 16px":"0 32px",height:52,
        borderBottom:"1px solid #12141C",background:"#0A0B0F",
        position:"sticky",top:0,zIndex:50 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginRight:mobile?0:36,flex:mobile?1:0 }}>
          <span style={{ fontSize:20 }}>🎮</span>
          <span style={{ fontWeight:900,fontSize:16,color:"#EAEBF2",letterSpacing:"-0.03em" }}>BACKLOG</span>
        </div>
        {!mobile && (
          <div style={{ display:"flex",gap:24,flex:1 }}>
            {["Games","Lists","Members","Journal"].map(l=>(
              <button key={l} className="lnav-link" onClick={()=>onGoAuth("signup")}>{l}</button>
            ))}
          </div>
        )}
        <div style={{ display:"flex",gap:mobile?8:10,alignItems:"center" }}>
          <button onClick={()=>onGoAuth("signin")} className="lnav-link"
            style={{ fontSize:mobile?12:13 }}>Sign in</button>
          <button onClick={()=>onGoAuth("signup")}
            style={{ padding:mobile?"6px 12px":"7px 16px",borderRadius:7,
              background:"#F0A500",border:"none",color:"#000",fontSize:mobile?12:13,
              fontWeight:800,cursor:"pointer" }}>
            {mobile?"Join":"Get Started"}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position:"relative",height:mobile?400:500,overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,
          display:"grid",
          gridTemplateColumns:`repeat(${mobile?6:12},1fr)`,
          gridTemplateRows:"repeat(2,1fr)",
          gap:4,padding:4 }}>
          {heroGames.map((g,i)=><HeroCoverTile key={g.id||i} game={g}/>)}
        </div>
        <div style={{ position:"absolute",inset:0,
          background:mobile
            ?"linear-gradient(to bottom,#0A0B0FBB 0%,#0A0B0F 85%)"
            :"linear-gradient(to right,#0A0B0F 38%,#0A0B0FCC 58%,#0A0B0F55 75%,transparent 100%)" }}/>
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(to top,#0A0B0F 0%,transparent 35%)" }}/>
        <div style={{ position:"relative",zIndex:1,
          padding:mobile?"40px 20px":"60px 40px",maxWidth:mobile?"100%":560,
          textAlign:mobile?"center":"left" }}>
          <h1 style={{ fontSize:mobile?28:42,fontWeight:900,lineHeight:1.1,
            color:"#EAEBF2",marginBottom:mobile?16:20,letterSpacing:"-0.03em" }}>
            Track games you've played.<br/>
            Save those you want to play.<br/>
            Tell your friends what's good.
          </h1>
          <button onClick={()=>onGoAuth("signup")}
            style={{ padding:mobile?"12px 24px":"13px 30px",borderRadius:9,background:"#F0A500",
              border:"none",color:"#000",fontSize:mobile?14:15,fontWeight:800,
              cursor:"pointer",marginBottom:mobile?12:20,display:"inline-block" }}>
            Get started — It's free!
          </button>
          <div style={{ fontSize:12,color:"#555D7A" }}>The social network for gamers.</div>
        </div>
      </div>

      {/* ── FEATURE ROW ── */}
      <div style={{ background:"#0D0F17",borderTop:"1px solid #12141C",
        borderBottom:"1px solid #12141C",padding:mobile?"24px 20px":"32px 40px" }}>
        <div style={{ display:"grid",
          gridTemplateColumns:mobile?"repeat(2,1fr)":"repeat(4,1fr)",
          gap:mobile?"20px 16px":24,maxWidth:1100,margin:"0 auto" }}>
          {[
            { icon:"🕹️", title:"Keep track of every game you've ever played", text:"(and some you've still to get to!)" },
            { icon:"❤️", title:"Show love for your favorite games", text:"and create your own lists." },
            { icon:"✍️", title:"Write and share reviews", text:"and follow friends to see what they're playing." },
            { icon:"📔", title:"Keep a diary of all the games you play", text:"and follow along in real time." },
          ].map(f=>(
            <div key={f.icon}>
              <div style={{ fontSize:mobile?22:26,marginBottom:8 }}>{f.icon}</div>
              <div style={{ fontSize:mobile?12:13,color:"#EAEBF2",lineHeight:1.55 }}>
                <strong>{f.title}</strong> {f.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GAME STRIPS ── */}
      <div style={{ padding:"28px 0 0" }}>
        <GameStrip title="Popular on Backlog" games={popularGames} onGoAuth={onGoAuth}/>

        {/* Top 250 banner */}
        <div style={{ margin:mobile?"0 16px 28px":"0 32px 36px",borderRadius:12,
          background:"linear-gradient(135deg,#1A1025 0%,#0D1A2E 100%)",
          border:"1px solid #1A1E2E",padding:mobile?"18px 20px":"28px 32px",
          display:"flex",alignItems:"center",gap:mobile?14:24 }}>
          <div style={{ fontSize:mobile?36:48,lineHeight:1 }}>🏆</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9,fontWeight:700,letterSpacing:"0.14em",
              color:"#F0A500",textTransform:"uppercase",marginBottom:4 }}>Backlog Official</div>
            <div style={{ fontSize:mobile?15:20,fontWeight:900,color:"#EAEBF2",marginBottom:3 }}>
              Top 250 Games of All Time
            </div>
            {!mobile && <div style={{ fontSize:13,color:"#555D7A" }}>
              Compiled by the Backlog community.
            </div>}
          </div>
          <button onClick={()=>onGoAuth("signup")}
            style={{ padding:mobile?"8px 14px":"10px 22px",borderRadius:8,background:"#F0A500",
              border:"none",color:"#000",fontWeight:800,fontSize:mobile?12:13,
              cursor:"pointer",flexShrink:0 }}>View</button>
        </div>

        <GameStrip title="Top Games With the Most Fans" games={topGames} onGoAuth={onGoAuth}/>
        <GameStrip title="New &amp; Recent Releases" games={newGames} onGoAuth={onGoAuth}/>
      </div>

      {/* ── REVIEWS + SIDEBAR ── */}
      <div style={{ borderTop:"1px solid #12141C",
        padding:mobile?"28px 16px 32px":tablet?"28px 24px 32px":"36px 32px 40px",
        display:"grid",
        gridTemplateColumns:mobile?"1fr":tablet?"1fr":"1fr 320px",
        gap:mobile?32:40,maxWidth:1200,margin:"0 auto" }}>

        <div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",
              color:"#555D7A",textTransform:"uppercase" }}>Popular Reviews This Week</div>
            <button onClick={()=>onGoAuth("signup")}
              style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",
                border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>MORE</button>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {SAMPLE_REVIEWS.map((r,i)=>{
              const game=GAME_MAP[r.gameId];
              if (!game) return null;
              return (
                <div key={i} className="review-card" onClick={()=>onGoAuth("signup")}
                  style={{ display:"flex",gap:12,padding:"12px 14px",borderRadius:10,
                    background:"#0D0F17",border:"1px solid #12141C",
                    cursor:"pointer",transition:"border-color 0.15s" }}>
                  <div style={{ width:44,height:58,borderRadius:6,flexShrink:0,
                    background:gameBg(game.title) }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap" }}>
                      <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,
                        background:`hsl(${strToHue(r.user)},60%,45%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:10,fontWeight:800,color:"#fff" }}>
                        {r.user[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize:12,fontWeight:700,color:"#EAEBF2" }}>{r.user}</span>
                      <span style={{ fontSize:11,color:"#3A4060" }}>reviewed</span>
                      <span style={{ fontSize:12,fontWeight:700,color:"#9CA3AF",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:120 }}>{game.title}</span>
                    </div>
                    <div style={{ display:"flex",gap:1,marginBottom:5 }}>
                      {"★".repeat(r.rating).split("").map((_,j)=>(
                        <span key={j} style={{ fontSize:12,color:"#F0A500" }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize:12,color:"#7B8099",lineHeight:1.6,
                      display:"-webkit-box",WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical",overflow:"hidden" }}>{r.text}</div>
                    <div style={{ fontSize:11,color:"#3A4060",marginTop:5 }}>♥ {r.likes}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar — shown below on mobile */}
        <div style={{ display:"flex",flexDirection:"column",gap:28 }}>
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",
                color:"#555D7A",textTransform:"uppercase" }}>Popular Lists</div>
              <button onClick={()=>onGoAuth("signup")}
                style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",
                  border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>MORE</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {SAMPLE_LISTS.map((l,i)=>(
                <div key={i} onClick={()=>onGoAuth("signup")} style={{ display:"flex",gap:10,cursor:"pointer" }}>
                  <div style={{ display:"flex",gap:3,flexShrink:0 }}>
                    {l.covers.slice(0,3).map(id=>{
                      const g=GAME_MAP[id];
                      return g?(<div key={id} style={{ width:28,height:38,borderRadius:4,
                        background:gameBg(g.title) }}/>):null;
                    })}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#EAEBF2",lineHeight:1.3,marginBottom:2 }}>{l.title}</div>
                    <div style={{ fontSize:11,color:"#3A4060" }}>{l.count} games · by {l.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",
                color:"#555D7A",textTransform:"uppercase" }}>Popular Members</div>
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
              {SAMPLE_MEMBERS.map((m,i)=>(
                <div key={i} onClick={()=>onGoAuth("signup")}
                  style={{ display:"flex",flexDirection:"column",alignItems:"center",
                    gap:4,cursor:"pointer",width:54 }}>
                  <div style={{ width:38,height:38,borderRadius:"50%",
                    background:`linear-gradient(135deg,hsl(${m.hue},60%,45%),hsl(${m.hue+40},70%,30%))`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,fontWeight:900,color:"#fff" }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <div style={{ fontSize:9,color:"#7B8099",textAlign:"center",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",width:"100%" }}>
                    {m.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── STORIES ── */}
      <div style={{ borderTop:"1px solid #12141C",
        padding:mobile?"28px 16px 40px":"36px 32px 48px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:20 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",
            color:"#555D7A",textTransform:"uppercase" }}>Recent Stories</div>
          <button onClick={()=>onGoAuth("signup")}
            style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",
              border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>ALL STORIES</button>
        </div>
        <div style={{ display:"grid",
          gridTemplateColumns:mobile?"1fr":tablet?"repeat(2,1fr)":"repeat(3,1fr)",
          gap:16,maxWidth:1200,margin:"0 auto" }}>
          {SAMPLE_STORIES.slice(0, mobile?3:6).map((s,i)=>{
            const g=GAME_MAP[s.coverId];
            return (
              <div key={i} className="story-card" onClick={()=>onGoAuth("signup")}
                style={{ background:"#0D0F17",borderRadius:10,overflow:"hidden",
                  border:"1px solid #12141C",cursor:"pointer" }}>
                <div style={{ height:100,background:g?gameBg(g.title):"#12141C",position:"relative" }}>
                  <div style={{ position:"absolute",inset:0,
                    background:"linear-gradient(to bottom,transparent 40%,#0D0F17 100%)" }}/>
                  <div style={{ position:"absolute",top:8,left:10 }}>
                    <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.1em",
                      color:"#F0A500",background:"#F0A50022",padding:"2px 7px",
                      borderRadius:4,border:"1px solid #F0A50033" }}>{s.tag}</span>
                  </div>
                </div>
                <div style={{ padding:"4px 14px 16px" }}>
                  <div className="story-title"
                    style={{ fontSize:13,fontWeight:800,color:"#EAEBF2",lineHeight:1.35,
                      marginBottom:6,transition:"color 0.15s" }}>{s.title}</div>
                  <div style={{ fontSize:12,color:"#555D7A",lineHeight:1.6,
                    display:"-webkit-box",WebkitLineClamp:2,
                    WebkitBoxOrient:"vertical",overflow:"hidden" }}>{s.excerpt}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop:"1px solid #12141C",padding:mobile?"16px":"20px 32px",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span>🎮</span>
          <span style={{ fontWeight:900,fontSize:13,color:"#3A4060",letterSpacing:"-0.02em" }}>BACKLOG</span>
        </div>
        {!mobile && (
          <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
            {["About","Pro","News","Help","Games","Lists","Members","Contact"].map(l=>(
              <button key={l} onClick={()=>onGoAuth("signup")}
                style={{ fontSize:11,color:"#2E3450",background:"none",border:"none",cursor:"pointer" }}>
                {l}
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize:11,color:"#2E3450" }}>© 2024 Backlog</div>
      </div>
    </div>
  );
}

// ─── Auth page ─────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, error, placeholder }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.1em",
        color:"#3A4060",textTransform:"uppercase",marginBottom:7 }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%",padding:"12px 14px",background:"#0A0B0F",
          border:`1px solid ${error?"#EF444466":"#1A1E2E"}`,borderRadius:8,
          color:"#EAEBF2",fontSize:14,outline:"none",boxSizing:"border-box",
          WebkitAppearance:"none" }}/>
      {error && <div style={{ fontSize:11,color:"#EF4444",marginTop:5 }}>{error}</div>}
    </div>
  );
}

function AuthPage({ initialMode="signin", onAuth, onBack }) {
  const [mode, setMode]         = useState(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [errors, setErrors]     = useState({});
  const [shake, setShake]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState("");

  const triggerShake = () => { setShake(true); setTimeout(()=>setShake(false),400); };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const validate = () => {
    const e = {};
    if (mode==="signup") {
      if (!username.trim()) e.username="Username is required";
      else if (username.length<3) e.username="At least 3 characters";
      else if (/\s/.test(username)) e.username="No spaces allowed";
    }
    if (!email.trim()) e.email="Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email="Invalid email address";
    if (!password) e.password="Password is required";
    else if (mode==="signup"&&password.length<6) e.password="At least 6 characters";
    if (mode==="signup"&&password!==confirm) e.confirm="Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); triggerShake(); return; }
    setErrors({}); setBusy(true);
    try {
      if (mode==="signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { setErrors({ email: error.message }); triggerShake(); return; }
        const { error: profErr } = await supabase.from("profiles").insert({
          id: data.user.id, username, bio: "", favorites: []
        });
        if (profErr) {
          setErrors({ username: profErr.message.includes("unique") ? "Username already taken" : profErr.message });
          triggerShake(); await supabase.auth.signOut(); return;
        }
        if (data.session) { onAuth(data.session, { name: username, bio: "", username }); }
        else { setPendingEmail(email); setResendCooldown(60); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("email not confirmed")||msg.includes("not confirmed")) {
            setPendingEmail(email); setResendCooldown(0);
          } else { setErrors({ password:"Incorrect email or password" }); triggerShake(); }
          return;
        }
        const { data: prof } = await supabase.from("profiles").select("*").eq("id",data.user.id).single();
        onAuth(data.session, { name: prof?.username ?? email.split("@")[0], bio: prof?.bio ?? "", username: prof?.username ?? email.split("@")[0] });
      }
    } finally { setBusy(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type:"signup", email:pendingEmail });
    setBusy(false);
    if (error) setResendMsg("Could not resend. Try again later.");
    else { setResendMsg("Email sent! Check your inbox."); setResendCooldown(60); }
  };

  const wrap = {
    minHeight: "100vh",
    background: "#0A0B0F",
    display: "flex",
    flexDirection: "column",
    padding: "40px 16px 60px",
    fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif",
  };

  // ── Verify screen ──────────────────────────────────────────────
  if (pendingEmail) return (
    <div style={wrap}>
      <div style={{ width:"100%",maxWidth:400,margin:"0 auto",background:"#12141C",
        border:"1px solid #1A1E2E",borderRadius:16,padding:"36px 24px",textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:14 }}>📬</div>
        <div style={{ fontSize:20,fontWeight:800,color:"#EAEBF2",marginBottom:10 }}>Check your email</div>
        <div style={{ fontSize:13,color:"#7B8099",lineHeight:1.65,marginBottom:24 }}>
          We sent a confirmation link to<br/>
          <strong style={{ color:"#EAEBF2" }}>{pendingEmail}</strong><br/>
          Click it to activate your account, then come back and sign in.
        </div>
        {resendMsg && <div style={{ fontSize:12,color:"#4ADE80",marginBottom:14 }}>{resendMsg}</div>}
        <button onClick={handleResend} disabled={busy||resendCooldown>0}
          style={{ width:"100%",padding:"12px",borderRadius:8,marginBottom:14,
            background:resendCooldown>0?"#1A1E2E":"#12141C",
            border:"1px solid #2E3450",
            color:resendCooldown>0?"#3A4060":"#9CA3AF",
            fontSize:13,fontWeight:600,cursor:resendCooldown>0?"default":"pointer" }}>
          {busy?"Sending…":resendCooldown>0?`Resend in ${resendCooldown}s`:"Resend confirmation email"}
        </button>
        <button onClick={()=>{ setPendingEmail(null); setMode("signin"); setResendMsg(""); }}
          style={{ background:"none",border:"none",cursor:"pointer",color:"#F0A500",fontWeight:700,fontSize:13 }}>
          Back to sign in
        </button>
      </div>
    </div>
  );

  // ── Auth form ──────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>

      {/* Back link */}
      <div style={{ width:"100%",maxWidth:400,margin:"0 auto",marginBottom:24 }}>
        <button onClick={onBack}
          style={{ background:"none",border:"none",cursor:"pointer",
            color:"#555D7A",fontSize:13,fontWeight:600,
            display:"flex",alignItems:"center",gap:6,padding:0 }}>
          <span>←</span> Back to home
        </button>
      </div>

      {/* Logo */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:28,
        width:"100%",maxWidth:400,margin:"0 auto 28px" }}>
        <span style={{ fontSize:24 }}>🎮</span>
        <span style={{ fontWeight:900,fontSize:20,color:"#EAEBF2",letterSpacing:"-0.03em" }}>BACKLOG</span>
      </div>

      {/* Card */}
      <div style={{ width:"100%",maxWidth:400,margin:"0 auto",background:"#12141C",
        border:"1px solid #1A1E2E",borderRadius:16,padding:"28px 24px",
        animation:shake?"shake 0.4s ease":"none" }}>
        <div style={{ fontSize:20,fontWeight:800,color:"#EAEBF2",marginBottom:4 }}>
          {mode==="signin"?"Welcome back":"Create your account"}
        </div>
        <div style={{ fontSize:13,color:"#3A4060",marginBottom:24 }}>
          {mode==="signin"?"Sign in to your Backlog account":"Start tracking your games for free"}
        </div>

        <div onKeyDown={e=>e.key==="Enter"&&!busy&&handleSubmit()}>
          {mode==="signup"&&(
            <Field label="Username" value={username} onChange={setUsername}
              error={errors.username} placeholder="e.g. lepotatoguy"/>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail}
            error={errors.email} placeholder="you@example.com"/>
          <Field label="Password" type="password" value={password} onChange={setPassword}
            error={errors.password} placeholder="••••••••"/>
          {mode==="signup"&&(
            <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm}
              error={errors.confirm} placeholder="••••••••"/>
          )}
        </div>

        <button onClick={handleSubmit} disabled={busy}
          style={{ width:"100%",padding:"14px",borderRadius:9,
            background:busy?"#7A5200":"#F0A500",
            color:busy?"#EAEBF255":"#000",border:"none",fontWeight:800,fontSize:15,
            cursor:busy?"not-allowed":"pointer",marginTop:4,marginBottom:20,
            WebkitTapHighlightColor:"transparent" }}>
          {busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}
        </button>

        <div style={{ textAlign:"center",fontSize:13,color:"#3A4060" }}>
          {mode==="signin"?"New to Backlog? ":"Already have an account? "}
          <button onClick={()=>{ setMode(mode==="signin"?"signup":"signin"); setErrors({}); }}
            style={{ background:"none",border:"none",cursor:"pointer",
              color:"#F0A500",fontWeight:700,fontSize:13,padding:0,
              WebkitTapHighlightColor:"transparent" }}>
            {mode==="signin"?"Create an account":"Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Public profile (shareable read-only view) ─────────────────────
function ReviewLikeButton({ targetUserId, gameId, currentUserId }) {
  const [liked, setLiked]   = useState(false);
  const [count, setCount]   = useState(0);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [{ count: c }, { data: myLike }] = await Promise.all([
          supabase.from("review_likes").select("*", { count:"exact",head:true })
            .eq("target_user_id", targetUserId).eq("game_id", gameId),
          currentUserId ? supabase.from("review_likes").select("*")
            .eq("user_id", currentUserId).eq("target_user_id", targetUserId)
            .eq("game_id", gameId).maybeSingle() : Promise.resolve({ data:null }),
        ]);
        setCount(c||0);
        setLiked(!!myLike?.data);
        setReady(true);
      } catch { setReady(true); }
    }
    load();
  }, [targetUserId, gameId, currentUserId]);

  const toggle = async e => {
    e.stopPropagation();
    if (!currentUserId) return;
    if (liked) {
      await supabase.from("review_likes").delete()
        .match({ user_id:currentUserId, target_user_id:targetUserId, game_id:gameId });
      setCount(c=>Math.max(0,c-1)); setLiked(false);
    } else {
      await supabase.from("review_likes").insert({ user_id:currentUserId, target_user_id:targetUserId, game_id:gameId });
      setCount(c=>c+1); setLiked(true);
    }
  };

  if (!ready) return null;
  return (
    <button onClick={toggle}
      style={{ background:"none",border:"none",cursor:currentUserId?"pointer":"default",
        color:liked?"#EF4444":"#3A4060",fontSize:11,fontWeight:600,padding:0,
        display:"flex",alignItems:"center",gap:3 }}>
      {liked?"♥":"♡"} {count>0?count:""}
    </button>
  );
}

function PublicProfile({ username }) {
  const [prof, setProf]         = useState(null);
  const [games, setGames]       = useState([]);
  const [status, setStatus]     = useState("loading");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("games");
  const w = useWindowWidth();
  const mobile = w < 640;

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => setCurrentUser(session?.user||null));
    return () => setMeta({ title:DEFAULT_TITLE, description:DEFAULT_DESC, url:"https://lepotatoguy.github.io/backlog/" });
  }, []);

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", decodeURIComponent(username));
      const p = rows?.[0];
      if (!p) { setStatus("notfound"); return; }
      if (!p.is_public) { setStatus("private"); return; }
      setProf(p);
      const { data: gameRows } = await supabase
        .from("user_games").select("*").eq("user_id", p.id);
      const parsedGames = (gameRows||[]).map(r => ({
        game: { id:r.game_id, title:r.game_title||`Game #${r.game_id}`,
          cover:r.game_cover||null, year:r.game_year||null, genre:r.game_genre||null },
        status: r.status, rating: r.rating||0,
        review: r.review||"", date: r.logged_at,
        spoiler: r.spoiler||false,
        platform: r.platform||null, completion_type: r.completion_type||null,
      }));
      if (gameRows) setGames(parsedGames);
      const playedCount = parsedGames.filter(g=>g.status==="Played").length;
      const ratingVals  = parsedGames.filter(g=>g.rating>0).map(g=>g.rating);
      const avg = ratingVals.length
        ? (ratingVals.reduce((a,b)=>a+b,0)/ratingVals.length).toFixed(1) : null;
      setMeta({
        title: `${p.username} on Backlog`,
        description: [
          `${playedCount} game${playedCount!==1?'s':''} played`,
          `${parsedGames.filter(g=>g.review).length} reviews`,
          avg ? `avg rating ${avg}` : null,
        ].filter(Boolean).join(' · '),
        url: window.location.href,
      });
      setStatus("ok");
    }
    load();
  }, [username]);

  const shell = (icon, title, sub) => (
    <div style={{ minHeight:"100vh",background:"#0A0B0F",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:10,
      fontFamily:"'Inter',system-ui,sans-serif",color:"#555D7A" }}>
      <span style={{ fontSize:48 }}>{icon}</span>
      <div style={{ fontSize:18,fontWeight:700,color:"#EAEBF2" }}>{title}</div>
      <div style={{ fontSize:13 }}>{sub}</div>
      <a href="/backlog/" style={{ marginTop:8,padding:"8px 20px",borderRadius:8,
        background:"#F0A500",color:"#000",fontWeight:700,fontSize:13,textDecoration:"none" }}>
        Go to Backlog
      </a>
    </div>
  );

  if (status==="loading") return shell("🎮","Loading…","");
  if (status==="notfound") return shell("🕹️","Profile not found","No user with that username exists");
  if (status==="private") return shell("🔒","Private profile","This user hasn't made their profile public");

  const played    = games.filter(g=>g.status==="Played");
  const wantTo    = games.filter(g=>g.status==="Want to Play");
  const withRating= games.filter(g=>g.rating>0);
  const avgRating = withRating.length
    ? (withRating.reduce((s,g)=>s+g.rating,0)/withRating.length).toFixed(1) : null;
  const reviews   = games.filter(g=>g.review);
  const favorites = prof.favorites||[];
  const recent    = [...games].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,40);
  const pubTabs   = [["games","Games"],["reviews","Reviews"],["backlog","Backlog"]];

  return (
    <div style={{ minHeight:"100vh",background:"#0A0B0F",
      fontFamily:"'Inter',system-ui,sans-serif",color:"#EAEBF2" }}>

      <nav style={{ borderBottom:"1px solid #1A1E2E",padding:"0 20px",height:54,
        display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,
        background:"#0A0B0F",zIndex:100 }}>
        <a href="/backlog/" style={{ display:"flex",alignItems:"center",gap:8,
          textDecoration:"none",color:"inherit" }}>
          <span style={{ fontSize:20 }}>🎮</span>
          <span style={{ fontWeight:900,fontSize:15,letterSpacing:"-0.03em" }}>BACKLOG</span>
        </a>
        <div style={{ flex:1 }}/>
        {currentUser ? (
          <FollowButton targetUserId={prof.id} currentUserId={currentUser.id}/>
        ) : (
          <a href="/backlog/" style={{ fontSize:12,color:"#555D7A",textDecoration:"none",
            fontWeight:600,padding:"6px 14px",borderRadius:7,border:"1px solid #1A1E2E" }}>
            Sign in
          </a>
        )}
      </nav>

      <div style={{ background:"#0D0F17",borderBottom:"1px solid #1A1E2E",
        padding:mobile?"20px 16px 0":"28px 20px 0" }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:20 }}>
            <div style={{ width:mobile?56:72,height:mobile?56:72,borderRadius:"50%",flexShrink:0,
              background:"linear-gradient(135deg,#F0A500,#7C3AED)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:mobile?20:28,fontWeight:900,color:"#fff" }}>
              {prof.username[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:mobile?18:22,fontWeight:800,color:"#EAEBF2",marginBottom:4 }}>
                {prof.username}
              </div>
              {prof.bio && <div style={{ fontSize:13,color:"#7B8099" }}>{prof.bio}</div>}
            </div>
          </div>
          <div style={{ display:"flex",gap:mobile?16:28,flexWrap:"wrap",marginBottom:16 }}>
            {[
              { label:"PLAYED",      value:played.length },
              { label:"BACKLOG",     value:wantTo.length },
              { label:"REVIEWS",     value:reviews.length },
              { label:"AVG RATING",  value:avgRating?`★ ${avgRating}`:"—" },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:mobile?18:22,fontWeight:900,color:"#EAEBF2",lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:8,fontWeight:700,letterSpacing:"0.08em",color:"#3A4060",marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none",marginLeft:-4 }}>
            {pubTabs.map(([id,label])=>(
              <button key={id} onClick={()=>setActiveTab(id)}
                style={{ padding:"10px 14px",background:"none",border:"none",cursor:"pointer",
                  fontSize:13,fontWeight:activeTab===id?700:500,whiteSpace:"nowrap",
                  color:activeTab===id?"#EAEBF2":"#555D7A",
                  borderBottom:activeTab===id?"2px solid #EAEBF2":"2px solid transparent",
                  marginBottom:-1 }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:760,margin:"0 auto",padding:mobile?"20px 16px 60px":"28px 20px 60px" }}>

        {favorites.length>0 && activeTab==="games" && (
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
              textTransform:"uppercase",marginBottom:14 }}>Favorite Games</div>
            <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
              {favorites.map(id=>{
                const entry = games.find(x=>x.game.id===id);
                const game  = entry?.game;
                if (!game) return null;
                return (
                  <div key={id} style={{ width:72,height:97,borderRadius:6,flexShrink:0,
                    overflow:"hidden",
                    background:game.cover?`url(${game.cover}) center/cover no-repeat`:gameBg(game.title) }}/>
                );
              })}
            </div>
          </div>
        )}

        {activeTab==="games" && (
          <div>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
              textTransform:"uppercase",marginBottom:14 }}>Games ({games.length})</div>
            {games.length===0 ? (
              <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No games logged yet</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {recent.map(({ game, rating, status:s, date, platform, completion_type })=>(
                  <div key={game.id}
                    style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 12px",
                      background:"#12141C",borderRadius:10,border:"1px solid #1A1E2E" }}>
                    <div style={{ width:44,height:60,borderRadius:6,flexShrink:0,overflow:"hidden",
                      background:game.cover?`url(${game.cover}) center/cover no-repeat`:gameBg(game.title) }}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:13,color:"#EAEBF2",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                      <div style={{ display:"flex",gap:6,marginTop:3,flexWrap:"wrap" }}>
                        {date && <span style={{ fontSize:10,color:"#555D7A" }}>
                          {new Date(date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
                        {platform && <span style={{ fontSize:10,color:"#555D7A" }}>· {platform}</span>}
                        {completion_type && <span style={{ fontSize:10,color:"#A78BFA" }}>{completion_type}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0 }}>
                      <Badge status={s}/>
                      {rating>0 && <Stars value={rating} readonly size={11}/>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab==="reviews" && (
          <div>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
              textTransform:"uppercase",marginBottom:14 }}>Reviews ({reviews.length})</div>
            {reviews.length===0 ? (
              <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No reviews yet</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {reviews.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(({ game, rating, review, date, spoiler })=>(
                  <div key={game.id} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",
                    borderRadius:10,padding:14,display:"flex",gap:12 }}>
                    <div style={{ width:40,height:54,borderRadius:4,flexShrink:0,overflow:"hidden",
                      background:game.cover?`url(${game.cover}) center/cover no-repeat`:gameBg(game.title) }}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13,marginBottom:4 }}>{game.title}</div>
                      {rating>0 && <div style={{ marginBottom:6 }}><Stars value={rating} readonly size={11}/></div>}
                      {spoiler ? <SpoilerText text={review}/> : <div style={{ fontSize:12,color:"#7B8099",lineHeight:1.6 }}>{review}</div>}
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6 }}>
                        {date && <div style={{ fontSize:10,color:"#2E3450" }}>
                          {new Date(date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>}
                        <ReviewLikeButton targetUserId={prof.id} gameId={game.id} currentUserId={currentUser?.id||null}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab==="backlog" && (
          <div>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
              textTransform:"uppercase",marginBottom:14 }}>Backlog ({wantTo.length})</div>
            {wantTo.length===0 ? (
              <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic" }}>No backlog games</div>
            ) : (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10 }}>
                {wantTo.map(({ game })=>(
                  <div key={game.id} style={{ borderRadius:8,overflow:"hidden",border:"1px solid #1A1E2E" }}>
                    <div style={{ aspectRatio:"3/4",background:game.cover?`url(${game.cover}) center/cover no-repeat`:gameBg(game.title) }}/>
                    <div style={{ padding:"6px 8px",fontSize:10,fontWeight:700,color:"#EAEBF2",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id:"discover", icon:"🔍", label:"Discover" },
    { id:"mygames",  icon:"🎮", label:"My Games" },
    { id:"diary",    icon:"📔", label:"Diary"    },
    { id:"profile",  icon:"👤", label:"Profile"  },
  ];
  return (
    <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:100,
      background:"var(--bg-primary)",borderTop:"1px solid var(--border)",
      display:"flex",height:"calc(60px + env(safe-area-inset-bottom))",
      paddingBottom:"env(safe-area-inset-bottom)",
      backdropFilter:"blur(12px)" }}>
      {items.map(({ id, icon, label }) => {
        const active = tab===id;
        return (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:3,
              background:"none",border:"none",cursor:"pointer",
              color:active?"var(--accent)":"var(--text-tertiary)",
              transition:"color 0.15s,transform 0.15s",
              padding:"6px 0",minHeight:44,WebkitTapHighlightColor:"transparent",
              transform:active?"translateY(-1px)":"none" }}>
            <div style={{ position:"relative" }}>
              <span style={{ fontSize:22,display:"block",
                filter:active?"drop-shadow(0 0 6px var(--accent)44)":"none",
                transition:"filter 0.2s,transform 0.15s",
                transform:active?"scale(1.15)":"scale(1)" }}>{icon}</span>
              {active && <div style={{ position:"absolute",bottom:-4,left:"50%",
                transform:"translateX(-50%)",width:4,height:4,borderRadius:2,
                background:"var(--accent)" }}/>}
            </div>
            <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.06em" }}>{label.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const publicUsername = useMemo(() => {
    const hash = window.location.hash;
    return hash.startsWith('#/u/') ? hash.slice(4) : null;
  }, []);

  const [view, setView]         = useState("loading");
  const [authMode, setAuthMode] = useState("signup");
  const [session, setSession]   = useState(null);
  const [tab, setTab]           = useState("discover");
  const [game, setGame]         = useState(null);
  const [q, setQ]               = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [userGames, setUserGames] = useState({});
  const swipeRef = useRef(null);
  const [favorites, setFavorites] = useState([]);
  const [profile,   setProfileState] = useState({ name:"Player One", bio:"", isPublic:false, username:"" });
  const { theme, toggleTheme } = useTheme();
  const w = useWindowWidth();
  const mobile = w < 640;

  const rowsToMap = (rows) =>
    (rows||[]).reduce((acc,r)=>({
      ...acc,
      [r.game_id]:{
        status:          r.status,
        rating:          r.rating||0,
        review:          r.review||"",
        date:            r.logged_at,
        title:           r.game_title,
        cover:           r.game_cover,
        year:            r.game_year,
        genre:           r.game_genre,
        developer:       r.game_developer,
        platform:        r.platform||null,
        time_played:     r.time_played||null,
        completion_type: r.completion_type||null,
        tags:            r.tags||[],
        spoiler:         r.spoiler||false,
      }
    }),{});

  const loadUserData = async (userId) => {
    const [{ data:games }, { data:prof }] = await Promise.all([
      supabase.from("user_games").select("*").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("id", userId).single(),
    ]);
    if (games) setUserGames(rowsToMap(games));
    if (prof) {
      setProfileState({ name: prof.username, bio: prof.bio||"", isPublic: prof.is_public||false, username: prof.username });
      setFavorites(prof.favorites||[]);
    } else {
      // Profile row missing — create it from auth metadata
      const { data: { user } } = await supabase.auth.getUser();
      const fallbackUsername = user?.email?.split("@")[0] || `user_${userId.slice(0,8)}`;
      await supabase.from("profiles").upsert({
        id: userId, username: fallbackUsername, bio: "", favorites: [], is_public: false
      }, { onConflict: "id" });
      setProfileState({ name: fallbackUsername, bio: "", isPublic: false, username: fallbackUsername });
    }
  };

  useEffect(() => {
    if (publicUsername) return;
    supabase.auth.getSession().then(({ data:{ session:s } }) => {
      if (s) { setSession(s); loadUserData(s.user.id).then(() => setView("app")); }
      else setView("landing");
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event==="SIGNED_OUT") {
        setSession(null); setView("landing");
        setUserGames({}); setFavorites([]);
        setProfileState({ name:"Player One", bio:"", isPublic:false, username:"" });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSave = useCallback(async (id, data) => {
    if (!session) return;
    setUserGames(prev => ({ ...prev, [id]:{ ...prev[id], ...data } }));
    const baseRow = {
      user_id:        session.user.id,
      game_id:        id,
      status:         data.status    ?? null,
      rating:         data.rating    ?? 0,
      review:         data.review    ?? "",
      logged_at:      data.date      ?? new Date().toISOString(),
      game_title:     data.title     ?? null,
      game_cover:     data.cover     ?? null,
      game_year:      data.year      ?? null,
      game_genre:     data.genre     ?? null,
      game_developer: data.developer ?? null,
    };
    const extRow = {
      ...baseRow,
      platform:        data.platform        ?? null,
      time_played:     data.time_played     ?? null,
      completion_type: data.completion_type ?? null,
      tags:            data.tags            ?? [],
      spoiler:         data.spoiler         ?? false,
    };
    const { error } = await supabase.from("user_games")
      .upsert(extRow, { onConflict:"user_id,game_id" });
    if (error?.message?.includes("column")) {
      await supabase.from("user_games")
        .upsert(baseRow, { onConflict:"user_id,game_id" });
    }
  }, [session]);

  const handleDelete = useCallback(async (id) => {
    setUserGames(prev => { const next = { ...prev }; delete next[id]; return next; });
    setFavorites(prev => prev.filter(f => f !== id));
    if (!session) return;
    await supabase.from("user_games").delete().match({ user_id: session.user.id, game_id: id });
  }, [session]);

  const handleQuickAdd = useCallback(async (game, status = "Want to Play") => {
    if (!session) {
      setAuthMode("signup");
      setView("auth");
      return;
    }
    const data = {
      status,
      rating: 0,
      review: "",
      date: new Date().toISOString(),
      title: game.title,
      cover: game.cover,
      year: game.year,
      genre: game.genre,
      developer: game.developer,
    };
    await handleSave(game.id, data);
  }, [session, handleSave]);

  const handleSetFavorites = useCallback(async (favs) => {
    setFavorites(favs);
    if (!session) return;
    await supabase.from("profiles").update({ favorites: favs }).eq("id", session.user.id);
  }, [session]);

  const handleSetProfile = useCallback(async (prof) => {
    setProfileState(prev => ({ ...prev, ...prof }));
    if (!session) return;
    await supabase.from("profiles").update({
      bio: prof.bio,
      is_public: prof.isPublic||false,
    }).eq("id", session.user.id);
  }, [session]);

  const handleAuth = (s, prof) => {
    setSession(s);
    if (prof) setProfileState(prof);
    if (s) loadUserData(s.user.id);
    setView("app"); setTab("discover");
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const goAuth = (mode) => { setAuthMode(mode); setView("auth"); };

  // Build game objects from stored metadata for My Games / Diary / Profile
  const loggedGames = useMemo(() =>
    Object.entries(userGames).map(([id, ug]) => ({
      id:        parseInt(id),
      title:     ug.title     || `Game #${id}`,
      cover:     ug.cover     || null,
      year:      ug.year      || null,
      genre:     ug.genre     || null,
      developer: ug.developer || null,
    })),
    [userGames]
  );

  if (publicUsername) return <PublicProfile username={publicUsername}/>;

  if (view==="loading") return (
    <div style={{ minHeight:"100vh",background:"#0A0B0F",display:"flex",
      alignItems:"center",justifyContent:"center",gap:12,
      fontFamily:"'Inter',system-ui,sans-serif",color:"#555D7A",fontSize:14 }}>
      <span style={{ fontSize:24 }}>🎮</span> Loading…
    </div>
  );

  if (view==="landing") return <LandingPage onGoAuth={goAuth}/>;
  if (view==="auth")    return <AuthPage initialMode={authMode} onAuth={handleAuth} onBack={()=>setView("landing")}/>;

  return (
    <div style={{ minHeight:"100vh",backgroundColor:"var(--bg-primary)",
      fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",color:"var(--text-primary)" }}>
      <style>{`
        textarea:focus,input:focus{border-color:var(--accent)55!important}
      `}</style>

      {/* Top nav */}
      <nav style={{ background:"var(--bg-primary)",borderBottom:"1px solid var(--border)",
        display:"flex",alignItems:"center",padding:"0 16px",
        position:"sticky",top:0,zIndex:100,height:54,gap:8 }}>

        {/* Logo */}
        <div onClick={()=>setTab("discover")} style={{ display:"flex",alignItems:"center",
          gap:8,cursor:"pointer",userSelect:"none",marginRight:mobile?0:20 }}>
          <span style={{ fontSize:20 }}>🎮</span>
          {!mobile && <span style={{ fontWeight:900,fontSize:15,color:"var(--text-primary)",letterSpacing:"-0.03em" }}>BACKLOG</span>}
        </div>

        {/* Desktop tab links */}
        {!mobile && (
          <div style={{ display:"flex",gap:2,flex:1 }}>
            {[["discover","Discover"],["mygames","My Games"],["diary","Diary"],["profile","Profile"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ padding:"6px 12px",
                background:"none",border:"none",cursor:"pointer",fontSize:13,
                fontWeight:tab===id?700:400,color:tab===id?"var(--accent)":"var(--text-tertiary)",
                borderBottom:tab===id?"2px solid var(--accent)":"2px solid transparent",
                marginBottom:-1,transition:"color 0.12s" }}>{label}</button>
            ))}
          </div>
        )}

        {/* Search — full width on mobile when open */}
        {mobile ? (
          <>
            <div style={{ flex:1 }}/>
            {showSearch && (
              <input value={q} onChange={e=>{ setQ(e.target.value); if(e.target.value) setTab("discover"); }}
                autoFocus onBlur={()=>{ if(!q) setShowSearch(false); }}
                placeholder="Search games..."
                style={{ flex:1,padding:"6px 11px",background:"var(--bg-tertiary)",
                  border:"1px solid var(--border)",borderRadius:7,color:"var(--text-primary)",
                  fontSize:13,outline:"none" }}/>
            )}
            <button onClick={()=>setShowSearch(s=>!s)}
              style={{ background:"none",border:"none",cursor:"pointer",
                fontSize:20,color:"var(--text-tertiary)",padding:"10px 8px",
                display:"flex",alignItems:"center",justifyContent:"center",
                WebkitTapHighlightColor:"transparent",minWidth:44,minHeight:44 }}>🔍</button>
          </>
        ) : (
          <div style={{ position:"relative",marginRight:12 }}>
            <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)",fontSize:13 }}>🔍</span>
            <input value={q} onChange={e=>{ setQ(e.target.value); if(e.target.value) setTab("discover"); }} placeholder="Search..."
              style={{ padding:"6px 11px 6px 30px",background:"var(--bg-tertiary)",
                border:"1px solid var(--border)",borderRadius:7,color:"var(--text-primary)",fontSize:12,outline:"none",width:180 }}/>
          </div>
        )}

        {/* User chip */}
        <div onClick={()=>setTab("profile")}
          style={{ display:"flex",alignItems:"center",gap:mobile?0:8,cursor:"pointer",
            padding:mobile?"4px":"4px 10px",borderRadius:8,
            border:mobile?"none":"1px solid var(--border)",
            background:mobile?"none":"var(--bg-secondary)",
            marginRight:mobile?0:8,flexShrink:0 }}>
          <div style={{ width:28,height:28,borderRadius:"50%",
            background:"linear-gradient(135deg,#F0A500,#7C3AED)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:12,fontWeight:800,color:"#fff",flexShrink:0 }}>
            {profile.name[0].toUpperCase()}
          </div>
          {!mobile && <span style={{ fontSize:12,fontWeight:600,color:"var(--text-primary)" }}>{profile.name}</span>}
        </div>

        <NotificationBell session={session}/>

        {!mobile && (
          <button onClick={handleLogout}
            style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",
              border:"1px solid #1A1E2E",borderRadius:7,padding:"5px 10px",
              cursor:"pointer",letterSpacing:"0.05em",flexShrink:0 }}>SIGN OUT</button>
        )}

        {/* Mobile: sign out */}
        {mobile && (
          <button onClick={handleLogout}
            style={{ background:"none",border:"1px solid #1A1E2E",cursor:"pointer",
              color:"#555D7A",fontSize:11,fontWeight:700,flexShrink:0,
              padding:"6px 10px",borderRadius:6,letterSpacing:"0.04em",
              WebkitTapHighlightColor:"transparent",minHeight:34 }}>OUT</button>
        )}

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          title={theme==="dark"?"Switch to light mode":"Switch to dark mode"}
          style={{ flexShrink:0,cursor:"pointer",border:"none",padding:0,
            background:"none",WebkitTapHighlightColor:"transparent",
            display:"flex",alignItems:"center" }}>
          <div style={{ width:44,height:24,borderRadius:12,position:"relative",
            background:theme==="dark"?"#22263A":"#E5E7EB",
            border:`1px solid ${theme==="dark"?"#2E3450":"#D1D5DB"}`,
            transition:"background 0.2s,border-color 0.2s",flexShrink:0 }}>
            <div style={{ position:"absolute",top:3,
              left:theme==="dark"?3:20,
              width:16,height:16,borderRadius:8,
              background:theme==="dark"?"#6B7280":"#FBBF24",
              transition:"left 0.2s,background 0.2s",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,lineHeight:1 }}>
              {theme==="dark"?"☾":"☀"}
            </div>
          </div>
        </button>
      </nav>

      {/* Page content: swipeable on mobile */}
      <div
        style={{ paddingBottom:mobile?76:0 }}
        onTouchStart={e => { if (game) return; swipeRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (game || swipeRef.current === null) return;
          const dx = e.changedTouches[0].clientX - swipeRef.current;
          swipeRef.current = null;
          if (Math.abs(dx) < 50) return;
          const tabs = ["discover","mygames","diary","profile"];
          const idx = tabs.indexOf(tab);
          if (dx < 0 && idx < tabs.length-1) setTab(tabs[idx+1]);
          if (dx > 0 && idx > 0) setTab(tabs[idx-1]);
        }}>
        {tab==="discover"&&<Discover userGames={userGames} onOpen={setGame} q={q} onQuickAdd={handleQuickAdd}/>}
        {tab==="mygames" &&<MyGames  games={loggedGames} userGames={userGames} onOpen={setGame}/>}
        {tab==="diary"   &&<Diary    games={loggedGames} userGames={userGames} onOpen={setGame}/>}
        {tab==="profile" &&<Profile  games={loggedGames} userGames={userGames} onOpen={setGame}
          favorites={favorites} setFavorites={handleSetFavorites}
          profile={profile}    setProfile={handleSetProfile}
          session={session}/>}
      </div>

      {/* Mobile bottom nav */}
      {mobile && <BottomNav tab={tab} setTab={setTab}/>}

      <ToastContainer/>
      {game&&<Modal game={game} ug={userGames[game.id]} onClose={()=>setGame(null)} onSave={handleSave} onDelete={handleDelete}/>}
    </div>
  );
}
