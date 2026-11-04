/* Seasonal Engine 2.0 Christmas renderer: visuals only, no Firestore. */
export function initChristmasTheme(app,{scope,config,createSnowfall,createSnowMountains,createChristmasLights,createChristmasFireworks}){
 const header=document.querySelector('.header');
 if(!header)return null;
 const style=document.createElement('style');
 style.id='christmas-theme-css';
 style.textContent=`
 @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap');
 body.christmas-theme .header{isolation:isolate;}
 body.christmas-theme .header::before{display:none!important;}
 body.christmas-theme .header .header-top{position:relative;z-index:5;pointer-events:none;}
 body.christmas-theme .header .header-left,
 body.christmas-theme .header .header-right{pointer-events:none;}
 body.christmas-theme .header .header-top button,
 body.christmas-theme .header .header-top a,
 body.christmas-theme .header .header-top input{pointer-events:auto;}
 body.christmas-theme .header .main-title{
   position:absolute!important;left:50%!important;top:50%!important;
   transform:translate(-50%,-50%)!important;margin:0!important;
   z-index:6!important;pointer-events:none;
   width:max-content;max-width:calc(100% - 95px);text-align:center;white-space:nowrap;
 }
 body.christmas-theme .header .title-censo{
   font-family:'Mountains of Christmas',Georgia,serif!important;
   font-size:clamp(2.1rem,3.4vw,3.25rem)!important;
   font-weight:700!important;line-height:1.04!important;letter-spacing:.035em!important;
   padding:0 8px 3px!important;
   color:#ffe0a1!important;background:none!important;
   -webkit-text-fill-color:#ffe0a1!important;
   text-shadow:0 2px 2px #071a18,0 4px 11px #0009,0 0 10px #f5bc6655;
   animation:none!important;
 }
 body.christmas-theme .header .title-urgencias{
   font-size:clamp(.72rem,1.1vw,.93rem)!important;
   letter-spacing:.19em!important;color:#f1f5f9!important;
   text-shadow:0 2px 7px #000c;
 }
 body.christmas-theme #plexusCanvas{display:none!important;}
 body.christmas-theme .desktop-waves-bg .waves{display:none!important;}
 body.christmas-theme .desktop-waves-bg{isolation:isolate;overflow:hidden;}
 body.christmas-theme .desktop-waves-bg::before,
 body.christmas-theme .desktop-waves-bg::after{content:none!important;}
 .christmas-winter-glow{position:absolute;inset:0;z-index:0;pointer-events:none;
   background:linear-gradient(90deg,rgba(12,79,53,.45),rgba(21,40,65,.24) 48%,rgba(94,21,35,.48));}
 .christmas-snow{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.85;}
 .christmas-snow-mountains{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;}
 .christmas-snow-mountains svg{position:absolute;inset:0;width:100%;height:100%;display:block;}
 .christmas-lights{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;}
 .christmas-light-cable{display:none;}
 .christmas-pine{position:absolute;top:3px;width:34px;height:13px;pointer-events:none;
   background:repeating-linear-gradient(115deg,#194532 0 3px,#307a53 3px 6px,#164a32 6px 9px);
   clip-path:polygon(0 55%,12% 7%,32% 38%,52% 0,74% 42%,91% 13%,100% 55%,78% 100%,55% 64%,32% 100%,12% 66%);}
 .christmas-bulb{position:absolute;top:12px;width:13px;height:17px;padding:0;pointer-events:auto;
   border:1px solid rgba(255,255,255,.28);border-radius:50% 50% 48% 48%;
   background:var(--bulb-color);box-shadow:0 0 8px 3px var(--bulb-glow);
   cursor:pointer;touch-action:manipulation;
   animation:christmas-glimmer 4.2s ease-in-out infinite alternate;
   transition:opacity .2s,filter .2s;}
 .christmas-bulb::before{content:'';position:absolute;top:-4px;left:3px;width:5px;height:4px;
   background:#aaa27e;border-radius:1px;}
 .christmas-bulb:focus-visible{outline:2px solid white;outline-offset:3px;}
 .christmas-bulb.is-off{opacity:.15;filter:grayscale(1);animation:none;box-shadow:none;}
 .christmas-spark{position:absolute;width:5px;height:5px;border-radius:1px;pointer-events:none;
   animation:christmas-spark .65s ease-out forwards;}
 @keyframes christmas-spark{from{opacity:1;transform:translate(0,0) rotate(0)}
   to{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(240deg)}}
 @keyframes christmas-glimmer{0%,100%{filter:brightness(.89);opacity:.88}
   50%{filter:brightness(1.09);opacity:1}}
 .christmas-fireworks{position:fixed;inset:0;width:100vw;height:100vh;z-index:80;pointer-events:none;}
 @media(max-width:767px){.christmas-lights{display:none!important;}
   body.christmas-theme .header .title-censo{font-size:2.1rem!important;}}
 @media(prefers-reduced-motion:reduce){.christmas-bulb{animation:none!important;}
   .christmas-spark,.christmas-snow,.christmas-fireworks{display:none!important;}}
 @media print{.christmas-winter-glow,.christmas-lights,.christmas-snow,.christmas-snow-mountains,.christmas-fireworks{display:none!important;}}
 `;
 document.head.appendChild(style);
 const glow=document.createElement('div');glow.className='christmas-winter-glow';
 glow.setAttribute('aria-hidden','true');header.prepend(glow);
 document.body.classList.add('christmas-theme');
 const lights=createChristmasLights(header);
 const snowHost=document.querySelector('.desktop-waves-bg');
 const snow=createSnowfall(snowHost);
 const mountains=createSnowMountains(snowHost);
 const fireworks=createChristmasFireworks(config.celebration);
 let disposed=false;
 return {
  syncPatients(patients){lights.syncPatients(patients);},
  salute:options=>fireworks.salute(options),
  getStatus:()=>({revision:'christmas-v3',lights:lights.getStatus(),snow:snow.getStatus(),mountains:mountains.getStatus(),
    fireworks:fireworks.getStatus()}),
  dispose(){
   if(disposed)return;
   disposed=true;lights.dispose();snow.dispose();mountains.dispose();fireworks.dispose();
   glow.remove();style.remove();document.body.classList.remove('christmas-theme');
   app.initPlexus?.();
  }
 };
}
