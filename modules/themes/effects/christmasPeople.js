/* Four person slots: two holiday guests and two clinicians. No clinical data. */
export const HOLIDAY_PEOPLE=['xmas_santa_3.png','xmas_misses_3.png','xmas_jesus_3.png','gnomea_mv.png'];
export const MEDICAL_PEOPLE=['doctor-coat.webp','doctor-navy.webp','doctor-pink-chestnut.webp','doctor-pink-blonde.webp','doctor-olive.webp'];
export const PERSON_CAST=[...HOLIDAY_PEOPLE,...MEDICAL_PEOPLE].map(file=>({file,width:78,height:108,
  sheetWidth:234,sheetHeight:432,scale:1,animal:false,holiday:HOLIDAY_PEOPLE.includes(file)}));
// The generated sheets have unequal margins. Atlas coordinates align feet and centers
// without altering the approved artwork or stretching individual walking frames.
const ATLAS={"doctor-olive.webp":[[32.89714,-0.30857],[123.92571,-0.30857],[215.10857,-0.30857],[31.50857,109.23429],[123.77143,109.23429],[216.03429,109.54286],[31.66286,219.39429],[123.46286,219.39429],[214.95429,219.39429],[32.58857,332.94857],[124.08,332.94857],[214.8,332.94857]],"doctor-navy.webp":[[32.58857,-1.23429],[123.46286,-1.23429],[214.95429,-1.23429],[31.66286,108.61714],[123.46286,108.61714],[215.26286,108.61714],[31.81714,218.77714],[123.77143,218.77714],[214.49143,218.77714],[32.28,332.02286],[123.46286,332.02286],[214.95429,332.02286]],"doctor-coat.webp":[[32.43429,-1.85143],[123.0,-1.85143],[214.8,-1.85143],[31.66286,108.61714],[122.84571,108.61714],[213.72,108.61714],[31.66286,218.46857],[123.0,218.46857],[213.25714,218.46857],[31.50857,331.71429],[122.69143,331.71429],[214.02857,331.71429]],"doctor-pink-blonde.webp":[[31.35429,0.61714],[122.22857,0.61714],[214.33714,0.61714],[32.43429,110.16],[123.61714,110.16],[215.41714,109.85143],[31.66286,220.01143],[123.30857,220.32],[214.49143,220.32],[32.28,333.56571],[123.77143,333.56571],[215.72571,333.56571]],"doctor-pink-chestnut.webp":[[33.20571,-0.30857],[123.92571,-0.30857],[215.26286,-0.30857],[33.66857,108.92571],[124.38857,108.92571],[216.34286,108.92571],[30.58286,219.39429],[122.38286,219.39429],[213.10286,219.39429],[32.28,332.33143],[123.77143,332.33143],[215.26286,332.33143]]};
for(const cast of PERSON_CAST)if(ATLAS[cast.file])Object.assign(cast,{sheetWidth:1058*108/350,sheetHeight:1487*108/350,frames:ATLAS[cast.file]});

export function createPeopleTraffic(actors,{random,stage}){
  const holiday=PERSON_CAST.filter(c=>c.holiday),medical=PERSON_CAST.filter(c=>!c.holiday);
  let nextHoliday=2,nextMedical=2;
  function choose(actor){
    const pool=actor.cast.holiday?holiday:medical;
    for(let i=0;i<pool.length;i++){
      const cast=pool[actor.cast.holiday?nextHoliday++%pool.length:nextMedical++%pool.length];
      if(!actors.some(other=>other!==actor&&other.cast.file===cast.file))return cast;
    }
    return actor.cast;
  }
  function portal(actor){
    const geometry=stage();
    const center=geometry.hospitalLeft+geometry.hospitalWidth*(actor.door===0?224:394)/720;
    const height=geometry.hospitalHeight*30/115;
    return {x:center-actor.cast.width*geometry.scale/2,bottom:Math.max(0,geometry.hospitalHeight*26/115-6),shrink:Math.min(.5,height/(actor.cast.height*geometry.scale*.84))};
  }
  function reset(actor){actor.state='walking';actor.stateTime=0;actor.depth=0;actor.shrink=1;actor.clip=0;actor.nextVisit=random(12,26);}
  function update(actor,dt){
    if(!actor.state)reset(actor);
    if(!stage().hospitalVisible)return;
    actor.stateTime+=dt;
    if(actor.state==='walking'){
      if(actor.rest>0)actor.rest=Math.max(0,actor.rest-dt);
      else actor.x+=actor.direction*actor.speed*dt;
      const width=stage().width,actorWidth=actor.cast.width*stage().scale;
      if(actor.stateTime>=actor.nextVisit||actor.x<0||actor.x>width-actorWidth){
        actor.door=random(0,1)<.5?0:1;actor.fromX=actor.x;actor.state='approaching';actor.stateTime=0;actor.rest=0;
      }
    }else if(actor.state==='approaching'){
      const door=portal(actor),t=Math.min(1,actor.stateTime/2.4);
      actor.x=actor.fromX+(door.x-actor.fromX)*t;actor.depth=door.bottom*t;actor.shrink=1+(door.shrink-1)*t;
      if(t===1){actor.state='entering';actor.stateTime=0;}
    }else if(actor.state==='entering'||actor.state==='exiting'){
      const door=portal(actor),t=Math.min(1,actor.stateTime/.7);
      actor.x=door.x;actor.depth=door.bottom;actor.shrink=door.shrink;
      actor.clip=actor.state==='entering'?t:1-t;
      if(t===1){
        if(actor.state==='entering'){actor.state='inside';actor.wait=random(2,6);actor.clip=1;}
        else{actor.state='departing';actor.fromX=actor.x;actor.direction=random(0,1)<.5?-1:1;}
        actor.stateTime=0;
      }
    }else if(actor.state==='inside'){
      if(actor.stateTime>=actor.wait){
        actor.cast=choose(actor);actor.door=random(0,1)<.5?0:1;actor.state='exiting';actor.stateTime=0;actor.clip=1;
        const door=portal(actor);actor.x=door.x;actor.depth=door.bottom;actor.shrink=door.shrink;
      }
    }else if(actor.state==='departing'){
      const door=portal(actor),t=Math.min(1,actor.stateTime/1.8);
      actor.x=door.x+actor.direction*65*t;actor.depth=door.bottom*(1-t);actor.shrink=door.shrink+(1-door.shrink)*t;actor.clip=0;
      if(t===1)reset(actor);
    }
  }
  function resize(actor){
    if(['entering','inside','exiting'].includes(actor.state)){const door=portal(actor);actor.x=door.x;actor.depth=door.bottom;actor.shrink=door.shrink;}
    else if(actor.state==='approaching'){actor.fromX=actor.x;actor.stateTime=0;}
  }
  return {update,resize,reset};
}
