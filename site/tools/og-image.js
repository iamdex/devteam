// Renders the social preview images (1200x630): site/og.png (IT) and site/en/og.png (EN).
// Usage from the repo root: node site/tools/og-image.js   (needs Playwright + Chromium)
// Update the version pill below when plugin.json's version changes.
const { chromium } = require('playwright');
const T = {
  it: {h:'Un team di sviluppo <span class="g">senior.</span><br>Fatto di agenti.', s:'13 agenti Claude Code che parlano tra loro.<br>Tu approvi il piano, il team lo esegue.', tag:'plugin per Claude Code'},
  en: {h:'A <span class="g">senior</span> dev team.<br>Made of agents.', s:'13 Claude Code agents that talk to each other.<br>You approve the plan, the team executes it.', tag:'Claude Code plugin'},
};
const nodes = [['product','#a78bfa'],['growth','#fb923c'],['architect','#a78bfa'],['backend','#60a5fa'],['data','#22d3ee'],['frontend','#4ade80'],['mobile','#4ade80'],['ios','#60a5fa'],['devops','#fb923c'],['store','#22d3ee'],['qa','#facc15'],['security','#f87171'],['claude','#f472b6']];
const html = t => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#07080d;color:#e9ecf5;font-family:'Space Grotesk';overflow:hidden;position:relative}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 90% 80% at 30% 20%,#000 20%,transparent 75%)}
.glow{position:absolute;border-radius:50%;filter:blur(110px);opacity:.35}
svg{position:absolute;inset:0}
.txt{position:absolute;left:72px;top:70px;width:640px}
.pill{display:inline-flex;gap:10px;align-items:center;font-family:'JetBrains Mono';font-size:18px;color:#9aa3b8;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:6px 16px 6px 8px}
.pill b{background:linear-gradient(120deg,#a78bfa,#60a5fa,#22d3ee);color:#0a0b12;border-radius:999px;padding:2px 10px;font-size:15px}
h1{font-size:70px;line-height:1.02;letter-spacing:-.045em;margin:30px 0 26px;font-weight:700}
.g{background:linear-gradient(120deg,#a78bfa,#60a5fa 45%,#22d3ee);-webkit-background-clip:text;color:transparent}
p{font-size:25px;line-height:1.4;color:#9aa3b8}
.logo{position:absolute;left:72px;bottom:56px;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;letter-spacing:-.02em}
.url{position:absolute;right:64px;bottom:62px;font-family:'JetBrains Mono';font-size:19px;color:#6b7389}
</style></head><body>
<div class="glow" style="width:620px;height:620px;background:#7c3aed;left:-260px;top:-300px"></div>
<div class="glow" style="width:620px;height:620px;background:#0891b2;right:-220px;bottom:-260px"></div>
<div class="grid"></div>
<svg width="1200" height="630" id="s"></svg>
<div class="txt"><span class="pill"><b>v0.3.0</b>${t.tag} · agent teams</span><h1>${t.h}</h1><p>${t.s}</p></div>
<div class="logo"><svg width="40" height="40" viewBox="0 0 64 64" style="position:static"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle cx="32" cy="32" r="7" fill="url(#lg)"/><circle cx="32" cy="32" r="21" fill="none" stroke="url(#lg)" stroke-width="3" stroke-dasharray="6 6"/><circle cx="53" cy="32" r="4" fill="#22d3ee"/><circle cx="14" cy="21" r="4" fill="#a78bfa"/><circle cx="22" cy="50" r="4" fill="#fb923c"/></svg>DevTeam</div>
<div class="url">iamdex.github.io/devteam</div>
<script>
const N=${JSON.stringify(nodes)},s=document.getElementById('s'),cx=965,cy=300,R=190,RY=205;let o='';
const P=N.map((n,i)=>{const a=i/N.length*Math.PI*2-Math.PI/2,r=i%2?1:.8;return [cx+Math.cos(a)*R*r,cy+Math.sin(a)*RY*r]});
o+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+R+'" ry="'+RY+'" fill="none" stroke="rgba(255,255,255,.07)"/><ellipse cx="'+cx+'" cy="'+cy+'" rx="'+R*.8+'" ry="'+RY*.8+'" fill="none" stroke="rgba(255,255,255,.07)"/>';
P.forEach((p,i)=>o+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="'+N[i][1]+'" stroke-opacity=".28"/>');
[[0,4],[2,3],[3,10],[11,5],[8,9]].forEach(([a,b])=>{const A=P[a],B=P[b];o+='<path d="M'+A[0]+' '+A[1]+' Q'+cx+' '+cy+' '+B[0]+' '+B[1]+'" fill="none" stroke="'+N[a][1]+'" stroke-opacity=".55" stroke-dasharray="4 6"/>'});
o+='<defs><filter id="b" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="6"/></filter><radialGradient id="lead"><stop offset="0" stop-color="#a78bfa" stop-opacity=".7"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient></defs>';
o+='<circle cx="'+cx+'" cy="'+cy+'" r="80" fill="url(#lead)"/><circle cx="'+cx+'" cy="'+cy+'" r="20" fill="#fff" filter="url(#b)"/><circle cx="'+cx+'" cy="'+cy+'" r="16" fill="#fff"/>';
o+='<text x="'+cx+'" y="'+(cy+46)+'" fill="#fff" font-family="JetBrains Mono" font-weight="700" font-size="15" text-anchor="middle">LEAD</text>';
P.forEach((p,i)=>{const c=N[i][1];o+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="20" fill="'+c+'" fill-opacity=".14"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="11" fill="'+c+'" filter="url(#b)"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="9" fill="'+c+'"/><text x="'+p[0]+'" y="'+(p[1]+34)+'" fill="rgba(233,236,245,.75)" font-family="JetBrains Mono" font-size="13.5" text-anchor="middle">'+N[i][0]+'</text>'});
s.innerHTML=o;
</script></body></html>`;
(async () => {
  const b = await chromium.launch();
  for (const l of ['it','en']) {
    const p = await b.newPage({viewport:{width:1200,height:630}, deviceScaleFactor:1});
    await p.setContent(html(T[l]), {waitUntil:'networkidle'});
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({path: require('path').join(__dirname, '..', l === 'it' ? 'og.png' : 'en/og.png')});
  }
  await b.close();
})();
