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
   /* Candy cane diagonal stripes, clipped to the existing festive lettering. */
   color:#fff8f3!important;
   background:repeating-linear-gradient(135deg,
     #fffaf4 0px,#fffaf4 8px,
     #b91c2c 8px,#d6273d 16px,
     #fffaf4 16px,#fffaf4 24px)!important;
   background-clip:text!important;-webkit-background-clip:text!important;
   -webkit-text-fill-color:transparent!important;
   filter:drop-shadow(0 2px 2px rgba(5,19,32,.95))
     drop-shadow(0 3px 5px rgba(0,0,0,.55));
   text-shadow:none!important;
   animation:none!important;
 }
 body.christmas-theme .header .title-urgencias{
   font-size:clamp(.72rem,1.1vw,.93rem)!important;
   letter-spacing:.19em!important;color:#fffafa!important;
   background:repeating-linear-gradient(135deg,
     #fffafa 0px,#fffafa 5px,#bb2031 5px,#e03548 10px,
     #fffafa 10px,#fffafa 15px)!important;
   background-clip:text!important;-webkit-background-clip:text!important;
   -webkit-text-fill-color:transparent!important;
   filter:drop-shadow(0 1px 2px #0e1729) drop-shadow(0 2px 4px #0008);
   text-shadow:none!important;
 }
 body.christmas-theme #plexusCanvas{display:none!important;}
 body.christmas-theme .desktop-waves-bg .waves{display:none!important;}
 body.christmas-theme .desktop-waves-bg{
   isolation:isolate;overflow:hidden;
   /* Cold ambient light is restricted to the snow landscape, not the banner. */
   background:linear-gradient(180deg,
     rgba(36,91,143,0) 0%,
     rgba(100,160,208,.11) 40%,
     rgba(171,214,243,.19) 76%,
     rgba(234,248,255,.16) 100%)!important;
 }
 body.christmas-theme .desktop-waves-bg::before,
 body.christmas-theme .desktop-waves-bg::after{content:none!important;}
 body.christmas-theme #mainAppContainer{
   background-image:linear-gradient(rgba(10,16,24,.86),rgba(10,16,24,.86)),
     url('./assets/themes/christmas/tile.webp');
   background-size:auto,175px 175px;
   background-repeat:repeat;
 }
 /* Pine-green surfaces pair with the wine-red festive header;
    individual palette selections remain available in Appearance. */
 body.christmas-theme .header{
   border-bottom-color:rgba(161,39,52,.6);
 }
 body.christmas-theme .christmas-winter-glow{
   box-shadow:inset 0 -8px 22px rgba(3,49,30,.25);
 }
 .christmas-winter-glow{position:absolute;inset:0;z-index:0;pointer-events:none;
   background:linear-gradient(90deg,rgba(109,13,24,.67),rgba(19,58,34,.48) 48%,rgba(126,16,31,.66));}
 .christmas-snow{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.85;}
 .christmas-snow-mountains{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;
   filter:drop-shadow(0 -2px 7px rgba(202,230,249,.13));}
 .christmas-snow-mountains svg{position:absolute;inset:0;width:100%;height:100%;display:block;}
 .christmas-lights{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;}
 .christmas-light-cable{display:none;}
 .christmas-pine{position:absolute;top:3px;width:22px;height:12px;pointer-events:none;opacity:.73;
   transform-origin:top center;
   animation:christmas-pine-sway 5.8s ease-in-out infinite;
   background:repeating-linear-gradient(115deg,#590c18 0 3px,#991b2a 3px 6px,#b91c32 6px 9px);
   clip-path:polygon(0 55%,12% 7%,32% 38%,52% 0,74% 42%,91% 13%,100% 55%,78% 100%,55% 64%,32% 100%,12% 66%);}
 .christmas-bulb{position:absolute;top:12px;width:var(--bulb-size,13px);height:calc(var(--bulb-size,13px)*1.31);
   padding:0;pointer-events:auto;border:1px solid rgba(255,255,255,.24);
   border-radius:50% 50% 48% 48%;cursor:pointer;touch-action:manipulation;
   background:rgba(255,255,255,.07);
   transition:opacity .24s,filter .24s,box-shadow .24s;}
 .christmas-bulb{transform-origin:50% 0;}
 .christmas-bulb.is-idle{opacity:.42;box-shadow:0 0 3px rgba(255,255,255,.08);
   background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.28);
   cursor:default;pointer-events:none;animation:christmas-sway 5.2s ease-in-out infinite;
   animation-delay:var(--sway-delay,0s);}
 .christmas-bulb.is-lit{background:var(--bulb-color);box-shadow:0 0 8px 2px var(--bulb-glow);
   animation:christmas-sway 5.2s ease-in-out infinite,
     christmas-glimmer 2.35s ease-in-out infinite,
     christmas-pulse 7.4s ease-in-out infinite;
   animation-delay:var(--sway-delay,0s),var(--glow-delay,0s),var(--pulse-delay,0s);}
 .christmas-bulb::before{content:'';position:absolute;top:-4px;left:30%;width:40%;height:4px;
   background:#aaa27e;border-radius:1px;}
 .christmas-bulb:focus-visible{outline:2px solid white;outline-offset:3px;}
 .christmas-bulb.is-lit.is-off{opacity:.16;filter:grayscale(1);animation:none;box-shadow:none;}
 .christmas-spark{position:absolute;width:5px;height:5px;border-radius:1px;pointer-events:none;
   animation:christmas-spark .65s ease-out forwards;}
 @keyframes christmas-spark{from{opacity:1;transform:translate(0,0) rotate(0)}
   to{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(240deg)}}
 @keyframes christmas-glimmer{0%,100%{opacity:.85}
   10%{opacity:1} 19%{opacity:.54} 24%{opacity:1}
   48%{opacity:.92} 52%{opacity:.48} 59%{opacity:1}
   75%{opacity:.74} 83%{opacity:1}}
 @keyframes christmas-sway{0%,100%{transform:rotate(-1.8deg)}
   50%{transform:rotate(1.8deg)}}
 @keyframes christmas-pine-sway{0%,100%{transform:rotate(-1deg)}
   50%{transform:rotate(1deg)}}
 @keyframes christmas-pulse{0%,100%{filter:brightness(.85);
   box-shadow:0 0 6px 1px var(--bulb-glow);}
   12%{filter:brightness(1.32);box-shadow:0 0 13px 4px var(--bulb-glow);}
   17%{filter:brightness(.72);box-shadow:0 0 5px 1px var(--bulb-glow);}
   23%{filter:brightness(1.48);box-shadow:0 0 17px 5px var(--bulb-glow),0 0 27px 8px var(--bulb-glow);}
   39%,68%{filter:brightness(.88);box-shadow:0 0 6px 1px var(--bulb-glow);}
   76%{filter:brightness(1.36);box-shadow:0 0 15px 5px var(--bulb-glow);}
   84%{filter:brightness(1.04);box-shadow:0 0 10px 3px var(--bulb-glow);}}
 .christmas-fireworks{position:fixed;inset:0;width:100vw;height:100vh;z-index:80;pointer-events:none;}
 @media(max-width:767px){.christmas-lights{display:none!important;}
   body.christmas-theme .header .title-censo{font-size:2.1rem!important;}}
 @media(prefers-reduced-motion:reduce){.christmas-bulb,.christmas-pine{animation:none!important;}
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
  getStatus:()=>({revision:'christmas-v7',lights:lights.getStatus(),snow:snow.getStatus(),mountains:mountains.getStatus(),
    fireworks:fireworks.getStatus()}),
  dispose(){
   if(disposed)return;
   disposed=true;lights.dispose();snow.dispose();mountains.dispose();fireworks.dispose();
   glow.remove();style.remove();document.body.classList.remove('christmas-theme');
   app.initPlexus?.();
  }
 };
}
