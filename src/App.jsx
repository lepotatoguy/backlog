import { supabase } from "./supabase.js"
import { getPopular, searchGames, getDetail, fmtGame } from "./rawg.js"
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

const STATUS_META = {
  "Playing":       { bg: "#0E2419", text: "#4ADE80", border: "#14532D" },
  "Played":        { bg: "#0D1F3C", text: "#60A5FA", border: "#1E3A5F" },
  "Want to Play":  { bg: "#1E0F3C", text: "#C084FC", border: "#3B1F6E" },
};
function Badge({ status }) {
  if (!status) return null;
  const m = STATUS_META[status];
  return <span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,
    background:m.bg,color:m.text,border:`1px solid ${m.border}`,
    letterSpacing:"0.06em",whiteSpace:"nowrap" }}>{status.toUpperCase()}</span>;
}

function Stars({ value=0, onChange, size=18, readonly }) {
  const [hov, setHov] = useState(0);
  const disp = hov || value;
  return (
    <div style={{ display:"flex",gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          onClick={() => !readonly && onChange && onChange(i===value?0:i)}
          onMouseEnter={() => !readonly && setHov(i)}
          onMouseLeave={() => !readonly && setHov(0)}
          style={{ fontSize:size,cursor:readonly?"default":"pointer",
            color:i<=disp?"#F0A500":"#232740",lineHeight:1,
            transition:"color 0.12s",userSelect:"none" }}>★</span>
      ))}
    </div>
  );
}

function MiniCover({ title, size=52 }) {
  return (
    <div style={{ width:size,height:size*1.35,borderRadius:6,flexShrink:0,
      background:gameBg(title),position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",inset:0,
        background:"linear-gradient(to bottom,transparent 40%,#00000077 100%)" }}/>
      <div style={{ position:"absolute",bottom:3,left:0,right:0,textAlign:"center",
        fontSize:7,color:"#ffffffBB",fontWeight:700,padding:"0 3px",lineHeight:1.2 }}>
        {title.length>14 ? title.slice(0,12)+"…" : title}
      </div>
    </div>
  );
}

function Card({ game, ug, onOpen }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const accent = gameAccent(game.title);
  const showImg = game.cover && !imgErr;

  return (
    <div onClick={() => onOpen(game)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderRadius:10,overflow:"hidden",cursor:"pointer",
        background:"#12141C",border:`1px solid ${hov?accent+"40":"#1A1E2E"}`,
        transition:"transform 0.18s,box-shadow 0.18s,border-color 0.18s",
        transform:hov?"translateY(-4px)":"none",
        boxShadow:hov?"0 12px 32px #00000066":"none" }}>
      <div style={{ aspectRatio:"3/4",position:"relative",overflow:"hidden",
        background:showImg?"#0A0B0F":gameBg(game.title) }}>
        {showImg && (
          <img src={game.cover} alt={game.title}
            onError={()=>setImgErr(true)}
            style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",
              transition:"transform 0.3s",transform:hov?"scale(1.05)":"scale(1)" }}/>
        )}
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(to bottom,transparent 55%,#00000099 100%)" }}/>
        {ug?.status && (
          <div style={{ position:"absolute",bottom:8,left:8,zIndex:1 }}>
            <Badge status={ug.status}/>
          </div>
        )}
      </div>
      <div style={{ padding:"9px 11px 12px" }}>
        <div style={{ fontWeight:700,fontSize:12,color:"#EAEBF2",lineHeight:1.3,
          marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
          {game.title}
        </div>
        <div style={{ fontSize:11,color:"#555D7A",marginBottom:6 }}>
          {[game.year,game.genre].filter(Boolean).join(" · ")}
        </div>
        {ug?.rating>0 ? <Stars value={ug.rating} readonly size={12}/> :
          <div style={{ fontSize:11,color:"#2E3450" }}>Not rated</div>}
      </div>
    </div>
  );
}

function Modal({ game, ug, onClose, onSave }) {
  const [status, setStatus] = useState(ug?.status??null);
  const [rating, setRating] = useState(ug?.rating??0);
  const [review, setReview] = useState(ug?.review??"");
  const [saved, setSaved] = useState(false);
  const [detail, setDetail] = useState(null);
  const [imgErr, setImgErr] = useState(false);
  const accent = gameAccent(game.title);
  const w = useWindowWidth();
  const mobile = w < 640;

  // Fetch full details (description, developer) from RAWG
  useEffect(() => {
    getDetail(game.id).then(setDetail).catch(()=>{});
  }, [game.id]);

  const g = detail || game; // use full detail when available
  const showImg = g.cover && !imgErr;

  useEffect(() => {
    const fn = e => e.key==="Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSave = () => {
    onSave(game.id, {
      status, rating, review, date: new Date().toISOString(),
      title: g.title, cover: g.cover, year: g.year,
      genre: g.genre, developer: g.developer,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const CoverPanel = () => (
    <div style={{ background: showImg ? "#0A0B0F" : gameBg(game.title), position:"relative",
      overflow:"hidden", flexShrink:0,
      width:mobile?56:160, height:mobile?75:undefined, minHeight:mobile?undefined:"100%" }}>
      {showImg && (
        <img src={g.cover} alt={g.title} onError={()=>setImgErr(true)}
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
      )}
      {!mobile && (
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(to right,transparent 60%,#12141C 100%)" }}/>
      )}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:200,
      background:"#000000C8",backdropFilter:"blur(6px)",
      display:"flex",alignItems:mobile?"flex-end":"center",
      justifyContent:"center",padding:mobile?0:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#12141C",
        border:"1px solid #1A1E2E",
        borderRadius:mobile?"16px 16px 0 0":16,
        width:"100%",maxWidth:mobile?"100%":720,
        maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column" }}>

        {/* Header */}
        {mobile ? (
          <div style={{ display:"flex",gap:14,padding:"20px 20px 16px",alignItems:"center",flexShrink:0 }}>
            <CoverPanel/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:17,fontWeight:800,color:"#EAEBF2",lineHeight:1.2,marginBottom:3 }}>{g.title}</div>
              <div style={{ fontSize:11,color:"#555D7A",marginBottom:10 }}>
                {[g.developer,g.year,g.genre].filter(Boolean).join(" · ")}
              </div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {["Want to Play","Playing","Played"].map(s=>(
                  <button key={s} onClick={()=>setStatus(status===s?null:s)} style={{
                    padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",
                    border:`1px solid ${status===s?accent:"#22263A"}`,
                    background:status===s?accent+"22":"#181B25",
                    color:status===s?accent:"#555D7A" }}>{s}</button>
                ))}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",
              color:"#555D7A",fontSize:24,padding:0,flexShrink:0,alignSelf:"flex-start" }}>×</button>
          </div>
        ) : (
          <div style={{ display:"flex",flexShrink:0,height:200 }}>
            <CoverPanel/>
            <div style={{ flex:1,padding:"24px 24px 20px 20px",minWidth:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:22,fontWeight:800,color:"#EAEBF2",lineHeight:1.2,marginBottom:4 }}>{g.title}</div>
                  <div style={{ fontSize:12,color:"#555D7A",marginBottom:12 }}>
                    {[g.developer,g.year,g.genre].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",
                  color:"#555D7A",fontSize:24,lineHeight:1,padding:0,flexShrink:0,alignSelf:"flex-start" }}>×</button>
              </div>
              {g.description && (
                <div style={{ fontSize:13,color:"#7B8099",lineHeight:1.65,marginBottom:16,
                  display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                  {g.description}
                </div>
              )}
              <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
                {["Want to Play","Playing","Played"].map(s=>(
                  <button key={s} onClick={()=>setStatus(status===s?null:s)} style={{
                    padding:"6px 13px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",
                    border:`1px solid ${status===s?accent:"#22263A"}`,
                    background:status===s?accent+"22":"#181B25",
                    color:status===s?accent:"#555D7A" }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ height:1,background:"#1A1E2E",flexShrink:0 }}/>
        <div style={{ overflowY:"auto",padding:mobile?"16px 20px 28px":"20px 24px 28px",flex:1 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
              color:"#3A4060",textTransform:"uppercase",marginBottom:9 }}>Your rating</div>
            <Stars value={rating} onChange={setRating} size={mobile?26:30}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",
              color:"#3A4060",textTransform:"uppercase",marginBottom:9 }}>Your review</div>
            <textarea value={review} onChange={e=>setReview(e.target.value)}
              placeholder="What did you think?"
              style={{ width:"100%",minHeight:80,background:"#0A0B0F",
                border:"1px solid #1A1E2E",borderRadius:8,padding:"10px 13px",
                color:"#C8CAD8",fontSize:13,lineHeight:1.6,resize:"vertical",
                outline:"none",fontFamily:"inherit",boxSizing:"border-box" }}/>
          </div>
          <button onClick={handleSave} style={{ width:mobile?"100%":"auto",
            padding:"11px 22px",borderRadius:8,
            background:saved?"#14532D":accent,color:saved?"#4ADE80":"#000",
            border:"none",fontWeight:800,fontSize:13,cursor:"pointer",
            transition:"all 0.18s",letterSpacing:"0.03em" }}>
            {saved?"Saved ✓":"Save to library"}
          </button>
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

function SkeletonCard() {
  return (
    <div style={{ borderRadius:10,overflow:"hidden",background:"#12141C",border:"1px solid #1A1E2E" }}>
      <div style={{ aspectRatio:"3/4",background:"linear-gradient(90deg,#1A1E2E 25%,#22263A 50%,#1A1E2E 75%)",
        backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite" }}/>
      <div style={{ padding:"9px 11px 12px" }}>
        <div style={{ height:11,background:"#1A1E2E",borderRadius:4,marginBottom:6 }}/>
        <div style={{ height:9,background:"#12141C",borderRadius:4,width:"55%" }}/>
      </div>
    </div>
  );
}

function Discover({ userGames, onOpen, q }) {
  const [games, setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre]   = useState("");
  const [page, setPage]     = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const w = useWindowWidth();
  const mobile = w < 640;

  // Debounce search query
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 450);
    return () => clearTimeout(t);
  }, [q]);

  // Reset when search or genre changes
  useEffect(() => {
    setGames([]);
    setPage(1);
    setHasMore(true);
  }, [debouncedQ, genre]);

  // Fetch games
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fn = debouncedQ
      ? searchGames(debouncedQ, page)
      : getPopular(page, genre);
    fn.then(results => {
      if (cancelled) return;
      setGames(prev => page===1 ? results : [...prev, ...results]);
      setHasMore(results.length===24);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQ, genre, page]);

  return (
    <div style={{ padding:mobile?"12px 12px 80px":"20px 20px 48px" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Genre chips */}
      <div style={{ display:"flex",gap:6,marginBottom:16,overflowX:"auto",
        scrollbarWidth:"none",paddingBottom:4,flexWrap:mobile?"nowrap":"wrap" }}>
        {GENRES.map(g=>(
          <button key={g.slug} onClick={()=>setGenre(g.slug)}
            style={{ padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600,
              cursor:"pointer",flexShrink:0,
              border:`1px solid ${genre===g.slug?"#F0A500":"#1A1E2E"}`,
              background:genre===g.slug?"#F0A50020":"#12141C",
              color:genre===g.slug?"#F0A500":"#555D7A",
              WebkitTapHighlightColor:"transparent" }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid",
        gridTemplateColumns:mobile?"repeat(auto-fill,minmax(110px,1fr))":"repeat(auto-fill,minmax(150px,1fr))",
        gap:mobile?10:14 }}>
        {games.map(game=>(
          <Card key={game.id} game={game} ug={userGames[game.id]} onOpen={onOpen}/>
        ))}
        {loading && Array.from({length:12}).map((_,i)=><SkeletonCard key={`sk${i}`}/>)}
      </div>

      {!loading && games.length===0 && (
        <div style={{ textAlign:"center",padding:"60px 0",color:"#2E3450" }}>
          <div style={{ fontSize:36,marginBottom:10 }}>🔎</div>
          <div style={{ fontSize:14 }}>No games found</div>
        </div>
      )}

      {!loading && hasMore && games.length>0 && (
        <div style={{ textAlign:"center",marginTop:28 }}>
          <button onClick={()=>setPage(p=>p+1)}
            style={{ padding:"10px 28px",borderRadius:8,background:"#12141C",
              border:"1px solid #1A1E2E",color:"#9CA3AF",fontSize:13,
              fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent" }}>
            Load more
          </button>
        </div>
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
      <div style={{ fontSize:15,color:"#7B8099",fontWeight:700,marginBottom:6 }}>Library empty</div>
      <div style={{ fontSize:13,color:"#3A4060" }}>Browse Discover and log your first game</div>
    </div>
  );

  return (
    <div style={{ padding:mobile?"16px 12px 80px":"22px 20px 48px" }}>
      <div style={{ display:"flex",gap:6,marginBottom:18,flexWrap:"wrap" }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 11px",
            borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
            border:`1px solid ${filter===f?"#F0A500":"#1A1E2E"}`,
            background:filter===f?"#F0A50020":"#12141C",
            color:filter===f?"#F0A500":"#555D7A",
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
      <div style={{ fontSize:15,color:"#7B8099",fontWeight:700,marginBottom:6 }}>Diary empty</div>
      <div style={{ fontSize:13,color:"#3A4060" }}>Every game you log appears here in order</div>
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
                color:"#3A4060",textTransform:"uppercase",
                padding:"18px 0 10px",borderBottom:"1px solid #1A1E2E",marginBottom:14 }}>
                {month}
              </div>
            )}
            <div onClick={()=>onOpen(game)}
              style={{ display:"flex",gap:14,alignItems:"center",padding:"10px 0",
                borderBottom:"1px solid #12141C",cursor:"pointer" }}>
              <div style={{ width:36,color:"#3A4060",fontSize:12,fontWeight:700,
                flexShrink:0,textAlign:"right",lineHeight:1.2 }}>
                <div>{d.getDate()}</div>
                <div style={{ fontSize:10 }}>{d.toLocaleDateString("en-US",{weekday:"short"})}</div>
              </div>
              <MiniCover title={game.title} size={38}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13,
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                <div style={{ fontSize:11,color:"#555D7A",marginTop:2 }}>{game.genre} · {game.year}</div>
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
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {recentActivity.map(({ game, rating, status })=>(
              <div key={game.id} onClick={()=>onOpen(game)}
                style={{ position:"relative",cursor:"pointer" }}>
                <MiniCover title={game.title} size={60}/>
                {rating>0 && (
                  <div style={{ position:"absolute",bottom:-4,left:0,right:0,textAlign:"center" }}>
                    <span style={{ fontSize:9,color:"#F0A500",background:"#0A0B0F",
                      padding:"0 3px",borderRadius:3 }}>{"★".repeat(rating)}</span>
                  </div>
                )}
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
            border:`1px solid ${filter===f?"#F0A500":"#1A1E2E"}`,
            background:filter===f?"#F0A50020":"#12141C",
            color:filter===f?"#F0A500":"#555D7A" }}>{f} ({counts[f]})</button>
        ))}
      </div>
      {list.length===0
        ? <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>Nothing here yet</div>
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
  if (entries.length===0) return <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>No diary entries yet</div>;
  let lastMonth=null;
  return (
    <div>
      {entries.map(({ game, rating, date, status })=>{
        const d=new Date(date), month=d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
        const showMonth=month!==lastMonth; lastMonth=month;
        return (
          <div key={game.id+date}>
            {showMonth && <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.1em",
              color:"#3A4060",textTransform:"uppercase",padding:"14px 0 8px",
              borderBottom:"1px solid #1A1E2E",marginBottom:10 }}>{month}</div>}
            <div onClick={()=>onOpen(game)} style={{ display:"flex",gap:12,alignItems:"center",
              padding:"8px 0",borderBottom:"1px solid #12141C",cursor:"pointer" }}>
              <div style={{ width:30,color:"#3A4060",fontSize:11,fontWeight:700,textAlign:"right",flexShrink:0 }}>
                <div>{d.getDate()}</div>
                <div style={{ fontSize:10 }}>{d.toLocaleDateString("en-US",{weekday:"short"})}</div>
              </div>
              <MiniCover title={game.title} size={34}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{game.title}</div>
                <div style={{ fontSize:11,color:"#555D7A" }}>{game.genre}</div>
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

function ProfileReviews({ games, userGames, onOpen }) {
  const list=useMemo(()=>
    games.filter(g=>userGames[g.id]?.review)
      .map(g=>({ game:g,...userGames[g.id] }))
      .sort((a,b)=>new Date(b.date)-new Date(a.date)),
    [games,userGames]);
  if (list.length===0) return <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>No reviews written yet</div>;
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      {list.map(({ game, rating, review, date, status })=>(
        <div key={game.id} onClick={()=>onOpen(game)}
          style={{ background:"#0D0F17",border:"1px solid #1A1E2E",borderRadius:10,
            padding:16,display:"flex",gap:12,cursor:"pointer" }}>
          <MiniCover title={game.title} size={44}/>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",gap:8,marginBottom:4 }}>
              <div style={{ fontWeight:700,color:"#EAEBF2",fontSize:13 }}>{game.title}</div>
              <Badge status={status}/>
            </div>
            {rating>0 && <div style={{ marginBottom:6 }}><Stars value={rating} readonly size={12}/></div>}
            <div style={{ fontSize:12,color:"#7B8099",lineHeight:1.6 }}>{review}</div>
            {date && <div style={{ fontSize:10,color:"#2E3450",marginTop:6 }}>
              {new Date(date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileWatchlist({ games, userGames, onOpen }) {
  const list=useMemo(()=>games.filter(g=>userGames[g.id]?.status==="Want to Play"),[games,userGames]);
  if (list.length===0) return <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>No games in your backlog</div>;
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12 }}>
      {list.map(game=><Card key={game.id} game={game} ug={userGames[game.id]} onOpen={onOpen}/>)}
    </div>
  );
}

function ProfileStats({ games, userGames }) {
  const stats=useMemo(()=>{
    const ents=Object.entries(userGames).map(([id,v])=>({ ...v, game:GAME_MAP[parseInt(id)] })).filter(e=>e.game);
    const played=ents.filter(e=>e.status==="Played");
    const ratings=ents.filter(e=>e.rating>0).map(e=>e.rating);
    const avg=ratings.length?(ratings.reduce((s,r)=>s+r,0)/ratings.length).toFixed(1):null;

    const genreCounts={};
    played.forEach(e=>{ genreCounts[e.game.genre]=(genreCounts[e.game.genre]||0)+1; });
    const topGenres=Object.entries(genreCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);

    const ratingDist=[1,2,3,4,5].map(r=>({ r, count:ratings.filter(x=>x===r).length }));
    const maxDist=Math.max(...ratingDist.map(x=>x.count),1);

    const yearCounts={};
    played.forEach(e=>{ yearCounts[e.game.year]=(yearCounts[e.game.year]||0)+1; });
    const topYears=Object.entries(yearCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

    return { played:played.length, avg, topGenres, ratingDist, maxDist, topYears };
  },[games,userGames]);

  if (stats.played===0) return <div style={{ fontSize:13,color:"#3A4060",fontStyle:"italic",padding:"20px 0" }}>Log some games to see stats</div>;

  return (
    <div>
      {/* Key numbers */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:32 }}>
        {[
          { label:"Games played", value:stats.played },
          { label:"Average rating", value:stats.avg?`★ ${stats.avg}`:"—" },
          { label:"Reviews written", value:Object.values(userGames).filter(g=>g.review).length },
        ].map(s=>(
          <div key={s.label} style={{ background:"#0D0F17",border:"1px solid #1A1E2E",
            borderRadius:10,padding:"14px 16px",textAlign:"center" }}>
            <div style={{ fontSize:24,fontWeight:900,color:"#F0A500",lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:10,color:"#3A4060",marginTop:4,fontWeight:700,
              letterSpacing:"0.07em",textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rating distribution */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
          textTransform:"uppercase",marginBottom:14 }}>Rating distribution</div>
        <div style={{ display:"flex",gap:8,alignItems:"flex-end",height:80 }}>
          {stats.ratingDist.map(({ r, count })=>(
            <div key={r} style={{ flex:1,display:"flex",flexDirection:"column",
              alignItems:"center",gap:4 }}>
              <div style={{ fontSize:11,color:"#555D7A" }}>{count}</div>
              <div style={{ width:"100%",borderRadius:4,background:"#F0A500",
                transition:"height 0.5s",
                height:`${(count/stats.maxDist)*56}px`,minHeight:count>0?4:0 }}/>
              <div style={{ fontSize:10,color:"#3A4060" }}>{"★".repeat(r)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top genres */}
      {stats.topGenres.length>0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3A4060",
            textTransform:"uppercase",marginBottom:14 }}>Genres played</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {stats.topGenres.map(([genre,count],i)=>{
              const max=stats.topGenres[0][1];
              return (
                <div key={genre} style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:100,fontSize:12,color:"#7B8099",textAlign:"right",flexShrink:0 }}>{genre}</div>
                  <div style={{ flex:1,height:7,background:"#1A1E2E",borderRadius:4,overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:4,transition:"width 0.5s",
                      width:`${(count/max)*100}%`,
                      background:`hsl(${220+i*28},65%,58%)` }}/>
                  </div>
                  <div style={{ fontSize:11,color:"#3A4060",width:16,flexShrink:0 }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top years */}
      {stats.topYears.length>0 && (
        <div>
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
    </div>
  );
}

function Profile({ games, userGames, onOpen, favorites, setFavorites, profile, setProfile }) {
  const [subTab, setSubTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const w = useWindowWidth();
  const mobile = w < 640;

  const subTabs = [
    ["profile","Profile"],["activity","Activity"],
    ["games","Games"],["diary","Diary"],
    ["reviews","Reviews"],["backlog","Backlog"],
    ["stats","Stats"],
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
    setProfile({ name:draftName, bio:draftBio });
    setEditing(false);
  };

  return (
    <div>
      <div style={{ background:"#0D0F17",borderBottom:"1px solid #1A1E2E",padding:mobile?"20px 16px 0":"28px 20px 0" }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>

          {/* Avatar + name + stats */}
          <div style={{ display:"flex",flexDirection:mobile?"column":"row",
            alignItems:mobile?"flex-start":"flex-start",gap:16,marginBottom:20 }}>
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
                      style={{ background:"#181B25",border:"1px solid #22263A",borderRadius:6,
                        color:"#EAEBF2",fontSize:16,fontWeight:800,padding:"4px 10px",
                        outline:"none",width:"100%",marginBottom:8,boxSizing:"border-box" }}/>
                    <input value={draftBio} onChange={e=>setDraftBio(e.target.value)}
                      placeholder="Short bio..."
                      style={{ background:"#181B25",border:"1px solid #22263A",borderRadius:6,
                        color:"#EAEBF2",fontSize:13,padding:"4px 10px",
                        outline:"none",width:"100%",boxSizing:"border-box" }}/>
                    <div style={{ display:"flex",gap:8,marginTop:8 }}>
                      <button onClick={saveProfile} style={{ padding:"5px 14px",borderRadius:6,
                        background:"#F0A500",color:"#000",border:"none",
                        fontWeight:700,fontSize:12,cursor:"pointer" }}>Save</button>
                      <button onClick={()=>setEditing(false)} style={{ padding:"5px 14px",borderRadius:6,
                        background:"#181B25",color:"#7B8099",border:"1px solid #22263A",
                        fontSize:12,cursor:"pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:mobile?16:20,fontWeight:800,color:"#EAEBF2",marginBottom:2 }}>{profile.name}</div>
                    {profile.bio && <div style={{ fontSize:12,color:"#7B8099",marginBottom:6 }}>{profile.bio}</div>}
                    <button onClick={()=>setEditing(true)} style={{ fontSize:10,fontWeight:700,
                      padding:"3px 10px",borderRadius:5,background:"none",
                      border:"1px solid #2E3450",color:"#555D7A",cursor:"pointer",letterSpacing:"0.05em" }}>
                      EDIT PROFILE
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats — 2x2 on mobile, row on desktop */}
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
                  <div style={{ fontSize:mobile?18:22,fontWeight:900,color:"#EAEBF2",lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:8,fontWeight:700,letterSpacing:"0.08em",color:"#3A4060",marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-nav — horizontally scrollable */}
          <div style={{ display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none",marginLeft:-4 }}>
            {subTabs.map(([id,label])=>(
              <button key={id} onClick={()=>setSubTab(id)} style={{ padding:mobile?"8px 12px":"10px 14px",
                background:"none",border:"none",cursor:"pointer",fontSize:mobile?12:13,fontWeight:500,
                whiteSpace:"nowrap",
                color:subTab===id?"#EAEBF2":"#555D7A",
                borderBottom:subTab===id?"2px solid #EAEBF2":"2px solid transparent",
                marginBottom:-1 }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:mobile?"20px 16px 80px":"28px 20px 56px",maxWidth:760,margin:"0 auto" }}>
        {subTab==="profile"  && <ProfileOverview games={games} userGames={userGames} onOpen={onOpen} favorites={favorites} setFavorites={setFavorites}/>}
        {subTab==="activity" && <ProfileOverview games={games} userGames={userGames} onOpen={onOpen} favorites={favorites} setFavorites={setFavorites}/>}
        {subTab==="games"    && <ProfileGames games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="diary"    && <ProfileDiary games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="reviews"  && <ProfileReviews games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="backlog"  && <ProfileWatchlist games={games} userGames={userGames} onOpen={onOpen}/>}
        {subTab==="stats"    && <ProfileStats games={games} userGames={userGames}/>}
      </div>
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
  const [imgErr, setImgErr] = useState(false);
  const accent = gameAccent(game.title);
  const showImg = game.cover && !imgErr;
  return (
    <div onClick={()=>onGoAuth("signup")} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      title={game.title} style={{ width:88,flexShrink:0,cursor:"pointer" }}>
      <div style={{ width:88,height:118,borderRadius:6,overflow:"hidden",
        background:showImg?"#0A0B0F":gameBg(game.title),position:"relative",
        outline:hov?`2px solid ${accent}`:"2px solid transparent",
        transition:"outline 0.15s,transform 0.15s",
        transform:hov?"scale(1.04)":"scale(1)" }}>
        {showImg && (
          <img src={game.cover} alt={game.title} onError={()=>setImgErr(true)}
            style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
        )}
        <div style={{ position:"absolute",inset:0,
          background:"linear-gradient(to bottom,transparent 50%,#00000099 100%)" }}/>
        <div style={{ position:"absolute",bottom:5,left:5,right:5,
          fontSize:8,fontWeight:700,color:"#ffffffCC",lineHeight:1.3 }}>{game.title}</div>
      </div>
    </div>
  );
}

function HeroCoverTile({ game }) {
  const [imgErr, setImgErr] = useState(false);
  const showImg = game.cover && !imgErr;
  return (
    <div style={{ background:showImg?"#0A0B0F":gameBg(game.title),
      borderRadius:4,overflow:"hidden",width:"100%",height:"100%" }}>
      {showImg && (
        <img src={game.cover} alt={game.title} onError={()=>setImgErr(true)}
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
      )}
    </div>
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
      try {
        // 1. Always try RAWG first — real fresh covers
        const [p1, p2] = await Promise.all([getPopular(1), getPopular(2)]);
        const games = [...p1, ...p2].slice(0, 48);
        if (!cancelled) setLiveGames(games);

        // 2. Save to cache in background (used when RAWG rate-limits)
        supabase.from('games_cache').upsert(
          games.map(g=>({
            id: g.id, title: g.title, cover_url: g.cover,
            year: g.year, genre: g.genre,
            updated_at: new Date().toISOString()
          })),
          { onConflict:'id' }
        ).catch(()=>{});

      } catch {
        // RAWG failed (rate limit / network) — try Supabase cache
        try {
          const { data: cached } = await supabase
            .from('games_cache').select('*').limit(48);
          if (!cancelled) {
            setLiveGames(cached?.length > 0
              ? cached.map(g=>({ id:g.id, title:g.title, cover:g.cover_url, year:g.year, genre:g.genre }))
              : [] // triggers static gradient fallback
            );
          }
        } catch {
          if (!cancelled) setLiveGames([]); // static fallback
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Use live games if loaded, otherwise fall back to static GAMES
  const staticFallback = GAMES.map(g=>({ id:g.id, title:g.title, cover:null, year:g.year, genre:g.genre }));
  const displayGames = liveGames?.length > 0 ? liveGames : staticFallback;
  const heroGames    = displayGames.slice(0, mobile ? 12 : 24);
  const popularGames = displayGames.slice(0, 12);
  const topGames     = displayGames.slice(12, 24);
  const newGames     = [...displayGames].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 12);

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
          {!mobile && <span style={{ color:"#2E3450",fontSize:13 }}>·</span>}
          {!mobile && <button onClick={()=>onGoAuth("signup")} className="lnav-link">Create account</button>}
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
        if (data.session) { onAuth(data.session, { name: username, bio: "" }); }
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
        onAuth(data.session, { name: prof?.username ?? email.split("@")[0], bio: prof?.bio ?? "" });
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
      background:"#0A0B0F",borderTop:"1px solid #12141C",
      display:"flex",height:62,paddingBottom:"env(safe-area-inset-bottom)" }}>
      {items.map(({ id, icon, label }) => (
        <button key={id} onClick={() => setTab(id)}
          style={{ flex:1,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:3,
            background:"none",border:"none",cursor:"pointer",
            color:tab===id?"#F0A500":"#555D7A",transition:"color 0.12s" }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.04em" }}>{label.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView]         = useState("loading");
  const [authMode, setAuthMode] = useState("signup");
  const [session, setSession]   = useState(null);
  const [tab, setTab]           = useState("discover");
  const [game, setGame]         = useState(null);
  const [q, setQ]               = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [userGames, setUserGames] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [profile,   setProfileState] = useState({ name:"Player One", bio:"" });
  const w = useWindowWidth();
  const mobile = w < 640;

  const rowsToMap = (rows) =>
    (rows||[]).reduce((acc,r)=>({
      ...acc,
      [r.game_id]:{
        status:    r.status,
        rating:    r.rating||0,
        review:    r.review||"",
        date:      r.logged_at,
        title:     r.game_title,
        cover:     r.game_cover,
        year:      r.game_year,
        genre:     r.game_genre,
        developer: r.game_developer,
      }
    }),{});

  const loadUserData = async (userId) => {
    const [{ data:games }, { data:prof }] = await Promise.all([
      supabase.from("user_games").select("*").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("id", userId).single(),
    ]);
    if (games) setUserGames(rowsToMap(games));
    if (prof) {
      setProfileState({ name: prof.username, bio: prof.bio||"" });
      setFavorites(prof.favorites||[]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session:s } }) => {
      if (s) { setSession(s); loadUserData(s.user.id).then(() => setView("app")); }
      else setView("landing");
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event==="SIGNED_OUT") {
        setSession(null); setView("landing");
        setUserGames({}); setFavorites([]);
        setProfileState({ name:"Player One", bio:"" });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSave = useCallback(async (id, data) => {
    if (!session) return;
    setUserGames(prev => ({ ...prev, [id]:{ ...prev[id], ...data } }));
    await supabase.from("user_games").upsert({
      user_id:       session.user.id,
      game_id:       id,
      status:        data.status    ?? null,
      rating:        data.rating    ?? 0,
      review:        data.review    ?? "",
      logged_at:     data.date      ?? new Date().toISOString(),
      game_title:    data.title     ?? null,
      game_cover:    data.cover     ?? null,
      game_year:     data.year      ?? null,
      game_genre:    data.genre     ?? null,
      game_developer:data.developer ?? null,
    }, { onConflict:"user_id,game_id" });
  }, [session]);

  const handleSetFavorites = useCallback(async (favs) => {
    setFavorites(favs);
    if (!session) return;
    await supabase.from("profiles").update({ favorites: favs }).eq("id", session.user.id);
  }, [session]);

  const handleSetProfile = useCallback(async (prof) => {
    setProfileState(prof);
    if (!session) return;
    await supabase.from("profiles").update({ username: prof.name, bio: prof.bio }).eq("id", session.user.id);
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
    <div style={{ minHeight:"100vh",background:"#0A0B0F",
      fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",color:"#EAEBF2" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#0A0B0F}
        ::-webkit-scrollbar-thumb{background:#22263A;border-radius:3px}
        textarea:focus,input:focus{border-color:#F0A50055!important}
        select option{background:#181B25}
      `}</style>

      {/* Top nav */}
      <nav style={{ background:"#0A0B0F",borderBottom:"1px solid #12141C",
        display:"flex",alignItems:"center",padding:"0 16px",
        position:"sticky",top:0,zIndex:100,height:54,gap:8 }}>

        {/* Logo */}
        <div onClick={()=>setTab("discover")} style={{ display:"flex",alignItems:"center",
          gap:8,cursor:"pointer",userSelect:"none",marginRight:mobile?0:20 }}>
          <span style={{ fontSize:20 }}>🎮</span>
          {!mobile && <span style={{ fontWeight:900,fontSize:15,color:"#EAEBF2",letterSpacing:"-0.03em" }}>BACKLOG</span>}
        </div>

        {/* Desktop tab links */}
        {!mobile && (
          <div style={{ display:"flex",gap:2,flex:1 }}>
            {[["discover","Discover"],["mygames","My Games"],["diary","Diary"],["profile","Profile"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ padding:"6px 12px",
                background:"none",border:"none",cursor:"pointer",fontSize:13,
                fontWeight:tab===id?700:400,color:tab===id?"#F0A500":"#555D7A",
                borderBottom:tab===id?"2px solid #F0A500":"2px solid transparent",
                marginBottom:-1,transition:"color 0.12s" }}>{label}</button>
            ))}
          </div>
        )}

        {/* Search — full width on mobile when open */}
        {mobile ? (
          <>
            <div style={{ flex:1 }}/>
            {showSearch && (
              <input value={q} onChange={e=>setQ(e.target.value)}
                autoFocus onBlur={()=>{ if(!q) setShowSearch(false); }}
                placeholder="Search games..."
                style={{ flex:1,padding:"6px 11px",background:"#181B25",
                  border:"1px solid #22263A",borderRadius:7,color:"#EAEBF2",
                  fontSize:13,outline:"none" }}/>
            )}
            <button onClick={()=>setShowSearch(s=>!s)}
              style={{ background:"none",border:"none",cursor:"pointer",
                fontSize:18,color:"#555D7A",padding:"4px" }}>🔍</button>
          </>
        ) : (
          <div style={{ position:"relative",marginRight:12 }}>
            <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3A4060",fontSize:13 }}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..."
              style={{ padding:"6px 11px 6px 30px",background:"#181B25",
                border:"1px solid #22263A",borderRadius:7,color:"#EAEBF2",fontSize:12,outline:"none",width:180 }}/>
          </div>
        )}

        {/* User chip */}
        <div onClick={()=>setTab("profile")}
          style={{ display:"flex",alignItems:"center",gap:mobile?0:8,cursor:"pointer",
            padding:mobile?"4px":"4px 10px",borderRadius:8,
            border:mobile?"none":"1px solid #1A1E2E",
            background:mobile?"none":"#12141C",
            marginRight:mobile?0:8,flexShrink:0 }}>
          <div style={{ width:28,height:28,borderRadius:"50%",
            background:"linear-gradient(135deg,#F0A500,#7C3AED)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:12,fontWeight:800,color:"#fff",flexShrink:0 }}>
            {profile.name[0].toUpperCase()}
          </div>
          {!mobile && <span style={{ fontSize:12,fontWeight:600,color:"#EAEBF2" }}>{profile.name}</span>}
        </div>

        {!mobile && (
          <button onClick={handleLogout}
            style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",
              border:"1px solid #1A1E2E",borderRadius:7,padding:"5px 10px",
              cursor:"pointer",letterSpacing:"0.05em",flexShrink:0 }}>SIGN OUT</button>
        )}

        {/* Mobile: sign out as small text */}
        {mobile && (
          <button onClick={handleLogout}
            style={{ background:"none",border:"none",cursor:"pointer",
              color:"#3A4060",fontSize:11,fontWeight:600,flexShrink:0,padding:"4px" }}>Out</button>
        )}
      </nav>

      {/* Page content — extra bottom padding on mobile for bottom nav */}
      <div style={{ paddingBottom:mobile?70:0 }}>
        {tab==="discover"&&<Discover userGames={userGames} onOpen={setGame} q={q}/>}
        {tab==="mygames" &&<MyGames  games={loggedGames} userGames={userGames} onOpen={setGame}/>}
        {tab==="diary"   &&<Diary    games={loggedGames} userGames={userGames} onOpen={setGame}/>}
        {tab==="profile" &&<Profile  games={loggedGames} userGames={userGames} onOpen={setGame}
          favorites={favorites} setFavorites={handleSetFavorites}
          profile={profile}    setProfile={handleSetProfile}/>}
      </div>

      {/* Mobile bottom nav */}
      {mobile && <BottomNav tab={tab} setTab={setTab}/>}

      {game&&<Modal game={game} ug={userGames[game.id]} onClose={()=>setGame(null)} onSave={handleSave}/>}
    </div>
  );
}
