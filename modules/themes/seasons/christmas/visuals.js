/* Seasonal Engine 2.0 Christmas renderer: visuals only, no Firestore. */
export function initChristmasTheme(app,{scope,config,createSnowfall,createChristmasLights,createChristmasFireworks}){
 const header=document.querySelector('.header');
 if(!header)return null;
 const style=document.createElement('style');
 style.id='christmas-theme-css';
 style.textContent=`
 body.christmas-theme .header{isolation:isolate;}
 body.christmas-theme .header::before{display:none!important;}
 body.christmas-theme .header .main-title{position:relative;z-index:2;}
 body.christmas-theme #plexusCanvas{display:none!important;}
 body.christmas-theme .desktop-waves-bg .waves{display:none!important;}
 body.christmas-theme .desktop-waves-bg{isolation:isolate;overflow:hidden;}
 body.christmas-theme .desktop-waves-bg::before,
 body.christmas-theme .desktop-waves-bg::after{content:none!important;}
 .christmas-winter-glow{position:absolute;inset:0;z-index:0;pointer-events:none;
   background:linear-gradient(90deg,rgba(12,79,53,.45),rgba(21,40,65,.24) 48%,rgba(94,21,35,.48));}
 .christmas-snow{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.85;}
 .christmas-lights{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;}
 .christmas-pine{position:absolute;top:3px;width:34px;height:13px;pointer-events:none;
   background:repeating-linear-gradient(115deg,#194532 0 3px,#307a53 3px 6px,#164a32 6px 9px);
   clip-path:polygon(0 55%,12% 7%,32% 38%,52% 0,74% 42%,91% 13%,100% 55%,78% 100%,55% 64%,32% 100%,12% 66%);}
 .christmas-bulb{position:absolute;top:12px;width:13px;height:17px;padding:0;pointer-events:auto;
   border:1px solid rgba(255,255,255,.28);border-radius:50% 50% 48% 48%;
   background:var(--bulb-color);box-shadow:0 0 8px 3px var(--bulb-glow);
   cursor:pointer;touch-action:manipulation;
   animation:christmas-glimmer 2.7s ease-in-out infinite alternate;
   transition:opacity .2s,filter .2s;}
 .christmas-bulb::before{content:'';position:absolute;top:-4px;left:3px;width:5px;height:4px;
   background:#aaa27e;border-radius:1px;}
 .christmas-bulb:focus-visible{outline:2px solid white;outline-offset:3px;}
 .christmas-bulb.is-off{opacity:.15;filter:grayscale(1);animation:none;box-shadow:none;}
 .christmas-spark{position:absolute;width:5px;height:5px;border-radius:1px;pointer-events:none;
   animation:christmas-spark .65s ease-out forwards;}
 @keyframes christmas-spark{from{opacity:1;transform:translate(0,0) rotate(0)}
   to{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(240deg)}}
 @keyframes christmas-glimmer{from{filter:brightness(.76)}to{filter:brightness(1.1)}}
 .christmas-fireworks{position:fixed;inset:0;width:100vw;height:100vh;z-index:80;pointer-events:none;}
 @media(max-width:767px){.christmas-lights{display:none!important;}}
 @media(prefers-reduced-motion:reduce){.christmas-bulb{animation:none!important;}
   .christmas-spark,.christmas-snow,.christmas-fireworks{display:none!important;}}
 @media print{.christmas-winter-glow,.christmas-lights,.christmas-snow,.christmas-fireworks{display:none!important;}}
 `;
 document.head.appendChild(style);
 const glow=document.createElement('div');glow.className='christmas-winter-glow';
 glow.setAttribute('aria-hidden','true');header.prepend(glow);
 document.body.classList.add('christmas-theme');
 const lights=createChristmasLights(header);
 const snow=createSnowfall(document.querySelector('.desktop-waves-bg'));
 const fireworks=createChristmasFireworks(config.celebration);
 let disposed=false;
 return {
  syncPatients(){},
  salute:options=>fireworks.salute(options),
  getStatus:()=>({revision:'christmas-v1',lights:lights.getStatus(),snow:snow.getStatus(),
    fireworks:fireworks.getStatus()}),
  dispose(){
   if(disposed)return;
   disposed=true;lights.dispose();snow.dispose();fireworks.dispose();
   glow.remove();style.remove();document.body.classList.remove('christmas-theme');
   app.initPlexus?.();
  }
 };
}
