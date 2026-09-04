function physics(dt){const r=routes[routeIndex];const speed=input.run?6.7:4.4,acc=player.onGround?27:17,fric=player.onGround?22:7,target=input.axis*speed;
 if(Math.abs(input.axis)>.04){player.vx += clamp(target-player.vx,-acc*dt,acc*dt);player.dir=input.axis<0?-1:1;}else{player.vx += clamp(-player.vx,-fric*dt,fric*dt);}
 if(input.jumpPressed&&player.onGround){const boost=input.boostJump&&input.run;player.vy=boost?-12.8:-11.3;player.onGround=false;player.jumpHold=.19;spawnBurst(player.x+player.w/2,player.y+player.h,'#91f7df',8);if(boost)toast('¡SALTO CON IMPULSO!');}
 if(input.jump&&player.vy<0&&player.jumpHold>0){player.vy-=18*dt;player.jumpHold-=dt;}else player.jumpHold=0;
 player.vy+=27.5*dt;player.vy=Math.min(player.vy,16);
 const oldX=player.x;player.x+=player.vx*60*dt;for(const p of worldPlatforms){if(overlap(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;player.vx=0;}}
 const oldY=player.y;player.y+=player.vy*60*dt;player.onGround=false;for(const p of worldPlatforms){if(overlap(player,p)){if(player.vy>0&&oldY+player.h<=p.y+10){player.y=p.y-player.h;player.vy=0;player.onGround=true;}else if(player.vy<0&&oldY>=p.y+p.h-10){player.y=p.y+p.h;player.vy=0;}else{if(player.y< p.y)player.y=p.y-player.h;}}}
 if(player.x<0){player.x=0;player.vx=0}if(player.x>r.length-player.w)player.x=r.length-player.w;if(player.y>H/scale+300)loseLife('Caíste al vacío');
 player.anim+=Math.abs(player.vx)*dt*2.5;if(player.inv>0)player.inv-=dt;
 // collectibles
 for(const c of collectibles){if(!c.taken&&dist(player.x+player.w/2,player.y+player.h/2,c.x,c.y)<28){c.taken=true;addLight();spawnBurst(c.x,c.y,'#ffe87c',10)}}
 for(const p of powerups){if(!p.taken&&overlap(player,p)){p.taken=true;activatePower(p.kind);spawnBurst(p.x+15,p.y+15,p.kind==='grow'?'#7df9ce':'#b895ff',18)}}
 // beacons
 const bs=r.beacons;for(let i=0;i<3;i++){const bx=bs[i*2],by=bs[i*2+1];if(!beaconOn[i]&&dist(player.x+player.w/2,player.y+player.h/2,bx,by)<52){beaconOn[i]=true;score+=800;toast('Baliza '+(i+1)+'/3 encendida');spawnBurst(bx,by,'#70f2ff',24);updateHud();}}
 // enemies
 for(const e of enemies){if(!e.alive)continue;e.x+=e.vx*60*dt;if(e.x<e.min){e.x=e.min;e.vx=Math.abs(e.vx)}if(e.x>e.max){e.x=e.max;e.vx=-Math.abs(e.vx)}
  if(overlap(player,e)){if(player.vy>1.4&&oldY+player.h<=e.y+14){e.alive=false;player.vy=-8.8;score+=450;spawnBurst(e.x+17,e.y+17,'#ff7c8c',15);updateHud();}else hitPlayer();}}
 // projectiles
 for(const pr of projectiles){pr.x+=pr.vx*60*dt;pr.life-=dt;for(const e of enemies){if(e.alive&&dist(pr.x,pr.y,e.x+17,e.y+17)<22){e.alive=false;pr.life=0;score+=350;spawnBurst(e.x+17,e.y+17,'#bc9cff',14);updateHud();}}}
 projectiles=projectiles.filter(p=>p.life>0&&p.x>0&&p.x<r.length);
 // finish: all beacons + portal
 if(player.x>r.goal&&beaconOn.every(Boolean)){score+=Math.max(0,Math.ceil(timeLeft))*15;updateHud();if(routeIndex<3){loadRoute(routeIndex+1)}else{state='win';el('winScreen').style.display='flex';music.pause();}}
 else if(player.x>r.goal&&!beaconOn.every(Boolean)&&!physics.warnGoal){toast('Te faltan balizas por encender');physics.warnGoal=true;setTimeout(()=>physics.warnGoal=false,1400)}
 // camera
 const targetCam=clamp(player.x-W/scale*.42,0,Math.max(0,r.length-W/scale));cameraX+=(targetCam-cameraX)*clamp(6*dt,0,1);
}
function spawnBurst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*5,life:.45+Math.random()*.5,color,s:2+Math.random()*4})}
function updateParticles(dt){for(const p of particles){p.x+=p.vx*60*dt;p.y+=p.vy*60*dt;p.vy+=8*dt;p.life-=dt}particles=particles.filter(p=>p.life>0)}
