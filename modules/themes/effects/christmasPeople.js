/* Four person slots: two holiday guests and two clinicians. No clinical data. */
export const HOLIDAY_PEOPLE=['xmas_santa_3.png','xmas_misses_3.png','xmas_jesus_3.png','gnomea_mv.png'];
export const MEDICAL_PEOPLE=['doctor-coat.webp','doctor-navy.webp','doctor-pink-chestnut.webp','doctor-pink-blonde.webp','doctor-olive.webp'];
export const PERSON_CAST=[...HOLIDAY_PEOPLE,...MEDICAL_PEOPLE].map(file=>({file,width:78,height:108,
  sheetWidth:234,sheetHeight:432,scale:1,animal:false,holiday:HOLIDAY_PEOPLE.includes(file)}));
// The generated sheets have unequal margins. Atlas coordinates align feet and centers
// without altering the approved artwork or stretching individual walking frames.
const ATLAS={"doctor-olive.webp":[[32.89714,-0.30857],[123.92571,-0.30857],[215.10857,-0.30857],[31.50857,109.23429],[123.77143,109.23429],[216.03429,109.54286],[31.66286,219.39429],[123.46286,219.39429],[214.95429,219.39429],[32.58857,332.94857],[124.08,332.94857],[214.8,332.94857]],"doctor-navy.webp":[[32.58857,-1.23429],[123.46286,-1.23429],[214.95429,-1.23429],[31.66286,108.61714],[123.46286,108.61714],[215.26286,108.61714],[31.81714,218.77714],[123.77143,218.77714],[214.49143,218.77714],[32.28,332.02286],[123.46286,332.02286],[214.95429,332.02286]],"doctor-coat.webp":[[32.43429,-1.85143],[123.0,-1.85143],[214.8,-1.85143],[31.66286,108.61714],[122.84571,108.61714],[213.72,108.61714],[31.66286,218.46857],[123.0,218.46857],[213.25714,218.46857],[31.50857,331.71429],[122.69143,331.71429],[214.02857,331.71429]],"doctor-pink-blonde.webp":[[31.35429,0.61714],[122.22857,0.61714],[214.33714,0.61714],[32.43429,110.16],[123.61714,110.16],[215.41714,109.85143],[31.66286,220.01143],[123.30857,220.32],[214.49143,220.32],[32.28,333.56571],[123.77143,333.56571],[215.72571,333.56571]],"doctor-pink-chestnut.webp":[[33.20571,-0.30857],[123.92571,-0.30857],[215.26286,-0.30857],[33.66857,108.92571],[124.38857,108.92571],[216.34286,108.92571],[30.58286,219.39429],[122.38286,219.39429],[213.10286,219.39429],[32.28,332.33143],[123.77143,332.33143],[215.26286,332.33143]]};
for(const cast of PERSON_CAST)if(ATLAS[cast.file])Object.assign(cast,{sheetWidth:1058*108/350,sheetHeight:1487*108/350,frames:ATLAS[cast.file]});

// Ground-to-eye landmarks in normalized sprite coordinates; hats are excluded.
export const EYE_HEIGHT=50;
const EYES={'xmas_santa_3.png':52,'xmas_misses_3.png':52,'xmas_jesus_3.png':53,'gnomea_mv.png':33,
  'doctor-coat.webp':59,'doctor-navy.webp':60,'doctor-pink-chestnut.webp':59,'doctor-pink-blonde.webp':59,'doctor-olive.webp':59};
for(const cast of PERSON_CAST){cast.eyeHeight=EYES[cast.file];cast.scale=EYE_HEIGHT/cast.eyeHeight;}
export const PEOPLE_PORTALS=['left','right','urgencias','principal'];
export function createPeopleTraffic(actors,{random,stage}){
  const holiday=PERSON_CAST.filter(c=>c.holiday),medical=PERSON_CAST.filter(c=>!c.holiday);
  let nextHoliday=2,nextMedical=2;
  const actorWidth=actor=>actor.cast.width*stage().scale*actor.cast.scale;
  const isDoor=point=>point==='urgencias'||point==='principal';
  function choose(actor){
    const pool=actor.cast.holiday?holiday:medical;
    for(let i=0;i<pool.length;i++){
      const cast=pool[actor.cast.holiday?nextHoliday++%pool.length:nextMedical++%pool.length];
      if(!actors.some(other=>other!==actor&&other.cast.file===cast.file))return cast;
    }
    return actor.cast;
  }
  function selectPoint(){return PEOPLE_PORTALS[Math.min(3,Math.floor(random(0,4)))];}
  function portal(actor){
    const geometry=stage();
    return geometry.hospitalLeft+geometry.hospitalWidth*(actor.point==='urgencias'?224:394)/720-actorWidth(actor)/2;
  }
  function reset(actor){
    actor.state='walking';actor.stateTime=0;actor.depth=0;actor.shrink=1;actor.clip=0;actor.opacity=1;
    actor.point=selectPoint();
    if(!isDoor(actor.point))actor.direction=actor.point==='left'?-1:1;
  }
  function disappear(actor){actor.state='inside';actor.stateTime=0;actor.wait=random(2,6);actor.opacity=0;}
  function update(actor,dt){
    if(!actor.state)reset(actor);
    actor.stateTime+=dt;
    if(actor.state==='walking'){
      if(actor.rest>0){actor.rest=Math.max(0,actor.rest-dt);return;}
      const w=actorWidth(actor),viewport=stage().width;
      // Once outside, finish that edge exit. Never pull an offscreen walker to a door.
      if(actor.x+w<=0||actor.x>=viewport){disappear(actor);return;}
      if(isDoor(actor.point)&&stage().hospitalVisible){
        const target=portal(actor),distance=target-actor.x;
        actor.direction=distance<0?-1:1;
        const step=actor.speed*dt;
        if(Math.abs(distance)<=step){actor.x=target;actor.state='entering';actor.stateTime=0;actor.rest=0;}
        else actor.x+=actor.direction*step;
      }else{
        if(isDoor(actor.point)){actor.point=actor.direction<0?'left':'right';}
        actor.direction=actor.point==='left'?-1:1;
        actor.x+=actor.direction*actor.speed*dt;
        if(actor.x+w<=0||actor.x>=viewport)disappear(actor);
      }
    }else if(actor.state==='entering'){
      actor.x=portal(actor);
      const t=Math.min(1,actor.stateTime/.8);
      actor.shrink=1-.2*t;actor.opacity=t<.65?1:(1-t)/.35;
      if(t===1)disappear(actor);
    }else if(actor.state==='inside'){
      if(actor.stateTime>=actor.wait){
        actor.cast=choose(actor);actor.point=selectPoint();actor.stateTime=0;actor.clip=0;actor.depth=0;actor.rest=0;
        if(isDoor(actor.point)&&stage().hospitalVisible){
          actor.x=portal(actor);actor.state='exiting';actor.shrink=.8;actor.opacity=0;
        }else{
          if(isDoor(actor.point))actor.point=random(0,1)<.5?'left':'right';
          actor.direction=actor.point==='left'?1:-1;actor.x=actor.point==='left'?-actorWidth(actor):stage().width;
          actor.state='arriving';actor.shrink=1;actor.opacity=1;
        }
      }
    }else if(actor.state==='exiting'){
      actor.x=portal(actor);
      const t=Math.min(1,actor.stateTime/.8);
      actor.shrink=.8+.2*t;actor.opacity=Math.min(1,t/.35);
      if(t===1){actor.state='arriving';actor.stateTime=0;actor.direction=random(0,1)<.5?-1:1;}
    }else if(actor.state==='arriving'){
      // Walk clear of the entry at normal speed before selecting the next destination.
      actor.x+=actor.direction*actor.speed*dt;
      if(actor.stateTime>=2)reset(actor);
    }
  }
  function resize(actor){
    if(['entering','exiting'].includes(actor.state))actor.x=portal(actor);
    else if(actor.state==='arriving')actor.x=Math.max(-actorWidth(actor),Math.min(stage().width,actor.x));
  }
  return {update,resize,reset};
}
