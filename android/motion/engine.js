/* ZorixOS 3.0 Motion Engine
 * Motion is attached to user intent, rather than automatically animating every DOM update.
 * All main effects use compositor-friendly transforms/opacity. The simulator never blocks Android calls.
 */
(function(){
'use strict';
const doc=document, root=doc.documentElement, screen=doc.getElementById('screen');
if(!screen || !window.ZorixV2) return;
const store={mode:'zorix.motion.mode.v3',haptic:'zorix.motion.haptic.v3'};
const load=(k,v)=>{try{return localStorage.getItem(k)??v}catch(_){return v}};
const save=(k,v)=>{try{localStorage.setItem(k,String(v))}catch(_){}};
const locale=()=>window.ZorixV2.lang==='zh';
const tr=(en,zh)=>locale()?zh:en;
const glyph=(id,size=21)=>typeof osI==='function'?osI(id,size):'';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||!!OS_PREF.reduceMotion||engine.mode==='off';
const engine={mode:load(store.mode,'expressive'),haptic:load(store.haptic,'true')!=='false',rect:null,originApp:null,stamp:0,close:null,token:0,viewKey:'',routeDepth:0};
if(!['expressive','balanced','calm','off'].includes(engine.mode))engine.mode='expressive';
const factor=()=>reduced()?.01:engine.mode==='calm'?.52:engine.mode==='balanced'?.78:1;
const ms=(n)=>Math.max(1,Math.round(n*factor()));
const isMotion=()=>!reduced()&&!doc.hidden;
function apply(){root.dataset.zmMode=engine.mode;root.dataset.zmReduced=String(reduced());save(store.mode,engine.mode);save(store.haptic,engine.haptic);screen.classList.toggle('zm-low-power',!!OS_PREF.lowPower)}
apply();
function haptic(weight='light'){
 if(!engine.haptic||reduced()||!navigator.vibrate)return;
 try{navigator.vibrate(weight==='medium'?11:weight==='soft'?3:6)}catch(_){}
}
function replayClass(el,c,delay=550){if(!el||!isMotion())return;el.classList.remove(c);void el.offsetWidth;el.classList.add(c);setTimeout(()=>el?.classList.remove(c),ms(delay)+20)}
// A single delegated pointer handler covers static buttons and controls rendered later.
const interactive='button,.app-tile,.widget,[role="button"]';
let pressed=null,px=0,py=0;
function clearPress(rebound){if(!pressed)return;const node=pressed;pressed=null;node.classList.remove('zm-pressed');if(rebound&&node.isConnected)replayClass(node,'zm-released',430)}
screen.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const target=e.target.closest(interactive);
 if(!target||target.disabled)return;
 clearPress(false);pressed=target;px=e.clientX;py=e.clientY;target.classList.add('zm-pressed');
},{passive:true,capture:true});
screen.addEventListener('pointermove',e=>{if(pressed&&Math.hypot(e.clientX-px,e.clientY-py)>17)clearPress(false)},{passive:true,capture:true});
for(const ev of ['pointerup','pointercancel','pointerleave'])screen.addEventListener(ev,()=>clearPress(ev==='pointerup'),{passive:true,capture:true});
// Origin coordinates for spatial app transitions. Capture before the existing click handler.
screen.addEventListener('click',e=>{
 const launch=e.target.closest('.app-tile,[data-open]');
 if(launch){const rect=(launch.querySelector('.app-icon')||launch).getBoundingClientRect();
  engine.rect={left:rect.left,top:rect.top,width:rect.width,height:rect.height};
  engine.originApp=launch.dataset.app||launch.dataset.open||null;engine.stamp=performance.now();
  haptic('soft');}
 const toggle=e.target.closest('.ios-switch,.zx-privacy-switch,[role="switch"],.z-chip,.z-swatch');
 if(toggle){haptic('soft');requestAnimationFrame(()=>replayClass(toggle,'zm-switch-pulse',390))}
 const island=e.target.closest('#island');if(island)replayClass(island,'zm-island-tap',280);
 if(e.target.closest('[data-os-setting],[data-zx-step],[data-zm-select],[data-zm-action]'))haptic('soft');
},true);
// Convert an icon's screen rectangle into a transform relative to the full app layer.
function anchorFor(id){if(engine.originApp===id&&performance.now()-engine.stamp<1100&&engine.rect)return engine.rect;
 let tile=screen.querySelector(`.home-pages [data-app="${CSS.escape(id)}"], .dock [data-app="${CSS.escape(id)}"]`);
 if(tile){const r=(tile.querySelector('.app-icon')||tile).getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}}
 return null;
}
function zoomFrom(r){const outer=screen.getBoundingClientRect();let scale=r?Math.max(.08,Math.min(.24,r.width/outer.width)):.72;
 const cx=r?r.left+r.width/2:outer.left+outer.width/2,cy=r?r.top+r.height/2:outer.top+outer.height*.76;
 const x=(cx-(outer.left+outer.width/2))*(screen.clientWidth/outer.width),y=(cy-(outer.top+outer.height/2))*(screen.clientHeight/outer.height);
 return `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(3)})`;
}
const layer=doc.getElementById('appLayer');
function stopClosing(){if(!engine.close)return;
 const {anim,resolve}=engine.close;engine.close=null;
 try{anim?.cancel()}catch(_){};
 resolve?.();
}
const prevOpen=openApp;
openApp=function(id,section){
 if(!apps[id])return;
 stopClosing();
 const previous=state.app;
 const rect=anchorFor(id);
 layer.classList.add('zm-app-motion');
 engine.token++;
 prevOpen(id,section);
 engine.originApp=null;
 if(isMotion()){
  const target=zoomFrom(rect);
  const frames=previous?[{opacity:.54,transform:'translate3d(14px,0,0) scale(.975)',borderRadius:'28px'},{opacity:1,transform:'translateZ(0) scale(1)',borderRadius:'0px'}]
    :[{opacity:.3,transform:target,borderRadius:'50px'},{opacity:.95,offset:.70,transform:'translate3d(0,0,0) scale(1.012)',borderRadius:'13px'},{opacity:1,transform:'translateZ(0) scale(1)',borderRadius:'0px'}];
  const ani=layer.animate(frames,{duration:ms(previous?310:480),easing:'cubic-bezier(.22,1,.36,1)'});
  const token=engine.token;ani.finished.catch(()=>{}).then(()=>{if(token===engine.token)layer.classList.remove('zm-app-motion')});
 }else{layer.classList.remove('zm-app-motion')}
};
const prevClose=closeApp;
closeApp=function(){
 if(!state.app){if(engine.close)return;return prevClose()}
 if(!isMotion()){stopClosing();return prevClose()}
 const id=state.app,frame=anchorFor(id),target=zoomFrom(frame),token=++engine.token;
 // Stop camera immediately when exiting; never hold a live stream for an animation.
 if(typeof OS!=='undefined'&&OS.cameraStream){try{OS.cameraStream.getTracks().forEach(t=>t.stop())}catch(_){}OS.cameraStream=null}
 layer.classList.add('zm-app-motion');
 state.app=null;screen.classList.remove('app-active','dark-app');layer.style.pointerEvents='none';
 const ani=layer.animate([{opacity:1,transform:'translateZ(0) scale(1)',borderRadius:'0px'},
  {opacity:.8,offset:.57,transform:'translate3d(0,5px,0) scale(.93)',borderRadius:'26px'},
  {opacity:.08,transform:target,borderRadius:'51px'}],{duration:ms(385),easing:'cubic-bezier(.32,.02,.35,1)'});
 let settled=false;
 function finish(){if(settled)return;settled=true;if(engine.close?.token===token)engine.close=null;
  if(token===engine.token){prevClose();layer.classList.remove('zm-app-motion');layer.style.pointerEvents=''}}
 engine.close={anim:ani,resolve:finish,token};
 ani.finished.catch(()=>{}).then(finish);
 // A browser suspended mid-frame must not leave a blocking invisible app layer.
 setTimeout(finish,ms(410)+130);
};
// Let Settings navigate horizontally like a distinct OS panel; other apps keep a soft material entrance.
const prevRender=osRenderApp;
osRenderApp=function(){
 const id=state.app;const depth=id==='settings'?OS.settingsStack.length:OS.view?1:0;
 const route=id==='settings'?String(OS.settingsStack.at(-1)||'root'):id?String(OS.view?.type||'main'):'none';
 const key=id+'|'+route;
 const oldKey=engine.viewKey,oldDepth=engine.routeDepth;
 const view=doc.getElementById('appView');
 prevRender();
 engine.viewKey=key;engine.routeDepth=depth;
 if(!state.app||!isMotion()||!view)return;
 const first=[...view.children].find(x=>x.nodeType===1&&x.tagName!=='STYLE');
 if(!first)return;
 const mode=key===oldKey?'zm-route-refresh':depth<oldDepth?'zm-route-back':'zm-route-in';
 // One frame later guarantees a new animation even after a fast, repeated interaction.
 first.classList.remove('zm-route-in','zm-route-back','zm-route-refresh');void first.offsetWidth;first.classList.add(mode);
 if(key!==oldKey){
  let i=0;view.querySelectorAll('.z-group > .z-row,.z-metric-card,.os-card,.os-chat-bubble,.message-preview,.os-photo-cell').forEach(x=>{
   if(i>=12)return;x.classList.add('zm-stagger-target');x.style.animationDelay=`${ms(Math.min(i,9)*23+20)}ms`;i++;
  });
 }
};
const prevPage=setPage;
setPage=function(n){const before=state.page;prevPage(n);if(before!==state.page&&isMotion())replayClass(doc.getElementById('homePages'),'zm-swiped',510)};
const prevToast=toast;
toast=function(msg){const el=doc.getElementById('toast');el?.classList.remove('show');if(el)void el.offsetWidth;prevToast(msg)};
const prevAction=osAction;
osAction=function(action,val,target){
 if(action==='camera-capture'){
  const preview=doc.querySelector('.os-camera-preview');if(preview)replayClass(preview,'zm-shutter-flash',340);
 }
 if(['chat-send','message-send','todo-add','calendar-add','phone-call','timer-start'].includes(action))haptic('medium');
 return prevAction(action,val,target);
};
// Slider haptics are deliberately throttled to avoid constant vibration.
let bubbleTimer=0;
function rangeFill(slider,show){const min=Number(slider.min||0),max=Number(slider.max||100),value=Number(slider.value||0);
 const ratio=Math.max(0,Math.min(1,(value-min)/(max-min||1)));
 slider.style.setProperty('--zm-fill',(ratio*100).toFixed(1)+'%');
 const card=slider.closest('.z-slider');if(!card)return;
 let bubble=card.querySelector('.zm-range-bubble');if(!bubble){bubble=doc.createElement('span');bubble.className='zm-range-bubble';bubble.setAttribute('aria-hidden','true');card.appendChild(bubble)}
 const box=slider.getBoundingClientRect(),parent=card.getBoundingClientRect();
 const x=Math.max(30,Math.min(parent.width-30,box.left-parent.left+ratio*box.width));
 bubble.style.setProperty('--zm-bubble-left',x+'px');bubble.textContent=Math.round(value)+'%';
 if(show){bubble.classList.add('show');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>bubble.classList.remove('show'),750)}
}
doc.addEventListener('input',e=>{if(e.target.matches('.z-slider input[type="range"]'))rangeFill(e.target,true)},{passive:true,capture:true});
doc.addEventListener('pointerdown',e=>{const t=e.target;if(t?.matches?.('.z-slider input[type="range"]'))rangeFill(t,true)},{passive:true,capture:true});
// A flash follows the action-sheet exit before the underlying view animates.
screen.addEventListener('click',e=>{
 const sheet=e.target.closest('.zx-sheet-backdrop');if(!sheet)return;
 if(!(e.target===sheet||e.target.closest('[data-zx-sheet-close],[data-zx-sheet-index]')))return;
 if(!isMotion())return;
 const clone=sheet.cloneNode(true);clone.classList.add('zm-dismiss');clone.setAttribute('aria-hidden','true');clone.style.pointerEvents='none';screen.appendChild(clone);setTimeout(()=>clone.remove(),ms(330)+25);
},true);
// One-time page swipe micro-feedback, no perpetual DOM observers.
const wizard=doc.getElementById('zxOnboarding');
if(wizard){wizard.addEventListener('click',e=>{
 const direction=e.target.closest('[data-zx-step]');if(!direction||!isMotion())return;
 const dir=direction.dataset.zxStep;if(dir!=='next'&&dir!=='back')return;
 const existing=wizard.querySelector('.zx-step-shell');if(!existing)return;
 const ghost=existing.cloneNode(true);ghost.classList.add('zm-wizard-out');ghost.setAttribute('aria-hidden','true');
 ghost.querySelectorAll('button,input').forEach(x=>{x.disabled=true;x.tabIndex=-1});
 queueMicrotask(()=>{if(wizard.hidden)return;wizard.classList.toggle('zm-wizard-back',dir==='back');wizard.appendChild(ghost);setTimeout(()=>ghost.remove(),ms(335)+30)});
},true)}
// Motion & Haptics panel, visually aligned with HyperOS-inspired Settings.
const oldMarkup=osSettingsMarkup;
osSettingsMarkup=function(section='root'){
 const page=OS.settingsStack.at(-1)||section||'root';
 if(page==='motion'){
  const options=[['expressive',tr('Expressive','灵动'),tr('Full spring dynamics, spatial app launches, layered details.','完整弹性转场、空间启动与层叠细节。')],
                 ['balanced',tr('Balanced','均衡'),tr('Quick and smooth, with less overshoot.','快速流畅，减少回弹幅度。')],
                 ['calm',tr('Calm','舒缓'),tr('Gentle, shorter motion for everyday use.','轻柔简短，适合日常使用。')],
                 ['off',tr('Off','关闭'),tr('Minimal animation and instant navigation.','减少动画，快速切换页面。')]];
  return `<section class="ios-settings z-settings zm-motion-page" data-os-settings-route="motion">
   <h1 class="z-heading">${tr('Motion & Haptics','动画与触感')}</h1>
   <p class="z-page-intro">${tr('A connected motion language for ZorixOS. Designed for clarity, responsiveness, and tactile detail.','统一的 ZorixOS 动效语言，兼顾清晰、响应速度和触控质感。')}</p>
   <div class="zm-lab-hero" id="zmLabHero"><div class="zm-lab-orb">${glyph('appearance',48)}</div></div>
   <div class="zm-lab-title">${tr('Motion intensity','动画强度')}</div>
   <div class="z-group">${options.map(([key,title,description])=>`<button class="zm-motion-choice ${engine.mode===key?'selected':''}" type="button" data-zm-select="${key}"><span class="zm-choice-marker">${engine.mode===key?glyph('check',17):''}</span><span class="zm-choice-text">${title}<small>${description}</small></span></button>`).join('')}</div>
   <div class="zm-lab-title">${tr('Touch feedback','触控反馈')}</div>
   <div class="z-group"><div class="zm-switch-line"><span class="zm-line-label">${tr('Haptic taps','按键触感')}<small>${tr('Brief response for major actions, when supported by your device.','设备支持时为关键操作提供短促反馈。')}</small></span><button type="button" role="switch" aria-checked="${engine.haptic}" aria-label="${tr('Haptics','触感')}" class="ios-switch ${engine.haptic?'on':''}" data-zm-toggle="haptic"></button></div>
   <div class="zm-switch-line"><span class="zm-line-label">${tr('Reduce motion','减少动画')}<small>${tr('Honors your accessibility preference.','尊重你的无障碍偏好设置。')}</small></span><button role="switch" type="button" aria-checked="${!!OS_PREF.reduceMotion}" aria-label="${tr('Reduce motion','减少动画')}" class="ios-switch ${OS_PREF.reduceMotion?'on':''}" data-zm-toggle="reduce"></button></div></div>
   <div class="zm-lab-quick"><button type="button" data-zm-action="preview">${tr('Preview motion','预览动效')}</button><button type="button" data-zm-action="island">${tr('Dynamic Island','灵动岛')}</button></div>
   <p class="zm-lab-footer">${tr('Transforms and opacity are accelerated when possible. Android controls critical system interruptions.','尽可能使用 GPU 加速的位移和透明度动画。重要系统通知仍由 Android 管理。')}</p>
   </section>`;
 }
 let html=oldMarkup(section);
 if(page==='root'||page==='general'||page==='appearance'){
  const row=`<div class="z-section-title">${tr('MOTION ENGINE','动画引擎')}</div><div class="z-group"><button class="ios-row z-row" type="button" data-os-setting="motion"><span class="z-symbol" style="--z-bg:#e8edff;--z-fg:#526ee7">${glyph('appearance',19)}</span><span class="z-text"><b>${tr('Motion & Haptics','动画与触感')}</b><small>${tr('Spatial animations and responsive feedback','空间动画与即时反馈')}</small></span><span class="z-next">${glyph('next',15)}</span></button></div>`;
  html=html.replace(/<\/div>\s*$/,row+'</div>');
 }
 return html;
};
doc.addEventListener('click',e=>{
 const option=e.target.closest('[data-zm-select]');
 if(option){e.preventDefault();e.stopImmediatePropagation();engine.mode=option.dataset.zmSelect;apply();osRenderApp();const hero=doc.getElementById('zmLabHero');replayClass(hero,'zm-previewing',850);haptic('soft');return}
 const toggle=e.target.closest('[data-zm-toggle]');
 if(toggle){e.preventDefault();e.stopImmediatePropagation();
  if(toggle.dataset.zmToggle==='haptic'){engine.haptic=!engine.haptic;apply()}
  else {osSetPref('reduceMotion',!OS_PREF.reduceMotion);apply()}
  osRenderApp();haptic('soft');return;
 }
 const action=e.target.closest('[data-zm-action]');if(action){e.preventDefault();e.stopImmediatePropagation();
  if(action.dataset.zmAction==='preview'){replayClass(doc.getElementById('zmLabHero'),'zm-previewing',850);haptic('medium')}
  if(action.dataset.zmAction==='island')window.ZorixV2.showIsland(tr('Motion ready','动效已就绪'),tr('ZorixOS Liquid Experience','ZorixOS 灵动体验'),1900);
  return;
 }
},true);
const prevSetPref=osSetPref;
osSetPref=function(k,v,redraw=true){const r=prevSetPref(k,v,redraw);if(k==='reduceMotion'||k==='lowPower')apply();return r};
// Keep reduced-motion changes in sync with system accessibility preferences.
try{matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',apply)}catch(_){}

// Crossfade a wallpaper snapshot so changing a gradient never pops abruptly.
const prevWallpaper=setWallpaper;
setWallpaper=function(name){
 const old=doc.getElementById('wallpaper');
 if(isMotion()&&old&&name!==state.wallpaper){
  const ghost=old.cloneNode(true);ghost.removeAttribute('id');ghost.classList.add('zm-wallpaper-ghost');
  ghost.setAttribute('aria-hidden','true');screen.appendChild(ghost);
  ghost.addEventListener('animationend',()=>ghost.remove(),{once:true});setTimeout(()=>ghost.remove(),ms(810)+60);
 }
 return prevWallpaper(name);
};
// Keep visual music feedback tied to real play/next actions rather than a constant animation loop.
const prevPlaying=setPlaying;
setPlaying=function(value){const result=prevPlaying(value);screen.classList.toggle('zm-music-playing',!!state.playing);return result};
const prevNextTrack=nextTrack;
nextTrack=function(direction){const result=prevNextTrack(direction);const art=doc.querySelector('.music-album');replayClass(art,'zm-track-change',590);return result};
// Contextual ripples are clipped to rows, never used over the iOS artwork.
screen.addEventListener('pointerdown',e=>{
 if(!isMotion())return;
 const target=e.target.closest('.z-group .z-row,.os-cell,#controlCenter .cc-quick button,.zx-primary,.zm-motion-choice');
 if(!target||target.matches('input')||!target.isConnected)return;
 const rect=target.getBoundingClientRect();const ripple=doc.createElement('span');ripple.className='zm-tap-ripple';
 ripple.style.setProperty('--zm-ripple-x',(e.clientX-rect.left)+'px');ripple.style.setProperty('--zm-ripple-y',(e.clientY-rect.top)+'px');
 target.appendChild(ripple);setTimeout(()=>ripple.remove(),ms(610)+30);
},{passive:true,capture:true});
// Natural downward dismiss gesture, starting at the sheet's title so list scrolling remains usable.
let drag=null;
screen.addEventListener('pointerdown',e=>{
 const header=e.target.closest('.zx-sheet h3');if(!header||!isMotion())return;
 const sheet=header.closest('.zx-sheet');if(!sheet)return;
 drag={sheet,y:e.clientY,dy:0};sheet.classList.add('zm-sheet-drag');
},{passive:true,capture:true});
screen.addEventListener('pointermove',e=>{
 if(!drag)return;drag.dy=Math.max(0,Math.min(240,e.clientY-drag.y));drag.sheet.style.transform='translate3d(0,'+drag.dy+'px,0)';
},{passive:true,capture:true});
screen.addEventListener('pointerup',()=>{
 if(!drag)return;const d=drag;drag=null;d.sheet.classList.remove('zm-sheet-drag');
 if(d.dy>75){const backdrop=d.sheet.closest('.zx-sheet-backdrop');
  if(backdrop){const ghost=backdrop.cloneNode(true);ghost.classList.add('zm-dismiss');ghost.style.pointerEvents='none';screen.appendChild(ghost);setTimeout(()=>ghost.remove(),ms(330)+40)}
  window.ZorixV2.closeSheet();haptic('soft');
 }else{d.sheet.classList.add('zm-sheet-return');d.sheet.style.transform='';setTimeout(()=>d.sheet.classList.remove('zm-sheet-return'),ms(350)+20)}
},{passive:true,capture:true});
screen.addEventListener('pointercancel',()=>{if(drag){drag.sheet.style.transform='';drag.sheet.classList.remove('zm-sheet-drag');drag=null}},{passive:true,capture:true});

window.ZorixMotion={get mode(){return engine.mode},get haptics(){return engine.haptic},setMode(v){if(['expressive','balanced','calm','off'].includes(v)){engine.mode=v;apply()}},preview(){replayClass(doc.getElementById('zmLabHero'),'zm-previewing',850)},get reduced(){return reduced()}};
})();
