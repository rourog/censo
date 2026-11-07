/* Two invisible sidewalk guides. Only opaque-body footprints participate, not sheet margins. */
export const GUIDE_GAP=16;
export function createSidewalkTraffic(){
  const vehicles=new Map(),guests=new Map();let actors=[],stage=()=>({scale:.65,pedestrianBottom:38});
  const half=a=>Math.max(6,a.cast.width*stage().scale*a.cast.scale*.27);
  const center=a=>a.x+a.cast.width*stage().scale*a.cast.scale/2;
  const active=a=>stage().visible!==false&&!a.node?.hidden&&!a.cast.animal&&a.state!=='inside'&&(a.opacity??1)>.1;
  function occupants(){return [...guests.values()].flat();}
  function laneBusy(actor,lane,x,extra=0){
    return actors.some(other=>other!==actor&&active(other)&&
      ((other.guide??0)===lane||Math.abs((other.guideOffset??0)-lane*GUIDE_GAP)<GUIDE_GAP-1)&&
      Math.abs(center(other)-x)<half(actor)+half(other)+6+extra)||
      occupants().some(other=>(other.lane==null||other.lane===lane)&&Math.abs(other.x-x)<half(actor)+(other.halfWidth||11)+6+extra);
  }
  return {
    attach(list,getStage){actors=list.filter(a=>!a.cast.animal);stage=getStage;actors.forEach((a,i)=>{a.guide=i%2;a.guideOffset=a.guide*GUIDE_GAP;});},
    beginFrame(dt){for(const a of actors){a.trafficBlocked=false;a.guideCooldown=Math.max(0,(a.guideCooldown||0)-dt);const target=(a.guide||0)*GUIDE_GAP;const delta=target-(a.guideOffset||0);a.guideOffset=(a.guideOffset||0)+Math.sign(delta)*Math.min(Math.abs(delta),32*dt);}},
    move(actor,nextX,dt){
      const x=center(actor),delta=nextX-actor.x,next=x+delta;
      if(!delta)return nextX;
      const width=half(actor),step=Math.abs(delta);
      for(const box of vehicles.values()){
        const left=box.left-width-5,right=box.right+width+5;
        if(x>left&&x<right){
          // Clear a newly reserved bay instead of freezing under an arriving vehicle.
          const escape=x-left<=right-x?-1:1;actor.direction=escape;
          return actor.x+escape*step;
        }
        if(Math.max(x,next)>=left&&Math.min(x,next)<=right){actor.trafficBlocked=true;return actor.x;}
      }
      const overlappingGuest=occupants().find(g=>(g.lane==null||g.lane===(actor.guide||0))&&Math.abs(g.x-x)<width+(g.halfWidth||11)+4);
      if(overlappingGuest&&Math.abs(next-overlappingGuest.x)>Math.abs(x-overlappingGuest.x))return nextX;
      const lane=actor.guide||0;
      if(Math.abs((actor.guideOffset||0)-lane*GUIDE_GAP)>.1){actor.trafficBlocked=true;return actor.x;}
      if(laneBusy(actor,lane,next,8)){
        if(!actor.guideCooldown&&!laneBusy(actor,1-lane,x,12)&&!laneBusy(actor,1-lane,next,12)){
          actor.guide=1-lane;actor.guideCooldown=1.4;
        }
        actor.trafficBlocked=true;return actor.x;
      }
      return nextX;
    },
    canSpawn(actor,x){const c=x+actor.cast.width*stage().scale*actor.cast.scale/2,w=half(actor);return ![...vehicles.values()].some(b=>c+w+5>b.left&&c-w-5<b.right)&&!laneBusy(actor,actor.guide||0,c);},
    setVehicle(id,box){if(box)vehicles.set(id,box);else vehicles.delete(id);},
    setGuests(id,list){if(list?.length)guests.set(id,list);else guests.delete(id);},
    canGuestsMove(list){return !list.some(g=>actors.some(a=>active(a)&&Math.abs(center(a)-g.x)<half(a)+(g.halfWidth||11)+4&&Math.abs((stage().pedestrianBottom+6+(a.guideOffset||0))-g.ground)<11));},
    getStatus:()=>({guides:2,waiting:actors.filter(a=>a.trafficBlocked).length,vehicles:vehicles.size}),
    dispose(){vehicles.clear();guests.clear();actors=[];}
  };
}
