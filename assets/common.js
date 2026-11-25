/* shared helpers for every page */
var $=function(id){return document.getElementById(id)};
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function fmt(x,d){return Number(x).toFixed(d==null?1:d)}
var __redraw=[];
function onRedraw(f){__redraw.push(f)}
function redrawAll(){__redraw.forEach(function(f){try{f()}catch(e){}})}

function setupCanvas(c){
  var dpr=window.devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;
  var pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph}
  var ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx:ctx,w:w,h:h};
}
function drawChart(c,o){
  var s=setupCanvas(c),ctx=s.ctx,w=s.w,h=s.h;ctx.clearRect(0,0,w,h);
  var m={l:42,r:14,t:12,b:34},pw=w-m.l-m.r,ph=h-m.t-m.b;
  function X(x){return m.l+x/o.xmax*pw}
  function Y(y){return m.t+ph-(y-o.ymin)/(o.ymax-o.ymin)*ph}
  var line=cssv("--line"),muted=cssv("--muted");
  ctx.font='11px "IBM Plex Mono",ui-monospace,monospace';ctx.textBaseline="middle";
  ctx.lineWidth=1;ctx.strokeStyle=line;ctx.fillStyle=muted;
  o.yticks.forEach(function(v){
    ctx.beginPath();ctx.moveTo(m.l,Y(v)+.5);ctx.lineTo(m.l+pw,Y(v)+.5);ctx.stroke();
    ctx.textAlign="right";ctx.fillText(String(v),m.l-6,Y(v));
  });
  ctx.textAlign="center";
  for(var v=0;v<=o.xmax+1e-9;v+=o.xstep){ctx.fillText(String(v),X(v),m.t+ph+12)}
  ctx.fillText(o.xlabel,m.l+pw/2,h-6);
  if(o.band){
    ctx.fillStyle=cssv("--err-soft");ctx.globalAlpha=.7;
    ctx.fillRect(X(o.band[0]),m.t,X(o.band[1])-X(o.band[0]),ph);ctx.globalAlpha=1;
    ctx.fillStyle=muted;ctx.textAlign="center";ctx.fillText(o.band[2],(X(o.band[0])+X(o.band[1]))/2,m.t+9);
  }
  ctx.save();ctx.beginPath();ctx.rect(m.l,m.t,pw,ph);ctx.clip();
  (o.vlines||[]).forEach(function(v){ctx.beginPath();ctx.setLineDash(v.dash||[3,3]);ctx.lineWidth=1.2;ctx.strokeStyle=cssv(v.color);ctx.moveTo(X(v.x)+.5,m.t);ctx.lineTo(X(v.x)+.5,m.t+ph);ctx.stroke();ctx.setLineDash([])});
  var rev=o.reveal==null?1:o.reveal;
  o.series.forEach(function(se){
    ctx.beginPath();var started=false;
    se.data.forEach(function(p){
      if(p[0]>rev*o.xmax)return;
      var px=X(p[0]),py=Y(clamp(p[1],o.ymin-5,o.ymax+5));
      if(!started){ctx.moveTo(px,py);started=true}else ctx.lineTo(px,py);
    });
    if(se.fill&&started){
      var last=se.data.filter(function(p){return p[0]<=rev*o.xmax}).pop();
      ctx.lineTo(X(last[0]),Y(o.ymin));ctx.lineTo(X(0),Y(o.ymin));ctx.closePath();
      ctx.globalAlpha=.22;ctx.fillStyle=cssv(se.color);ctx.fill();ctx.globalAlpha=1;
      ctx.beginPath();started=false;
      se.data.forEach(function(p){if(p[0]>rev*o.xmax)return;var px=X(p[0]),py=Y(p[1]);if(!started){ctx.moveTo(px,py);started=true}else ctx.lineTo(px,py)});
    }
    ctx.setLineDash(se.dash||[]);ctx.lineWidth=se.width||2;ctx.strokeStyle=cssv(se.color);ctx.lineJoin="round";ctx.stroke();ctx.setLineDash([]);
  });
  ctx.restore();
}


(function(){
  var rt=null;
  window.addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(redrawAll,80)});
  try{window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",redrawAll)}catch(e){}
  try{new MutationObserver(redrawAll).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}
})();

/* progress, kept in this browser only */
var Prog=(function(){
  var K="cyb-guide-v1";
  function load(){try{return JSON.parse(localStorage.getItem(K))||{}}catch(e){return {}}}
  function save(o){try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}}
  return{
    get:load,
    visit:function(p){var o=load();o.v=o.v||{};if(!o.v[p]){o.v[p]=1;save(o)}},
    done:function(id){var o=load();o.d=o.d||{};if(o.d[id])return false;o.d[id]=1;save(o);return true},
    quiz:function(s,n){var o=load();o.q={s:s,n:n};save(o)},
    reset:function(){try{localStorage.removeItem(K)}catch(e){}}
  };
})();

/* tabs: buttons with data-tab, panels with data-panel, routed by #name */
function initTabs(){
  var btns=Array.prototype.slice.call(document.querySelectorAll("[data-tab]"));
  var panels=Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  if(!btns.length)return;
  var ids=btns.map(function(b){return b.dataset.tab});
  function show(id,write){
    if(ids.indexOf(id)<0)id=ids[0];
    btns.forEach(function(b){var on=b.dataset.tab===id;b.setAttribute("aria-selected",on?"true":"false");b.tabIndex=on?0:-1});
    panels.forEach(function(p){p.hidden=p.dataset.panel!==id});
    if(write){try{history.replaceState(null,"","#"+id)}catch(e){}}
    redrawAll();
  }
  btns.forEach(function(b){
    b.addEventListener("click",function(){show(b.dataset.tab,true)});
    b.addEventListener("keydown",function(e){
      var i=ids.indexOf(b.dataset.tab),n=null;
      if(e.key==="ArrowRight")n=ids[(i+1)%ids.length];
      if(e.key==="ArrowLeft")n=ids[(i-1+ids.length)%ids.length];
      if(n){e.preventDefault();show(n,true);btns[ids.indexOf(n)].focus()}
    });
  });
  window.addEventListener("hashchange",function(){show(location.hash.slice(1),false)});
  show(location.hash.slice(1),false);
}
Prog.visit(document.body.dataset.page);
