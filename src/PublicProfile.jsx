import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { useWindowWidth, gameBg, gameAccent, setMeta, DEFAULT_TITLE, DEFAULT_DESC, Badge, Stars, MiniCover, SpoilerText } from "./shared.jsx";

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

export default function PublicProfile({ username }) {
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
