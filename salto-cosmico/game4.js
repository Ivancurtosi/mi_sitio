// Touch / pointer joystick
const joy=el('joystickWrap'),knob=el('joyKnob');let joyId=null;
function joyUpdate(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=46,mag=Math.hypot(dx,dy)||1,k=Math.min(1,max/mag),kx=dx*k,ky=dy*k;knob.style.transform=`translate(${kx}px,${ky}px)`;input.axis=clamp(dx/max,-1,1)}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyUpdate(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyUpdate(e)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;input.axis=0;knob.style.transform='translate(0,0)'}joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);

const runBtn=el('runBtn'),jumpBtn=el('jumpBtn'),powerBtn=el('powerBtn');let runId=null,jumpIds=new Set(),boostArmed=false;
function inside(elm,x,y){const r=elm.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
runBtn.addEventListener('pointerdown',e=>{runId=e.pointerId;boostArmed=true;input.run=true;runBtn.classList.add('active');runBtn.setPointerCapture(e.pointerId)});
runBtn.addEventListener('pointermove',e=>{if(e.pointerId!==runId)return;if(boostArmed&&inside(jumpBtn,e.clientX,e.clientY)){boostArmed=false;input.jump=true;input.jumpPressed=true;input.boostJump=true;jumpIds.add(e.pointerId);jumpBtn.classList.add('active')}});
function endRun(e){if(e.pointerId!==runId)return;runId=null;input.run=false;boostArmed=false;runBtn.classList.remove('active');if(jumpIds.has(e.pointerId)){jumpIds.delete(e.pointerId);if(!jumpIds.size)input.jump=false;jumpBtn.classList.remove('active')}}runBtn.addEventListener('pointerup',endRun);runBtn.addEventListener('pointercancel',endRun);
jumpBtn.addEventListener('pointerdown',e=>{jumpIds.add(e.pointerId);input.jump=true;input.jumpPressed=true;jumpBtn.classList.add('active');jumpBtn.setPointerCapture(e.pointerId)});
function endJump(e){jumpIds.delete(e.pointerId);if(!jumpIds.size)input.jump=false;jumpBtn.classList.remove('active')}jumpBtn.addEventListener('pointerup',endJump);jumpBtn.addEventListener('pointercancel',endJump);
powerBtn.addEventListener('pointerdown',e=>{input.firePressed=true;powerBtn.classList.add('active');setTimeout(()=>powerBtn.classList.remove('active'),100)});

// Keyboard fallback
const keys=new Set();addEventListener('keydown',e=>{keys.add(e.code);if(['ArrowLeft','ArrowRight','Space','ShiftLeft','KeyX','KeyZ'].includes(e.code))e.preventDefault();if(e.code==='Space'||e.code==='KeyZ'){if(!input.jump){input.jumpPressed=true;input.boostJump=keys.has('ShiftLeft')}input.jump=true}if(e.code==='KeyX')input.firePressed=true;input.run=keys.has('ShiftLeft')});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'||e.code==='KeyZ')input.jump=false;if(e.code==='ShiftLeft')input.run=false});
function pollKeyboard(){if(keys.has('ArrowLeft')||keys.has('KeyA'))input.axis=-1;else if(keys.has('ArrowRight')||keys.has('KeyD'))input.axis=1;else if(joyId===null)input.axis=0;requestAnimationFrame(pollKeyboard)}pollKeyboard();

el('startBtn').addEventListener('click',resetGame);el('restartBtn').addEventListener('click',resetGame);el('againBtn').addEventListener('click',resetGame);
function togglePause(){if(state==='playing'){state='paused';el('pauseScreen').style.display='flex';music.pause()}else if(state==='paused'){state='playing';el('pauseScreen').style.display='none';if(musicWanted)music.play().catch(()=>{});lastTime=performance.now();requestAnimationFrame(loop)}}
el('pauseBtn').addEventListener('click',togglePause);el('resumeBtn').addEventListener('click',togglePause);
el('muteBtn').addEventListener('click',()=>{musicWanted=!musicWanted;el('muteBtn').textContent=musicWanted?'Silenciar ♫':'Activar música ♫';if(musicWanted&&state==='playing')music.play().catch(()=>{});else music.pause()});
el('fullscreenBtn').addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.()});

draw();updateHud();
