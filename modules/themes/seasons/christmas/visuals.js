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
   color:#fff3cf!important;
   background:none!important;
   background-clip:border-box!important;-webkit-background-clip:border-box!important;
   -webkit-text-fill-color:currentColor!important;
   filter:drop-shadow(0 2px 3px rgba(0,0,0,.6));
   text-shadow:none!important;
   animation:none!important;
 }
 body.christmas-theme .header .title-urgencias{
   font-size:clamp(.72rem,1.1vw,.93rem)!important;
   letter-spacing:.19em!important;color:#f2c86d!important;
   background:none!important;
   background-clip:border-box!important;-webkit-background-clip:border-box!important;
   -webkit-text-fill-color:currentColor!important;
   filter:drop-shadow(0 1px 2px rgba(0,0,0,.65));
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
 .christmas-garland{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;}
 .christmas-garland path{fill:none;stroke-linecap:round;stroke-linejoin:round;}
 .christmas-garland-edge{stroke:#092e20;stroke-width:8;}
 .christmas-garland-green{stroke:#22613c;stroke-width:5.5;}
 .christmas-garland .christmas-garland-leaves-dark{fill:#23603a;stroke:#133e2a;stroke-width:.45;}
 .christmas-garland .christmas-garland-leaves-light{fill:#428551;stroke:#235b36;stroke-width:.45;}
 .christmas-garland-veins{stroke:#9cc77c;stroke-width:.45;opacity:.55;}
 .christmas-bulb{position:absolute;top:12px;width:var(--bulb-size,13px);height:calc(var(--bulb-size,13px)*1.31);
   padding:0;pointer-events:auto;border:1px solid rgba(255,255,255,.24);
   border-radius:50% 50% 48% 48%;cursor:pointer;touch-action:manipulation;
   background:rgba(255,255,255,.07);
   transition:opacity .24s,filter .24s,box-shadow .24s,background .18s,border-color .18s;}
 .christmas-bulb{transform-origin:50% 0;}
 .christmas-bulb.is-idle{opacity:1;
   background:linear-gradient(110deg,rgba(255,255,255,.16),transparent 36%,transparent 72%,rgba(255,255,255,.07));
   border-color:rgba(220,239,248,.48);
   box-shadow:inset 1px 0 1px rgba(255,255,255,.2),inset -1px -1px 1px rgba(255,255,255,.07);
   animation:christmas-sway 5.2s ease-in-out infinite;
   animation-delay:var(--sway-delay,0s);}
 /* Patient lights keep their colored energy pulses. */
 .christmas-bulb.is-lit{opacity:1;border-color:rgba(255,255,255,.8);
   background:var(--bulb-color);filter:brightness(1.08) saturate(1.4);
   box-shadow:0 0 10px 3px var(--bulb-glow),0 0 21px 5px var(--bulb-glow);
   animation:christmas-sway 5.2s ease-in-out infinite,
     christmas-glimmer 1.6s ease-in-out infinite,
     christmas-pulse .95s ease-in-out infinite;
   animation-delay:var(--sway-delay,0s),var(--glow-delay,0s),var(--pulse-delay,0s);}
 /* Pointer energy is independent of the patient count and colored pulses. */
 .christmas-bulb.is-idle.has-pointer-energy:not(.is-off){animation:none;}
 .christmas-bulb.has-pointer-energy:not(.is-off)::after{
   inset:-1px;width:auto;height:auto;transform:none;border-radius:inherit;
   background:var(--pointer-tint);opacity:var(--pointer-strength,0);
   box-shadow:0 0 9px 3px var(--pointer-glow),
     0 0 var(--pointer-spread,20px) 6px var(--pointer-halo);
 }
 .christmas-bulb::before{content:'';position:absolute;top:-4px;left:30%;width:40%;height:4px;
   background:#aaa27e;border-radius:1px;}
 .christmas-bulb::after{content:'';position:absolute;left:20%;top:18%;width:18%;height:40%;
   border-radius:50%;background:rgba(255,255,255,.52);transform:rotate(12deg);pointer-events:none;}
 .christmas-bulb:focus-visible{outline:2px solid white;outline-offset:3px;}
 .christmas-bulb.is-off{opacity:.38;filter:grayscale(1);animation:none;box-shadow:none;
   background:transparent;border-color:transparent;}
 .christmas-bulb.is-off::after{background:transparent;transform:none;border-radius:0;content:'';position:absolute;left:31%;top:8%;width:38%;height:30%;
   border:1px solid #d7c4a0;clip-path:polygon(0 0,100% 0,100% 65%,65% 100%,45% 55%,0 90%);}
 .christmas-glass-shard,.christmas-electric-spark,.christmas-break-flash{
   position:absolute;pointer-events:none;}
 .christmas-glass-shard{width:var(--shard-width);height:var(--shard-height);
   background:linear-gradient(125deg,#fff9,var(--fragment-color) 45%,#fff2);
   border-left:1px solid #fffb;clip-path:polygon(0 0,100% 20%,65% 100%,18% 70%);
   animation:christmas-glass-break .8s linear forwards;}
 .christmas-electric-spark{width:9px;height:1px;background:#fff5cf;box-shadow:0 0 3px #ffd270;
   transform-origin:0 50%;animation:christmas-electric-break .22s ease-out forwards;}
 .christmas-break-flash{width:22px;height:22px;border-radius:50%;
   background:radial-gradient(circle,#fff 0 5%,#ffe5a9b0 16%,transparent 65%);
   animation:christmas-break-flash .18s ease-out forwards;}
 @keyframes christmas-glass-break{
   0%{opacity:1;transform:translate(-50%,-50%) rotate(0)}
   35%{opacity:.9;transform:translate(calc(-50% + var(--dx)*.55),calc(-50% + var(--dy) - 7px)) rotate(calc(var(--spin)*.35))}
   100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy) + var(--fall))) rotate(var(--spin))}}
 @keyframes christmas-electric-break{
   from{opacity:1;transform:rotate(var(--angle)) translateX(2px) scaleX(.5)}
   to{opacity:0;transform:rotate(var(--angle)) translateX(var(--reach)) scaleX(.1)}}
 @keyframes christmas-break-flash{
   from{opacity:.9;transform:translate(-50%,-50%) scale(.3)}
   to{opacity:0;transform:translate(-50%,-50%) scale(1.4)}}
 @keyframes christmas-glimmer{0%,100%{opacity:.96}
   10%,24%,59%,83%{opacity:1} 19%,52%{opacity:.88}
   48%{opacity:.98} 75%{opacity:.93}}
 @keyframes christmas-sway{0%,100%{transform:rotate(-1.8deg)}
   50%{transform:rotate(1.8deg)}}
 @keyframes christmas-pulse{0%,100%{filter:brightness(1.06) saturate(1.4);
   box-shadow:0 0 9px 3px var(--bulb-glow),0 0 18px 4px var(--bulb-glow);}
   12%{filter:brightness(1.27) saturate(1.55);
     box-shadow:0 0 15px 4px var(--bulb-glow),0 0 25px 7px var(--bulb-glow);}
   17%{filter:brightness(1.02) saturate(1.4);
     box-shadow:0 0 8px 2px var(--bulb-glow),0 0 16px 4px var(--bulb-glow);}
   23%{filter:brightness(1.4) saturate(1.65);
     box-shadow:0 0 18px 5px var(--bulb-glow),0 0 32px 9px var(--bulb-glow);}
   39%,68%{filter:brightness(1.08) saturate(1.45);
     box-shadow:0 0 10px 3px var(--bulb-glow),0 0 20px 5px var(--bulb-glow);}
   76%{filter:brightness(1.32) saturate(1.6);
     box-shadow:0 0 17px 5px var(--bulb-glow),0 0 29px 8px var(--bulb-glow);}
   84%{filter:brightness(1.16) saturate(1.5);
     box-shadow:0 0 12px 3px var(--bulb-glow),0 0 23px 6px var(--bulb-glow);}}
 .christmas-fireworks{position:fixed;inset:0;width:100vw;height:100vh;z-index:80;pointer-events:none;}
 @media(max-width:767px){.christmas-lights{display:none!important;}
   body.christmas-theme .header .title-censo{font-size:2.1rem!important;}}
 @media(prefers-reduced-motion:reduce){.christmas-bulb{animation:none!important;}
   .christmas-glass-shard,.christmas-electric-spark,.christmas-break-flash,.christmas-snow,.christmas-fireworks{display:none!important;}}
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
  getStatus:()=>({revision:'christmas-v11',lights:lights.getStatus(),snow:snow.getStatus(),mountains:mountains.getStatus(),
    fireworks:fireworks.getStatus()}),
  dispose(){
   if(disposed)return;
   disposed=true;lights.dispose();snow.dispose();mountains.dispose();fireworks.dispose();
   glow.remove();style.remove();document.body.classList.remove('christmas-theme');
   app.initPlexus?.();
  }
 };
}
