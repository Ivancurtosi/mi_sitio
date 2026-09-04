function draw(){const r=routes[routeIndex];const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,r.sky[0]);grd.addColorStop(1,r.sky[1]);ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 // stars
 ctx.save();for(let i=0;i<90;i++){const wx=((i*173.7+routeIndex*61)%r.length),sx=(wx-cameraX*.18)*scale;const sy=(20+(i*97)%430)*scale;if(sx>-5&&sx<W+5){ctx.globalAlpha=.25+seeded(i)*.7;ctx.fillStyle=i%7===0?'#9df5ff':'#fff';const rr=(1+seeded(i*4)*1.3)*scale;ctx.beginPath();ctx.arc(sx,sy,rr,0,Math.PI*2);ctx.fill()}}ctx.restore();
 ctx.save();ctx.scale(scale,scale);ctx.translate(-cameraX,0);
 // distant planets
 for(let i=0;i<5;i++){const px=600+i*980,py=120+(i%2)*90,rad=55+i*7;ctx.globalAlpha=.15;ctx.fillStyle=i%2?'#e18cff':'#5fe9ff';ctx.beginPath();ctx.arc(px-cameraX*.08,py,rad,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 // platforms
 for(const p of worldPlatforms){ctx.fillStyle=p.block?'#294d73':r.ground;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=p.block?'#72d9ff':'#3b8792';ctx.fillRect(p.x,p.y,p.w,6);if(p.block){ctx.strokeStyle='#8feaff55';ctx.strokeRect(p.x+4,p.y+4,p.w-8,p.h-8)}}
 // lights
 for(const c of collectibles){if(c.taken)continue;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(performance.now()/800);ctx.shadowBlur=18;ctx.shadowColor='#ffe96f';ctx.fillStyle='#fff5a8';ctx.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,rr=k%2?4:9;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
 // powerups
 for(const p of powerups){if(p.taken)continue;ctx.save();ctx.translate(p.x+15,p.y+15);ctx.rotate(performance.now()/950);ctx.shadowBlur=20;ctx.shadowColor=p.kind==='grow'?'#6ff5cf':'#a98cff';ctx.fillStyle=p.kind==='grow'?'#73f5ce':'#9c7aff';ctx.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.lineTo(Math.cos(a)*15,Math.sin(a)*15)}ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.kind==='grow'?'↑':'✦',0,1);ctx.restore()}
 // beacons
 const bs=r.beacons;for(let i=0;i<3;i++){const x=bs[i*2],y=bs[i*2+1],on=beaconOn[i];ctx.fillStyle='#263d5c';ctx.fillRect(x-7,y,14,46);ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fillStyle=on?'#7cf9ef':'#405b73';ctx.shadowBlur=on?25:0;ctx.shadowColor='#70f2ff';ctx.fill();ctx.shadowBlur=0;if(on){ctx.strokeStyle='#a8fff7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,22+Math.sin(performance.now()/200+i)*3,0,Math.PI*2);ctx.stroke()}}
 // goal
 const gx=r.goal+80;ctx.save();ctx.translate(gx,515);ctx.strokeStyle=beaconOn.every(Boolean)?'#76ffe1':'#64758a';ctx.lineWidth=8;ctx.shadowBlur=beaconOn.every(Boolean)?30:0;ctx.shadowColor='#64f7dc';ctx.beginPath();ctx.ellipse(0,0,30,62,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 // enemies
 for(const e of enemies){if(!e.alive)continue;ctx.save();ctx.translate(e.x+17,e.y+17);ctx.fillStyle='#f05e72';ctx.shadowBlur=12;ctx.shadowColor='#ff4466';ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#2b0920';ctx.fillRect(-8,-3,5,5);ctx.fillRect(3,-3,5,5);ctx.restore()}
 // projectiles
 for(const p of projectiles){ctx.fillStyle='#c5a5ff';ctx.shadowBlur=16;ctx.shadowColor='#a477ff';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
 // player Lumi
 if(player.inv<=0||Math.floor(player.inv*12)%2===0){ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);const bob=player.onGround?Math.sin(player.anim)*1.5:0;ctx.translate(0,bob);ctx.scale(player.dir,1);ctx.shadowBlur=14;ctx.shadowColor=player.big?'#8bffdf':'#63ddff';ctx.fillStyle=player.big?'#66edc3':'#4dbce8';ctx.beginPath();ctx.roundRect(-player.w/2,-player.h/2,player.w,player.h,player.big?12:9);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#eefbff';ctx.beginPath();ctx.arc(5,-player.h*.14,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#09263a';ctx.beginPath();ctx.arc(6,-player.h*.14,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe4a3';ctx.fillRect(-player.w*.28,player.h*.28,player.w*.22,6);ctx.fillRect(player.w*.05,player.h*.28,player.w*.22,6);if(player.fire){ctx.fillStyle='#b89cff';ctx.beginPath();ctx.arc(-4,-player.h*.28,5,0,Math.PI*2);ctx.fill()}ctx.restore()}
 // particles
 for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}ctx.globalAlpha=1;
 ctx.restore();
 // route label
 ctx.fillStyle='#ffffffbb';ctx.font='800 12px system-ui';ctx.textAlign='left';ctx.fillText(r.name,16,H-12);
}

function loop(t){if(state!=='playing')return;const dt=Math.min(.033,(t-lastTime)/1000||.016);lastTime=t;secondAcc+=dt;if(secondAcc>=1){timeLeft-=secondAcc;secondAcc=0;if(timeLeft<=0){timeLeft=0;updateHud();loseLife('Se terminó el tiempo');return}updateHud()}
 physics(dt);updateParticles(dt);if(input.firePressed){fire();input.firePressed=false}draw();input.jumpPressed=false;input.boostJump=false;requestAnimationFrame(loop)}
