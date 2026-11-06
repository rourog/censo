import assert from 'node:assert/strict';
import {createChristmasAudio} from '../modules/themes/effects/christmasAudio.js';
let on=false,now=0,next=0,rejectPlay=false;const events={},docEvents={},timers=new Map(),media=[];
class FakeAudio{
 constructor(src){this.src=src;this.currentTime=0;this.duration=9;this.paused=true;media.push(this);}
 load(){} cloneNode(){return new FakeAudio(this.src);}pause(){this.paused=true;}
 play(){this.paused=false;return rejectPlay?Promise.reject(Error('blocked')):Promise.resolve();}
}
const env={Audio:FakeAudio,performance:{now:()=>now},localStorage:{getItem:()=>on?'on':'off'},
 document:{hidden:false,addEventListener(k,fn){docEvents[k]=fn;},removeEventListener(k){delete docEvents[k];}},
 addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];},
 setInterval(fn){timers.set(++next,fn);return next;},clearInterval(id){timers.delete(id);}};
const audio=createChristmasAudio(env);
assert.equal(media.length,0,'Muted setup does not download sounds');assert.equal(audio.play('tree'),null);
on=true;const siren=audio.play('ambulance');assert.equal(siren.pending,true);await Promise.resolve();assert.equal(siren.pending,false);
const sirenMedia=media.at(-1);sirenMedia.currentTime=4;assert.equal(siren.elapsedMs,4000);assert.ok(sirenMedia.volume<.4);
now=100;audio.play('gift');now=200;audio.play('gift');assert.equal(audio.getStatus().voices,2,'Repeated gifts replace their voice without interrupting siren');
on=false;for(const fn of [...timers.values()])fn();assert.equal(audio.getStatus().voices,0);assert.equal(siren.elapsedMs,null);assert.ok(sirenMedia.paused,'Mute stops current siren');
on=true;now=300;audio.play('tree');env.document.hidden=true;docEvents.visibilitychange();assert.equal(audio.getStatus().voices,0);
env.document.hidden=false;now=400;rejectPlay=true;audio.play('bulb');await Promise.resolve();await Promise.resolve();assert.equal(audio.getStatus().voices,0,'Autoplay rejection is contained');
rejectPlay=false;now=500;const ram=audio.play('ramArrival');await Promise.resolve();assert.equal(ram.pending,false);assert.ok(media.at(-1).src.endsWith('/ram-arrival.mp3'));now=600;ram.stop();audio.play('ramExit');assert.ok(media.at(-1).src.endsWith('/ram-exit.mp3'));on=false;for(const fn of [...timers.values()])fn();assert.equal(audio.getStatus().voices,0,'Mute also stops the RAM engine');on=true;
for(const [kind,file] of [['vehicleStart','vehicle-start.mp3'],['civicStart','civic-start.mp3'],['silveradoStart','silverado-start-three.mp3'],['jimnyDrive','jimny-driving.mp3']]){
 now+=100;const handle=audio.play(kind);assert.ok(media.at(-1).src.endsWith('/'+file));assert.equal(handle.finished,false);media.at(-1).onended();assert.equal(handle.finished,true);
}
now+=100;audio.play('tree');audio.dispose();audio.dispose();assert.equal(timers.size,0);assert.equal(Object.keys(events).length,0);assert.equal(Object.keys(docEvents).length,0);assert.equal(audio.play('gift'),null);
console.log('OK: sound preference, no muted preloads, audio clock, bounded/replaced voices, mute, tab hiding, autoplay failure and disposal.');
