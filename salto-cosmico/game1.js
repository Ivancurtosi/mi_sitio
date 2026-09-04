'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const el=id=>document.getElementById(id);
const hud={lights:el('lights'),score:el('score'),route:el('route'),time:el('time'),lives:el('lives')};
const music=el('music');
const playlist=['audio/track1.mp3','audio/track2.mp3','audio/track3.mp3','audio/track4.mp3','audio/track5.mp3'];
let trackIndex=0,musicWanted=true;
function playTrack(i=trackIndex){trackIndex=(i+playlist.length)%playlist.length;music.src=playlist[trackIndex];music.volume=.43;if(musicWanted) music.play().catch(()=>{});}
music.addEventListener('ended',()=>playTrack(trackIndex+1));
music.addEventListener('error',()=>{setTimeout(()=>playTrack(trackIndex+1),400)});

const DPR=()=>Math.min(devicePixelRatio||1,2);
let W=innerWidth,H=innerHeight,scale=1,cameraX=0;
function resize(){W=innerWidth;H=innerHeight;const d=DPR();canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(d,0,0,d,0,0);scale=Math.max(.48,Math.min(1.25,H/720));}
addEventListener('resize',resize,{passive:true});resize();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
function seeded(n){let x=Math.sin(n*999.23)*43758.5453;return x-Math.floor(x)}

const routes=[
 {name:'Estación Aurora',sky:['#081530','#113d70'],ground:'#163d4e',length:4400,start:[120,500],goal:4230,
  platforms:[[0,610,920,160],[1030,555,380,45],[1510,490,300,45],[1910,580,570,180],[2570,525,360,45],[3030,455,340,45],[3460,545,410,45],[3960,610,520,160]],
  blocks:[[590,500,110,38],[760,430,120,38],[1220,445,110,38],[1660,380,110,38],[2190,450,120,38],[2710,390,110,38],[3150,335,110,38],[3650,430,110,38]],
  enemies:[[1320,515,1030,1410],[2310,540,1930,2480],[3290,415,3030,3370]],powerups:[[810,395,'grow'],[2770,350,'fire']],beacons:[1750,345,3195,300,4140,555]},
 {name:'Cañón de Neón',sky:['#170c35','#4f1f67'],ground:'#49335f',length:4800,start:[120,500],goal:4630,
  platforms:[[0,610,720,160],[820,540,420,45],[1350,610,520,160],[1970,530,320,45],[2390,445,370,45],[2860,610,520,160],[3500,515,450,45],[4050,610,820,160]],
  blocks:[[460,495,120,38],[940,425,120,38],[1510,500,120,38],[2080,405,110,38],[2500,325,110,38],[2990,485,120,38],[3660,395,120,38],[4210,470,120,38]],
  enemies:[[1090,500,830,1240],[1680,570,1360,1850],[2580,405,2400,2760],[3740,475,3510,3950]],powerups:[[1000,385,'grow'],[3030,445,'fire']],beacons:[1600,455,2535,285,4300,430]},
 {name:'Anillos de Hielo',sky:['#071c31','#165c72'],ground:'#215c6b',length:5000,start:[120,500],goal:4800,
  platforms:[[0,610,850,160],[960,515,330,45],[1400,420,330,45],[1830,610,700,160],[2650,505,300,45],[3070,405,330,45],[3510,610,560,160],[4190,510,330,45],[4630,610,500,160]],
  blocks:[[540,485,120,38],[1050,395,110,38],[1500,300,110,38],[2110,480,120,38],[2750,385,110,38],[3180,285,110,38],[3740,470,120,38],[4300,390,110,38]],
  enemies:[[1140,475,960,1290],[2220,570,1840,2530],[3260,365,3070,3400],[3850,570,3520,4070]],powerups:[[1540,260,'fire'],[3740,430,'grow']],beacons:[1580,260,3250,245,4430,350]},
 {name:'Núcleo Carmesí',sky:['#23090f','#731d32'],ground:'#633040',length:5450,start:[120,500],goal:5220,
  platforms:[[0,610,760,160],[870,510,310,45],[1290,610,530,160],[1930,480,300,45],[2340,370,330,45],[2780,610,600,160],[3490,495,320,45],[3920,405,350,45],[4380,610,1150,160]],
  blocks:[[470,480,120,38],[960,390,110,38],[1450,485,120,38],[2020,360,110,38],[2450,250,110,38],[3020,470,120,38],[3580,375,110,38],[4030,285,110,38],[4740,470,120,38]],
  enemies:[[1030,470,880,1180],[1630,570,1300,1820],[2500,330,2340,2670],[3190,570,2800,3380],[4140,365,3920,4270],[4870,570,4400,5150]],powerups:[[2050,320,'grow'],[4070,245,'fire']],beacons:[2080,320,4100,245,5050,535]}
];

let state='start',routeIndex=0,score=0,lights=0,lives=3,timeLeft=320,lastTime=0,secondAcc=0,particles=[],projectiles=[],beaconOn=[],collectibles=[],worldPlatforms=[],enemies=[],powerups=[];
const player={x:120,y:500,w:30,h:38,vx:0,vy:0,onGround:false,dir:1,big:false,fire:false,inv:0,jumpHeld:false,jumpHold:0,anim:0};
const input={axis:0,run:false,jump:false,jumpPressed:false,boostJump:false,firePressed:false};

function toast(t){const n=el('toast');n.textContent=t;n.classList.add('showToast');clearTimeout(toast.t);toast.t=setTimeout(()=>n.classList.remove('showToast'),1500)}
function updateHud(){hud.lights.textContent=String(lights).padStart(2,'0');hud.score.textContent=String(score).padStart(6,'0');hud.route.textContent=routeIndex+1;hud.time.textContent=Math.max(0,Math.ceil(timeLeft));hud.lives.textContent=lives;}
function setPlayerSize(big){const bottom=player.y+player.h;player.big=big;player.w=big?38:30;player.h=big?58:38;player.y=bottom-player.h;}
function makeCollectibles(r){const arr=[];for(let x=260;x<r.length-220;x+=145){if(seeded(x+routeIndex*31)>.26){let y=470-seeded(x*2.3+routeIndex)*160;arr.push({x,y,r:7,taken:false});}}return arr}
function loadRoute(idx){routeIndex=idx;const r=routes[idx];worldPlatforms=[...r.platforms,...r.blocks].map(p=>({x:p[0],y:p[1],w:p[2],h:p[3],block:r.blocks.some(b=>b[0]===p[0]&&b[1]===p[1])}));
 enemies=r.enemies.map((e,i)=>({x:e[0],y:e[1],w:34,h:34,min:e[2],max:e[3],vx:i%2?1.05:-1.05,alive:true}));
 powerups=r.powerups.map(p=>({x:p[0],y:p[1],kind:p[2],taken:false,w:30,h:30}));beaconOn=[false,false,false];collectibles=makeCollectibles(r);projectiles=[];particles=[];cameraX=0;timeLeft=320;secondAcc=0;
 player.x=r.start[0];player.y=r.start[1];player.vx=0;player.vy=0;player.onGround=false;player.inv=0;setPlayerSize(false);player.fire=false;el('powerBtn').style.display='none';updateHud();toast('RUTA '+(idx+1)+' · '+r.name);}
function resetGame(){score=0;lights=0;lives=3;loadRoute(0);state='playing';hideScreens();if(musicWanted){if(!music.src)playTrack(0);else music.play().catch(()=>{});}lastTime=performance.now();requestAnimationFrame(loop)}
function hideScreens(){['startScreen','pauseScreen','gameOverScreen','winScreen'].forEach(id=>el(id).style.display='none')}
function loseLife(reason=''){if(player.inv>0)return;lives--;updateHud();if(lives<=0){state='gameover';el('gameOverScreen').style.display='flex';music.pause();return;}toast(reason||'Perdiste una vida');loadRoute(routeIndex);}
function addLight(){lights++;score+=100;if(lights>=100){lights-=100;lives++;toast('¡100 luces! +1 vida');}updateHud();}
function hitPlayer(){if(player.inv>0)return;if(player.big){setPlayerSize(false);player.inv=1.8;toast('Lumi volvió a tamaño normal');}else{loseLife('Impacto cósmico');}}
function activatePower(kind){if(kind==='grow'){if(!player.big){setPlayerSize(true);toast('¡Lumi creció!');}else score+=600;}else{player.fire=true;el('powerBtn').style.display='grid';toast('¡Poder de plasma desbloqueado!');}score+=500;updateHud();}
function fire(){if(!player.fire)return;projectiles.push({x:player.x+player.w/2+player.dir*18,y:player.y+player.h*.45,vx:player.dir*8.5,r:6,life:1.7});score=Math.max(0,score-5);updateHud();}
