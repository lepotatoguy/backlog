import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

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

export default function AuthPage({ initialMode="signin", onAuth, onBack }) {
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

  return (
    <div style={wrap}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>

      <div style={{ width:"100%",maxWidth:400,margin:"0 auto",marginBottom:24 }}>
        <button onClick={onBack}
          style={{ background:"none",border:"none",cursor:"pointer",
            color:"#555D7A",fontSize:13,fontWeight:600,
            display:"flex",alignItems:"center",gap:6,padding:0 }}>
          <span>←</span> Back to home
        </button>
      </div>

      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:28,
        width:"100%",maxWidth:400,margin:"0 auto 28px" }}>
        <span style={{ fontSize:24 }}>🎮</span>
        <span style={{ fontWeight:900,fontSize:20,color:"#EAEBF2",letterSpacing:"-0.03em" }}>BACKLOG</span>
      </div>

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
