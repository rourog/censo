// Integration adapter for Caleb Miller's Firework Simulator v2.
// Original engine mirrored by troyxun/fireworks-simulator; see LICENSE and NOTICE.
(() => {
 let timers=[];
 const reset=()=>{
  timers.forEach(clearTimeout);timers=[];togglePause(true);
  for(const color of COLOR_CODES_W_INVIS){
   for(const star of Star.active[color]){star.onDeath=null;Star.returnInstance(star);}
   Star.active[color].length=0;
   for(const spark of Spark.active[color])Spark.returnInstance(spark);
   Spark.active[color].length=0;
  }
  while(BurstFlash.active.length)BurstFlash.returnInstance(BurstFlash.active.pop());
  for(const stage of stages){stage.ctx.setTransform(1,0,0,1,0,0);stage.ctx.clearRect(0,0,stage.canvas.width,stage.canvas.height);}
 };
 window.labFireworks={
  clear:reset,
  start(opt){
   reset();
   updateConfig({quality:String(window.innerWidth<450?QUALITY_LOW:QUALITY_NORMAL),autoLaunch:false,
    skyLighting:'0',hideControls:true,longExposure:false,
    scaleFactor:Math.max(.12,Math.min(window.innerWidth/750,window.innerHeight/460,1)*.8*opt.size)});
   handleResize();simSpeed=1;togglePause(false);document.body.style.opacity='1';document.body.style.transition='none';
   const duration=opt.duration*1000,count=Math.max(1,Math.min(6,Math.round(opt.count/45)));
   const names={chrysanthemum:crysanthemumShell,willow:willowShell,ring:ringShell,palm:palmShell,crackle:crackleShell,crossette:crossetteShell};
   for(let i=0;i<count;i++){
    const launch=()=>{
     const factory=names[opt.shell]||[crysanthemumShell,palmShell,ringShell,crackleShell][i%4];
     const config=factory(.7);config.starCount=Math.max(24,Math.min(100,opt.count/count));
     const shell=new Shell(config);
     shell.launch(count===1?opt.x:.22+i/(count-1)*.56,.42+Math.random()*.22);
    };
    if(i===0)launch();else timers.push(setTimeout(launch,i/(count-1)*Math.max(0,duration-2600)*.7));
   }
   timers.push(setTimeout(()=>{document.body.style.transition='opacity 850ms linear';document.body.style.opacity='0';},Math.max(0,duration-850)));
   timers.push(setTimeout(reset,duration));
  }
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
})();
