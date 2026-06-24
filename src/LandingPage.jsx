import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { getPopular } from "./rawg.js";
import { useWindowWidth, gameBg, strToHue, gameAccent, GAMES, GAME_MAP } from "./shared.jsx";

const SAMPLE_REVIEWS = [
  { user:"kingslayer",  gameId:1,  rating:5, text:"A masterpiece. Every dungeon tells a story worth uncovering. From Software's finest work and they've had some fine work.", likes:234 },
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
  { tag:"FEATURE",   title:"The 10 Best Games to Play Right Now",                          excerpt:"From brutal action RPGs to cozy sims — the essential playlist for any serious gamer this season.",         coverId:5  },
  { tag:"DEEP DIVE", title:"Why Outer Wilds Is the Most Important Game of the Decade",     excerpt:"A meditation on why Mobius Digital's quiet masterpiece changed the medium forever.",                        coverId:10 },
  { tag:"REVIEW",    title:"Elden Ring Two Years Later: Still the Greatest Open World Ever",excerpt:"From Software's magnum opus holds up — and then some. A look back at a landmark release.",                 coverId:1  },
  { tag:"GUIDE",     title:"Where to Start with FromSoftware in 2024",                     excerpt:"Overwhelmed by the catalog? We map the best entry points for newcomers and returning fans.",                coverId:11 },
  { tag:"LIST",      title:"Games That Defined Each Year of the Decade",                   excerpt:"From Hollow Knight to Baldur's Gate 3 — one game per year that said everything about its moment.",         coverId:4  },
  { tag:"INTERVIEW", title:"How Team Cherry Built Hollow Knight for $57,000",              excerpt:"The two-person studio that created one of the most beloved indie games ever talks craft, luck, and persistence.", coverId:4 },
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
        backgroundSize: "cover", backgroundPosition: "center", position:"relative",
        outline:hov?`2px solid ${accent}`:"2px solid transparent",
        transition:"outline 0.15s,transform 0.15s",
        transform:hov?"scale(1.04)":"scale(1)" }}>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#00000099 100%)" }}/>
        <div style={{ position:"absolute",bottom:5,left:5,right:5,fontSize:8,fontWeight:700,color:"#ffffffCC",lineHeight:1.3 }}>{game.title}</div>
      </div>
    </div>
  );
}

function HeroCoverTile({ game }) {
  const hasCover = game.cover && game.cover.length > 0 && game.cover !== 'null';
  return (
    <div style={{ backgroundImage: hasCover ? `url(${game.cover})` : gameBg(game.title),
      backgroundSize: "cover", backgroundPosition: "center",
      borderRadius:4, overflow:"hidden", width:"100%", height:"100%" }}/>
  );
}

function GameStrip({ title, games, onGoAuth }) {
  return (
    <div style={{ marginBottom:36 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"0 32px" }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",color:"#555D7A",textTransform:"uppercase" }}>{title}</div>
        <button onClick={()=>onGoAuth("signup")}
          style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>MORE</button>
      </div>
      <div style={{ display:"flex",gap:8,overflowX:"auto",padding:"4px 32px 8px",scrollbarWidth:"none" }}>
        {games.map(g=><PosterCard key={g.id} game={g} onGoAuth={onGoAuth}/>)}
      </div>
    </div>
  );
}

export default function LandingPage({ onGoAuth }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const tablet = w < 1024;
  const [liveGames, setLiveGames] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [p1, p2, p3] = await Promise.all([getPopular(1), getPopular(2), getPopular(3)]);
        const rawgGames = [...p1, ...p2, ...p3].slice(0, 60);
        if (rawgGames.length > 0) {
          if (!cancelled) setLiveGames(rawgGames);
          try {
            await supabase.from('games_cache').upsert(
              rawgGames.map(g=>({ id: g.id, title: g.title, cover_url: g.cover, year: g.year, genre: g.genre, updated_at: new Date().toISOString() })),
              { onConflict:'id' }
            );
          } catch {}
          return;
        }
      } catch {}
      try {
        const { data: cached } = await supabase.from('games_cache').select('*').limit(48);
        if (!cancelled && cached?.length > 0) {
          setLiveGames(cached.map(g=>({ id:g.id, title:g.title, cover:g.cover_url, year:g.year, genre:g.genre })));
          return;
        }
      } catch {}
      if (!cancelled) setLiveGames([]);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const staticFallback = GAMES.map(g=>({ id:g.id, title:g.title, cover:null, year:g.year, genre:g.genre }));
  const displayGames = liveGames?.length > 0 ? liveGames : staticFallback;
  const heroEndIndex  = mobile ? 12 : 24;
  const heroGames     = displayGames.slice(0, heroEndIndex);
  const popularGames  = displayGames.slice(heroEndIndex, heroEndIndex + 12);
  const topGames      = displayGames.slice(heroEndIndex + 12, heroEndIndex + 24);
  const remainingGames = displayGames.slice(heroEndIndex + 24);
  const newGames      = remainingGames.length > 0
    ? [...remainingGames].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 12)
    : [...displayGames].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 12);

  return (
    <div style={{ background:"#0A0B0F",fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",color:"#EAEBF2",minHeight:"100vh" }}>
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

      <nav style={{ display:"flex",alignItems:"center",padding:mobile?"0 16px":"0 32px",height:52,
        borderBottom:"1px solid #12141C",background:"#0A0B0F",position:"sticky",top:0,zIndex:50 }}>
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
          <button onClick={()=>onGoAuth("signin")} className="lnav-link" style={{ fontSize:mobile?12:13 }}>Sign in</button>
          <button onClick={()=>onGoAuth("signup")}
            style={{ padding:mobile?"6px 12px":"7px 16px",borderRadius:7,background:"#F0A500",
              border:"none",color:"#000",fontSize:mobile?12:13,fontWeight:800,cursor:"pointer" }}>
            {mobile?"Join":"Get Started"}
          </button>
        </div>
      </nav>

      <div style={{ position:"relative",height:mobile?400:500,overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,display:"grid",
          gridTemplateColumns:`repeat(${mobile?6:12},1fr)`,gridTemplateRows:"repeat(2,1fr)",gap:4,padding:4 }}>
          {heroGames.map((g,i)=><HeroCoverTile key={g.id||i} game={g}/>)}
        </div>
        <div style={{ position:"absolute",inset:0,
          background:mobile
            ?"linear-gradient(to bottom,#0A0B0FBB 0%,#0A0B0F 85%)"
            :"linear-gradient(to right,#0A0B0F 38%,#0A0B0FCC 58%,#0A0B0F55 75%,transparent 100%)" }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,#0A0B0F 0%,transparent 35%)" }}/>
        <div style={{ position:"relative",zIndex:1,padding:mobile?"40px 20px":"60px 40px",maxWidth:mobile?"100%":560,textAlign:mobile?"center":"left" }}>
          <h1 style={{ fontSize:mobile?28:42,fontWeight:900,lineHeight:1.1,color:"#EAEBF2",marginBottom:mobile?16:20,letterSpacing:"-0.03em" }}>
            Track games you've played.<br/>
            Save those you want to play.<br/>
            Tell your friends what's good.
          </h1>
          <button onClick={()=>onGoAuth("signup")}
            style={{ padding:mobile?"12px 24px":"13px 30px",borderRadius:9,background:"#F0A500",
              border:"none",color:"#000",fontSize:mobile?14:15,fontWeight:800,cursor:"pointer",
              marginBottom:mobile?12:20,display:"inline-block" }}>
            Get started — It's free!
          </button>
          <div style={{ fontSize:12,color:"#555D7A" }}>The social network for gamers.</div>
        </div>
      </div>

      <div style={{ background:"#0D0F17",borderTop:"1px solid #12141C",borderBottom:"1px solid #12141C",padding:mobile?"24px 20px":"32px 40px" }}>
        <div style={{ display:"grid",gridTemplateColumns:mobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:mobile?"20px 16px":24,maxWidth:1100,margin:"0 auto" }}>
          {[
            { icon:"🕹️", title:"Keep track of every game you've ever played", text:"(and some you've still to get to!)" },
            { icon:"❤️", title:"Show love for your favorite games",            text:"and create your own lists." },
            { icon:"✍️", title:"Write and share reviews",                      text:"and follow friends to see what they're playing." },
            { icon:"📔", title:"Keep a diary of all the games you play",       text:"and follow along in real time." },
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

      <div style={{ padding:"28px 0 0" }}>
        <GameStrip title="Popular on Backlog" games={popularGames} onGoAuth={onGoAuth}/>

        <div style={{ margin:mobile?"0 16px 28px":"0 32px 36px",borderRadius:12,
          background:"linear-gradient(135deg,#1A1025 0%,#0D1A2E 100%)",
          border:"1px solid #1A1E2E",padding:mobile?"18px 20px":"28px 32px",
          display:"flex",alignItems:"center",gap:mobile?14:24 }}>
          <div style={{ fontSize:mobile?36:48,lineHeight:1 }}>🏆</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9,fontWeight:700,letterSpacing:"0.14em",color:"#F0A500",textTransform:"uppercase",marginBottom:4 }}>Backlog Official</div>
            <div style={{ fontSize:mobile?15:20,fontWeight:900,color:"#EAEBF2",marginBottom:3 }}>Top 250 Games of All Time</div>
            {!mobile && <div style={{ fontSize:13,color:"#555D7A" }}>Compiled by the Backlog community.</div>}
          </div>
          <button onClick={()=>onGoAuth("signup")}
            style={{ padding:mobile?"8px 14px":"10px 22px",borderRadius:8,background:"#F0A500",
              border:"none",color:"#000",fontWeight:800,fontSize:mobile?12:13,cursor:"pointer",flexShrink:0 }}>View</button>
        </div>

        <GameStrip title="Top Games With the Most Fans" games={topGames} onGoAuth={onGoAuth}/>
        <GameStrip title="New &amp; Recent Releases" games={newGames} onGoAuth={onGoAuth}/>
      </div>

      <div style={{ borderTop:"1px solid #12141C",padding:mobile?"28px 16px 32px":tablet?"28px 24px 32px":"36px 32px 40px",
        display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"1fr":"1fr 320px",gap:mobile?32:40,maxWidth:1200,margin:"0 auto" }}>

        <div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",color:"#555D7A",textTransform:"uppercase" }}>Popular Reviews This Week</div>
            <button onClick={()=>onGoAuth("signup")} style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>MORE</button>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {SAMPLE_REVIEWS.map((r,i)=>{
              const game=GAME_MAP[r.gameId];
              if (!game) return null;
              return (
                <div key={i} className="review-card" onClick={()=>onGoAuth("signup")}
                  style={{ display:"flex",gap:12,padding:"12px 14px",borderRadius:10,
                    background:"#0D0F17",border:"1px solid #12141C",cursor:"pointer",transition:"border-color 0.15s" }}>
                  <div style={{ width:44,height:58,borderRadius:6,flexShrink:0,background:gameBg(game.title) }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap" }}>
                      <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,
                        background:`hsl(${strToHue(r.user)},60%,45%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff" }}>
                        {r.user[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize:12,fontWeight:700,color:"#EAEBF2" }}>{r.user}</span>
                      <span style={{ fontSize:11,color:"#3A4060" }}>reviewed</span>
                      <span style={{ fontSize:12,fontWeight:700,color:"#9CA3AF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:120 }}>{game.title}</span>
                    </div>
                    <div style={{ display:"flex",gap:1,marginBottom:5 }}>
                      {"★".repeat(r.rating).split("").map((_,j)=>(
                        <span key={j} style={{ fontSize:12,color:"#F0A500" }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize:12,color:"#7B8099",lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{r.text}</div>
                    <div style={{ fontSize:11,color:"#3A4060",marginTop:5 }}>♥ {r.likes}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:28 }}>
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",color:"#555D7A",textTransform:"uppercase" }}>Popular Lists</div>
              <button onClick={()=>onGoAuth("signup")} style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>MORE</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {SAMPLE_LISTS.map((l,i)=>(
                <div key={i} onClick={()=>onGoAuth("signup")} style={{ display:"flex",gap:10,cursor:"pointer" }}>
                  <div style={{ display:"flex",gap:3,flexShrink:0 }}>
                    {l.covers.slice(0,3).map(id=>{
                      const g=GAME_MAP[id];
                      return g?(<div key={id} style={{ width:28,height:38,borderRadius:4,background:gameBg(g.title) }}/>):null;
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
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",color:"#555D7A",textTransform:"uppercase",marginBottom:14 }}>Popular Members</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
              {SAMPLE_MEMBERS.map((m,i)=>(
                <div key={i} onClick={()=>onGoAuth("signup")}
                  style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",width:54 }}>
                  <div style={{ width:38,height:38,borderRadius:"50%",
                    background:`linear-gradient(135deg,hsl(${m.hue},60%,45%),hsl(${m.hue+40},70%,30%))`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff" }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <div style={{ fontSize:9,color:"#7B8099",textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",width:"100%" }}>{m.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop:"1px solid #12141C",padding:mobile?"28px 16px 40px":"36px 32px 48px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:20 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.13em",color:"#555D7A",textTransform:"uppercase" }}>Recent Stories</div>
          <button onClick={()=>onGoAuth("signup")} style={{ fontSize:11,fontWeight:700,color:"#3A4060",background:"none",border:"none",cursor:"pointer",letterSpacing:"0.06em" }}>ALL STORIES</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"repeat(2,1fr)":"repeat(3,1fr)",gap:16,maxWidth:1200,margin:"0 auto" }}>
          {SAMPLE_STORIES.slice(0, mobile?3:6).map((s,i)=>{
            const g=GAME_MAP[s.coverId];
            return (
              <div key={i} className="story-card" onClick={()=>onGoAuth("signup")}
                style={{ background:"#0D0F17",borderRadius:10,overflow:"hidden",border:"1px solid #12141C",cursor:"pointer" }}>
                <div style={{ height:100,background:g?gameBg(g.title):"#12141C",position:"relative" }}>
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,#0D0F17 100%)" }}/>
                  <div style={{ position:"absolute",top:8,left:10 }}>
                    <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:"#F0A500",background:"#F0A50022",padding:"2px 7px",borderRadius:4,border:"1px solid #F0A50033" }}>{s.tag}</span>
                  </div>
                </div>
                <div style={{ padding:"4px 14px 16px" }}>
                  <div className="story-title" style={{ fontSize:13,fontWeight:800,color:"#EAEBF2",lineHeight:1.35,marginBottom:6,transition:"color 0.15s" }}>{s.title}</div>
                  <div style={{ fontSize:12,color:"#555D7A",lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{s.excerpt}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop:"1px solid #12141C",padding:mobile?"16px":"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span>🎮</span>
          <span style={{ fontWeight:900,fontSize:13,color:"#3A4060",letterSpacing:"-0.02em" }}>BACKLOG</span>
        </div>
        {!mobile && (
          <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
            {["About","Pro","News","Help","Games","Lists","Members","Contact"].map(l=>(
              <button key={l} onClick={()=>onGoAuth("signup")} style={{ fontSize:11,color:"#2E3450",background:"none",border:"none",cursor:"pointer" }}>{l}</button>
            ))}
          </div>
        )}
        <div style={{ fontSize:11,color:"#2E3450" }}>© 2024 Backlog</div>
      </div>
    </div>
  );
}
