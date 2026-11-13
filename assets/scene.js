/* ===== Base camp on Acatenango: dusk sky, Fuego erupting, Joe shooting a long exposure =====
   Everything below the ground line is page colour, so the ridgeline sits on calm dark ground. */
(function(){
  const wrap=document.getElementById('skyWrap'),cv=document.getElementById('sky'),g=cv.getContext('2d');
  const sentinel=document.getElementById('sentinel'),rb=document.getElementById('rbar'),introP=document.querySelector('.intro p');
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rng=seed=>{let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}};
  const rnd=(a,b)=>a+Math.random()*(b-a), lerp=(a,b,u)=>a+(b-a)*u, ease=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
  let W,H,dpr,G,s,k,V,outline=[],gullies=[],camp,hill=[],far=[],stars=[],rbarH=0;

  function profileY(x){ if(x<=outline[0][0]||x>=outline[outline.length-1][0])return G+6;
    for(let i=1;i<outline.length;i++){const a=outline[i-1],b=outline[i];if(x<=b[0]){return lerp(a[1],b[1],(x-a[0])/((b[0]-a[0])||1))}}return G+6}

  function layout(){
    if(!rb.classList.contains('stuck'))rbarH=rb.offsetHeight;
    W=document.documentElement.clientWidth;H=Math.round(sentinel.getBoundingClientRect().top+scrollY+rbarH);
    wrap.style.height=H+'px';dpr=Math.min(devicePixelRatio||1,2);cv.width=W*dpr;cv.height=H*dpr;g.setTransform(dpr,0,0,dpr,0,0);
    G=H-rbarH-14;s=Math.min(1.25,Math.max(.72,W/1200));k=s*1.05;
    const mob=W<700,R=rng(11);
    /* keep a real cone: the volcano is never more than 1.3x as tall as its half-base, however tall the hero is */
    const px=W*(mob?.8:.78);let py=Math.max(H*(mob?.2:.19),70),hgt=G-py;
    const bw=Math.min(hgt*1.1,W*(mob?.55:.3));if(hgt>bw*1.3){hgt=bw*1.3;py=G-hgt}
    V={x:px,y:py,cw:(mob?17:26)*s,bw};
    /* rugged outline: concave cone, a shoulder on the left, jagged crater rim */
    outline=[];const N=44,L0=V.x-V.bw*1.15,R0=V.x+V.bw*1.2;let rw=0;
    for(let i=0;i<=N;i++){const u=i/N;const x=lerp(L0,V.x-V.cw,u);let h=hgt*Math.pow(u,1.5)+hgt*.11*Math.exp(-Math.pow((u-.6)/.09,2));
      rw=rw*.7+(R()-.5)*(10+14*(1-u))*s;if(R()<.12)rw+=(R()-.3)*14*s;h+=rw*(u<.97?1:.2);outline.push([x,G+6-h])}
    outline.push([V.x-V.cw*.55,V.y-4*s],[V.x-V.cw*.15,V.y+3*s],[V.x+V.cw*.2,V.y-1*s],[V.x+V.cw*.6,V.y+2*s]);
    rw=0;for(let i=0;i<=N;i++){const u=1-i/N;const x=lerp(V.x+V.cw,R0,i/N);let h=hgt*Math.pow(u,1.6)+hgt*.06*Math.exp(-Math.pow((u-.38)/.07,2));
      rw=rw*.7+(R()-.5)*(10+14*(1-u))*s;if(R()<.12)rw+=(R()-.3)*14*s;h+=rw*(u<.97?1:.2);outline.push([x,G+6-h])}
    outline[N][1]=V.y+5*s;outline[N+5][1]=V.y+9*s;
    /* gullies on the face, lava follows them */
    gullies=[];for(let j=0;j<6;j++){const side=j%2?1:-1;const xs=V.x+side*V.cw*rnd(.1,.8),xe=V.x+side*V.bw*(.25+R()*.6);const pts=[];
      for(let i=0;i<=28;i++){const v=i/28*(.55+R()*.0+(j%3)*.15);const x=lerp(xs,xe,v)+(Math.sin(v*(7+j*1.7)+j)*5+Math.sin(v*23+j*3)*2)*s*v;const y=Math.max(lerp(profileY(xs)+4*s,G,v*.8),profileY(x)+(5+v*26)*s);pts.push([x,Math.min(y,G+2)])}gullies.push(pts)}
    /* camp: its own ridge, raised; on phones it stays below the text */
    const hx=W*(mob?.27:.5),hw=(mob?40:72)*s;let cy=G-hgt*(mob?.3:.36);
    const pr=introP.getBoundingClientRect(),pB=pr.bottom+scrollY,pR=pr.right;
    if(pR>hx-hw-30)cy=Math.max(cy,pB+40*k+14);cy=Math.min(cy,G-30*s);
    camp={x:hx,w:hw,y:cy};
    /* foreground ridge outline */
    hill=[[0,G+6]];const climb0=Math.max(0,hx-hw-260*s);
    for(let x=0;x<climb0;x+=W/30)hill.push([x,G+4-Math.sin(x*.02)*3*s]);
    const steps=26;let hw2=0;for(let i=0;i<=steps;i++){const u=i/steps;const x=lerp(climb0,hx-hw,u);hw2=hw2*.6+(R()-.5)*16*s;hill.push([x,lerp(G+2,cy,Math.pow(u,1.3))+(i&&i<steps?hw2+Math.sin(u*14)*5*s:0)])}
    hill.push([hx-hw*.4,cy-2*s],[hx+hw*.9,cy+1*s]);
    let hw3=0;for(let i=1;i<=18;i++){const u=i/18;const x=lerp(hx+hw,hx+hw+230*s,u);hw3=hw3*.6+(R()-.5)*14*s;hill.push([x,lerp(cy,G+2,Math.pow(u,.8))+(i<18?hw3:0)])}
    hill.push([W,G+4]);
    far=[];for(let x=0;x<=W;x+=W/16)far.push([x,G-12*s-Math.sin(x*.011)*9*s-Math.sin(x*.027)*5*s]);
    stars=[];const n=Math.round(W/12);for(let i=0;i<n;i++)stars.push({x:Math.random()*W,y:Math.random()*G*.6,r:Math.random()<.15?1.3:.8,p:rnd(0,6.28),sp:rnd(.4,1.4)});
  }

  /* ---- eruption schedule: big first, then small, medium, small, then big again ---- */
  const C=25,FIRST=3,CYCLE=[[0,'big'],[9,'small'],[14,'medium'],[19,'small']];
  const KIND={big:{n:70,vy:[200,370],vx:150,glow:1.3,puffs:26,flows:3},medium:{n:34,vy:[150,280],vx:110,glow:.8,puffs:10,flows:1},small:{n:14,vy:[90,180],vx:70,glow:.45,puffs:4,flows:0}};
  let T=0,nextEv=0,bombs=[],smoke=[],flows=[],glow=0,smokeT=0,flash=-1;
  const evTime=i=>FIRST+Math.floor(i/4)*C+CYCLE[i%4][0], evKind=i=>CYCLE[i%4][1];
  function erupt(kind){const K=KIND[kind];
    for(let i=0;i<K.n;i++)bombs.push({x:V.x+rnd(-V.cw,V.cw)*.6,y:V.y+2,vx:rnd(-K.vx,K.vx)*s,vy:-rnd(K.vy[0],K.vy[1])*s,life:rnd(2.4,3.8),age:0,tr:[],d:rnd(4,70)*s,landed:false});
    for(let i=0;i<K.puffs;i++)smoke.push({x:V.x+rnd(-V.cw,V.cw),y:V.y-rnd(0,20)*s,r:rnd(8,18)*s,gr:rnd(9,17)*s,age:-i*.08,life:rnd(10,15),vx:rnd(-14,5)*s,vy:-rnd(25,70)*s});
    const pool=[...gullies].sort(()=>Math.random()-.5);for(let i=0;i<K.flows;i++)flows.push({pts:pool[i],age:0,len:rnd(.55,1)});
    if(kind==='big'){const P=rigPos();aim([P.tx+1*k,P.ty-19*k],2.1,'umb');aim([P.shoot+3.6*k,camp.y-27*k],2.6,'joe')}
    glow=Math.max(glow,K.glow)}
  function aim(tgt,tf,tag){const gv=290*s;bombs.push({x:V.x,y:V.y,vx:(tgt[0]-V.x)/tf,vy:(tgt[1]-V.y-.5*gv*tf*tf)/tf,life:tf+4,age:0,tr:[],d:0,landed:false,aim:tag,hit:tf,tgt,big:true})}
  function sparks(x,y,n){for(let i=0;i<n;i++)bombs.push({x,y,vx:rnd(-70,70)*s,vy:-rnd(30,110)*s,life:rnd(.4,.9),age:0,tr:[],d:0,landed:false,noland:true,tiny:true})}
  function step(dt){
    T+=dt;while(T>=evTime(nextEv)){erupt(evKind(nextEv));nextEv++}
    glow*=Math.exp(-dt/1.5);
    bombs.forEach(b=>{b.age+=dt;
      if(b.aim){if(b.age>=b.hit){b.x=b.tgt[0];b.y=b.tgt[1];
          if(b.aim==='umb'){b.aim=null;b.noland=true;b.tr=[];b.vx=rnd(60,100)*s;b.vy=-rnd(110,160)*s;b.life=b.age+1.6;sparks(b.x,b.y,7)}
          else{b.aim=null;b.life=0;sparks(b.x,b.y,10)}return}}
      if(!b.landed){b.tr.push([b.x,b.y]);if(b.tr.length>6)b.tr.shift();b.vy+=290*s*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(!b.noland&&!b.aim&&b.vy>0&&b.y>profileY(b.x)+b.d&&b.y<G){b.landed=true;b.tr=[];b.vx=Math.sign(b.x-V.x)*rnd(6,18)*s;b.vy=rnd(10,24)*s;b.life=b.age+rnd(1.6,3.2)}}
      else{b.x+=b.vx*dt;b.y=Math.max(b.y+b.vy*dt,profileY(b.x)+b.d)}});
    bombs=bombs.filter(b=>b.age<b.life&&b.y<G+4&&b.life>0);
    smokeT-=dt;if(smokeT<=0){smoke.push({x:V.x+rnd(-6,6),y:V.y-4,r:6*s,gr:7*s,age:0,life:rnd(8,11),vx:rnd(-9,-3)*s,vy:-rnd(10,16)*s});smokeT=.5}
    smoke.forEach(p=>{p.age+=dt;if(p.age<0)return;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy*=Math.pow(.92,dt*4);p.r+=p.gr*dt});smoke=smoke.filter(p=>p.age<p.life);
    flows.forEach(f=>f.age+=dt);flows=flows.filter(f=>f.age<22);
  }

  /* ---- Joe ---- */
  function rigPos(){const tx=camp.x+camp.w*.62,ty=camp.y-20*k;return{tx,ty,shoot:tx-9*k,idle:camp.x-camp.w*.12}}
  function cycle(){const n=T<FIRST?-1:Math.floor((T-FIRST)/C);return{n,Tl:FIRST+n*C,Tn:FIRST+(n+1)*C}}
  /* per big eruption: walk to camera, start exposure, umbrella over camera, bomb bounces off,
     second bomb knocks Joe over (flash fires), dizzy, gets up, walks back to the tent */
  function joeState(){
    const P=rigPos(),{n,Tl,Tn}=cycle(),q=(a,b)=>(T-a)/(b-a),r=T-Tl,FALL=Math.PI/2;
    if(n<0&&T>=Tn-2.6&&T<Tn-.6)return{x:lerp(P.idle,P.shoot,ease(q(Tn-2.6,Tn-.6))),walk:T*9,face:1};
    if(n<0&&T>=Tn-.6)return{x:P.shoot,reach:true,face:1};
    if(n>=0){
      if(r<.9)return{x:P.shoot,reach:true,face:1};
      if(r<1.3)return{x:P.shoot,umb:ease(q(Tl+.9,Tl+1.3)),face:1};
      if(r<2.6)return{x:P.shoot,umb:1,face:1};
      if(r<2.9)return{x:P.shoot,rot:-FALL*ease(q(Tl+2.6,Tl+2.9)),face:1,flail:true};
      if(r<9)return{x:P.shoot,rot:-FALL,face:1,dizzy:true};
      if(r<9.8)return{x:P.shoot,rot:-FALL*(1-ease(q(Tl+9,Tl+9.8))),face:1};
      if(r<10.3)return{x:P.shoot,face:-1,flail:true};
      if(r<18){const x=P.shoot-150*s*(r-10.3);if(x<-40)return{hidden:true};return{x,y:hillY(x),walk:T*17,face:-1,rot:-.22,run:true}}
      const tentX=camp.x-camp.w*.6,out=tentX+20*k;
      if(r<19)return{x:lerp(tentX,out,q(Tl+18,Tl+19)),crouch:lerp(.45,1,ease(q(Tl+18,Tl+19))),face:1};
      if(r<19.6)return{x:out,stretch:true,face:1};
      if(r<19.9)return{x:out,face:1};
      if(r<20.6)return{x:out,stretch:true,rot:.16*Math.sin(Math.PI*q(Tl+19.9,Tl+20.6)),face:1};
      if(r<22.9)return{x:lerp(out,P.shoot,q(Tl+20.6,Tl+22.9)),walk:T*13,jog:true,face:1};
      return{x:P.shoot,reach:true,face:1};
    }
    return{x:P.idle,face:1};
  }
  const ink='#0b0a0a',UMB='#D8B24C';
  function umbrellaGeom(){const P=rigPos();return{cx:P.tx+1*k,cy:P.ty-13*k,hand:[P.tx-3.5*k,P.ty+1*k]}}
  function drawUmbrella(open){const U=umbrellaGeom(),rx=11*k*open,ry=6*k*open;
    g.strokeStyle=ink;g.lineWidth=1.3*k;g.beginPath();g.moveTo(U.hand[0],U.hand[1]);g.lineTo(U.cx,U.cy-ry);g.stroke();
    g.fillStyle=UMB;g.beginPath();g.ellipse(U.cx,U.cy,Math.max(rx,1),Math.max(ry,1),0,Math.PI,2*Math.PI);
    for(let i=3;i>=0;i--){const x0=U.cx+rx-(i+1)*rx/2,x1=U.cx+rx-i*rx/2;g.quadraticCurveTo((x0+x1)/2,U.cy-ry*.25,x0,U.cy)}g.closePath();g.fill();
    g.fillStyle=ink;g.fillRect(U.cx-.5*k,U.cy-ry-2*k,1*k,2*k)}
  function drawFallenUmbrella(){const P=rigPos(),y=camp.y-1.2*k;g.strokeStyle=ink;g.lineWidth=1.3*k;g.beginPath();g.moveTo(P.tx-16*k,y);g.lineTo(P.tx-4*k,y-1*k);g.stroke();
    g.fillStyle=UMB;g.beginPath();g.moveTo(P.tx-14*k,y);g.lineTo(P.tx-6*k,y-3*k);g.lineTo(P.tx-6*k,y+.8*k);g.closePath();g.fill()}
  function hillY(x){for(let i=1;i<hill.length;i++){const a=hill[i-1],b=hill[i];if(x<=b[0])return lerp(a[1],b[1],(x-a[0])/((b[0]-a[0])||1))}return G}
  function drawJoe(st,rig){
    if(st.hidden)return;
    const f=st.face,rot=st.rot||0,baseY=st.y!=null?st.y:camp.y;g.save();g.translate(st.x,baseY-(st.run?0:2.6*k*Math.abs(Math.sin(rot))));g.rotate(rot);if(st.crouch)g.scale(1,st.crouch);
    g.strokeStyle=g.fillStyle=ink;g.lineCap='round';g.lineJoin='round';
    const L=([ax,ay])=>[ax-st.x,ay-camp.y]; // absolute -> local (only used upright)
    const bob=st.walk!=null?Math.abs(Math.sin(st.walk))*(st.run?2.5:st.jog?1.6:1)*k:0,hipY=-11*k-bob;
    g.lineWidth=2.6*k;g.beginPath();
    if(st.walk!=null){const a=Math.sin(st.walk)*(st.run?.85:st.jog?.65:.5);g.moveTo(0,hipY);g.lineTo(Math.sin(a)*11*k,0);g.moveTo(0,hipY);g.lineTo(-Math.sin(a)*11*k,0)}
    else{g.moveTo(0,hipY);g.lineTo(-3*k,0);g.moveTo(0,hipY);g.lineTo(3*k,0)}
    g.stroke();
    const lean=(st.reach||st.umb)?1.6*k*f:0,sx=lean,sy=-22*k-bob;
    g.lineWidth=5.4*k;g.beginPath();g.moveTo(0,hipY-k);g.lineTo(sx,sy);g.stroke();
    g.lineWidth=2.3*k;g.beginPath();
    if(st.reach){const c=L(rig.back);g.moveTo(sx,sy+k);g.lineTo(c[0],c[1]+k);g.moveTo(sx,sy+2*k);g.lineTo(c[0]-k,c[1]-2*k)}
    else if(st.umb){const h=L(umbrellaGeom().hand);g.moveTo(sx,sy+k);g.lineTo(h[0],h[1]);g.moveTo(sx,sy+2*k);g.lineTo(sx+2*k,sy+10*k)}
    else if(st.stretch){g.moveTo(sx,sy+k);g.lineTo(sx-3*k,sy-11*k);g.moveTo(sx,sy+k);g.lineTo(sx+3*k,sy-11*k)}
    else if(st.run){const w=Math.sin(T*23)*4*k;g.moveTo(sx,sy+k);g.lineTo(sx-5*k,sy-8*k+w);g.moveTo(sx,sy+k);g.lineTo(sx+6*k,sy-7*k-w)}
    else if(st.flail||st.dizzy||rot){g.moveTo(sx,sy+k);g.lineTo(sx-6*k,sy-5*k);g.moveTo(sx,sy+k);g.lineTo(sx+6*k,sy-5*k)}
    else if(st.walk!=null){const a=Math.sin(st.walk)*.45;g.moveTo(sx,sy+k);g.lineTo(sx+Math.sin(-a)*10*k,sy+10*k);g.moveTo(sx,sy+k);g.lineTo(sx+Math.sin(a)*10*k,sy+10*k)}
    else{g.moveTo(sx,sy+k);g.lineTo(sx-2*k*f,sy+10*k);g.moveTo(sx,sy+k);g.lineTo(sx+2*k*f,sy+10*k)}
    g.stroke();
    const hx=sx+((st.reach||st.umb)?1.6*k*f:.4*k*f),hy=sy-5*k;g.beginPath();g.arc(hx,hy,3.4*k,0,7);g.fill();
    g.beginPath();g.moveTo(hx-3.6*k*f,hy+.3*k);g.quadraticCurveTo(hx-.5*k*f,hy-5*k,hx+3.4*k*f,hy-1.6*k);g.lineTo(hx+2.6*k*f,hy-.6*k);g.fill();
    g.restore();
    if(st.dizzy){const hxA=st.x-27*k,hyA=camp.y-9*k;for(let i=0;i<3;i++){const a=T*3+i*2.09;g.fillStyle=UMB;g.beginPath();g.arc(hxA+Math.cos(a)*6*k,hyA+Math.sin(a)*2*k,1.1*k,0,7);g.fill()}
      const w=(T*.6)%1;g.fillStyle=`rgba(150,140,140,${.25*(1-w)})`;g.beginPath();g.arc(hxA+2*k,hyA-4*k-w*14*k,(2+w*4)*k,0,7);g.fill()}
  }
  function drawRig(){ // tripod + camera aimed at the crater
    const tx=camp.x+camp.w*.62,ty=camp.y-20*k;g.strokeStyle=g.fillStyle=ink;g.lineWidth=1.4*k;g.lineCap='round';
    g.beginPath();g.moveTo(tx,ty);g.lineTo(tx-6*k,camp.y);g.moveTo(tx,ty);g.lineTo(tx+6*k,camp.y);g.moveTo(tx,ty);g.lineTo(tx+1.5*k,camp.y);g.stroke();
    const a=Math.atan2(V.y-ty,V.x-tx);g.save();g.translate(tx,ty-2*k);g.rotate(a);
    g.fillRect(-5*k,-3*k,9*k,6*k);g.fillRect(-2*k,-4.6*k,3.6*k,2*k);g.fillRect(4*k,-2.4*k,5.5*k,4.8*k);
    g.restore();
    const ca=Math.cos(a),sa=Math.sin(a);
    const lens=[tx+ca*9.5*k-0,ty-2*k+sa*9.5*k],back=[tx-ca*5*k,ty-2*k-sa*5*k],led=[tx-ca*3*k-sa*-3.5*k,ty-2*k-sa*3*k+ca*-3.5*k];
    return{lens,back,led};
  }
  function drawTent(){ const tx=camp.x-camp.w*.6,b=camp.y,w=17*k,h=18*k;g.fillStyle=ink;g.beginPath();g.moveTo(tx-w,b);g.lineTo(tx,b-h);g.lineTo(tx+w,b);g.closePath();g.fill();
    g.fillStyle=`rgba(255,170,90,${.32+.12*Math.sin(T*2.3)})`;g.beginPath();g.moveTo(tx-3.6*k,b);g.lineTo(tx,b-8.5*k);g.lineTo(tx+3.6*k,b);g.fill();
    g.strokeStyle=ink;g.lineWidth=1*k;g.beginPath();g.moveTo(tx,b-h);g.lineTo(tx,b-h-3*k);g.stroke() }
  const poly=(pts)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1])};

  function frame(){
    g.clearRect(0,0,W,H);
    const sky=g.createLinearGradient(0,0,0,G);sky.addColorStop(0,'#0a0f24');sky.addColorStop(.42,'#17193d');sky.addColorStop(.7,'#3b1e3d');sky.addColorStop(.88,'#7d2f2b');sky.addColorStop(1,'#b9532a');
    g.fillStyle=sky;g.fillRect(0,0,W,G+8);
    stars.forEach(st=>{const a=.35+.35*Math.sin(st.p+T*st.sp);g.fillStyle=`rgba(237,232,224,${a*(1-st.y/(G*.68))})`;g.beginPath();g.arc(st.x,st.y,st.r,0,7);g.fill()});
    const gl=Math.min(glow,1.3);
    const gr=g.createRadialGradient(V.x,V.y,4,V.x,V.y,W*.42*Math.max(s,.9));gr.addColorStop(0,`rgba(255,122,42,${.26+.32*gl})`);gr.addColorStop(.4,`rgba(232,98,58,${.09+.14*gl})`);gr.addColorStop(1,'rgba(232,98,58,0)');g.fillStyle=gr;g.fillRect(0,0,W,G+8);
    smoke.forEach(p=>{if(p.age<0)return;const a=Math.sin(Math.PI*Math.min(1,p.age/p.life));const q=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);q.addColorStop(0,`rgba(70,56,80,${.32*a})`);q.addColorStop(1,'rgba(70,56,80,0)');g.fillStyle=q;g.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);const o=g.createRadialGradient(p.x,p.y+p.r*.4,0,p.x,p.y+p.r*.4,p.r*.8);o.addColorStop(0,`rgba(255,120,50,${.12*a*(.3+gl)})`);o.addColorStop(1,'rgba(255,120,50,0)');g.fillStyle=o;g.fillRect(p.x-p.r,p.y-p.r*.4,p.r*2,p.r*1.6)});
    g.fillStyle='#1a1726';poly([[0,G+8],...far,[W,G+8]]);g.fill();
    // Fuego
    const vg=g.createLinearGradient(0,V.y,0,G);vg.addColorStop(0,'#2b1d26');vg.addColorStop(1,'#151317');g.fillStyle=vg;poly([...outline,[outline[outline.length-1][0],G+10],[outline[0][0],G+10]]);g.closePath();g.fill();
    g.save();g.clip();
    const rim=g.createRadialGradient(V.x,V.y,2,V.x,V.y,V.bw*.9);rim.addColorStop(0,`rgba(255,120,50,${.18+.25*gl})`);rim.addColorStop(1,'rgba(255,120,50,0)');g.fillStyle=rim;g.fillRect(V.x-V.bw*1.3,V.y-10,V.bw*2.6,G-V.y+20);
    g.lineCap='round';gullies.forEach(p=>{g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=1.8*s;poly(p);g.stroke();g.strokeStyle='rgba(255,150,90,.05)';g.lineWidth=1*s;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x+1.6*s,y):g.moveTo(x+1.6*s,y));g.stroke()});
    flows.forEach(f=>{const prog=Math.min(1,f.age/6)*f.len,n=Math.max(2,Math.round(prog*(f.pts.length-1))+1),pts=f.pts.slice(0,n);
      const cool=Math.max(0,(f.age-6)/16),a=1-cool;const col=f.age<6?'255,150,60':`${Math.round(255-80*cool)},${Math.round(110-70*cool)},${Math.round(50-30*cool)}`;
      g.strokeStyle=`rgba(${col},${.22*a})`;g.lineWidth=6*s;poly(pts);g.stroke();g.strokeStyle=`rgba(${col},${.9*a})`;g.lineWidth=1.8*s;poly(pts);g.stroke();
      if(f.age<6){const h=pts[pts.length-1];g.fillStyle='rgba(255,220,140,.9)';g.beginPath();g.arc(h[0],h[1],2*s,0,7);g.fill()}});
    g.restore();
    const cr=g.createRadialGradient(V.x,V.y,1,V.x,V.y,(26+20*gl)*s);cr.addColorStop(0,`rgba(255,205,120,${.55+.4*Math.min(gl,1)})`);cr.addColorStop(1,'rgba(255,110,40,0)');g.fillStyle=cr;g.fillRect(V.x-50*s,V.y-50*s,100*s,70*s);
    bombs.forEach(b=>{const a=Math.min(1,(b.life-b.age)/1.2);const hot=b.age<.7?'255,214,130':'255,120,45';
      if(b.tr.length){g.strokeStyle=`rgba(${hot},${.5*a})`;g.lineWidth=1.6*s;g.beginPath();b.tr.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.lineTo(b.x,b.y);g.stroke()}
      g.fillStyle=`rgba(${hot},${a})`;g.beginPath();g.arc(b.x,b.y,(b.tiny?1:b.big?2.6:b.landed?1.4:1.8)*s,0,7);g.fill()});
    // camp ridge in page colour
    g.fillStyle='#121110';poly([...hill,[W,H],[0,H]]);g.closePath();g.fill();
    drawTent();const rig=drawRig();const st=joeState();const {n,Tl,Tn}=cycle(),r=T-Tl;
    if(st.umb)drawUmbrella(st.umb);else if(n>=0&&r>=2.6&&r<9.8)drawFallenUmbrella();
    drawJoe(st,rig);
    if(((T>=Tn-.2)||(n>=0&&r<3.75))&&T>=FIRST-.2&&Math.sin(T*6)>-.2){g.fillStyle='#ff3b30';g.beginPath();g.arc(rig.led[0],rig.led[1],1*k,0,7);g.fill()}
    if(n>=0&&r>=3.75&&r<3.92){const f=g.createRadialGradient(rig.lens[0],rig.lens[1],0,rig.lens[0],rig.lens[1],18*s);f.addColorStop(0,'rgba(255,255,255,.95)');f.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=f;g.beginPath();g.arc(rig.lens[0],rig.lens[1],18*s,0,7);g.fill()}
  }
  function stillFrame(){T=0;nextEv=0;bombs=[];smoke=[];flows=[];glow=0;for(let i=0;i<Math.round(5.05/.03);i++)step(.03);frame()}
  let running=false,visible=true,last=0;
  function loop(ts){if(!running)return;const dt=Math.min(.05,(ts-last)/1000);last=ts;step(dt);frame();requestAnimationFrame(loop)}
  function play(){if(still||running||!visible||document.hidden)return;running=true;requestAnimationFrame(ts=>{last=ts;loop(ts)})}
  function pause(){running=false}
  layout();
  if(still)stillFrame();
  else{frame();new IntersectionObserver(([e])=>{visible=e.isIntersecting;visible?play():pause()}).observe(wrap);document.addEventListener('visibilitychange',()=>document.hidden?pause():play());play()}
  let rt;const re=()=>{clearTimeout(rt);rt=setTimeout(()=>{layout();bombs=[];flows=[];if(still)stillFrame();else frame()},120)};
  addEventListener('resize',re);document.fonts&&document.fonts.ready.then(re);
  window.__scene={step,frame,get T(){return T}};
})();
