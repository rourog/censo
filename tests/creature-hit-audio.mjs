import assert from 'node:assert/strict';
import { createCreatureHitAudio } from '../modules/creatureHitAudio.js';
let preference='off';const media=[],listeners={},documentListeners={},timers=new Map();let timerId=0;
class Audio {
 constructor(url){this.url=url;media.push(this);}load(){this.loaded=true;}
 cloneNode(){return new Audio(this.url);}play(){this.played=true;return Promise.resolve();}pause(){this.paused=true;}
}
const env={Audio,localStorage:{getItem:()=>preference},document:{hidden:false,addEventListener:(type,fn)=>documentListeners[type]=fn},addEventListener:(type,fn)=>listeners[type]=fn,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),setInterval:fn=>{timers.set(++timerId,fn);return timerId;},clearInterval:id=>timers.delete(id)};
const audio=createCreatureHitAudio(env);
audio.play('bats');assert.equal(media.length,0,'OFF neither plays nor preloads');
preference='on';audio.prepare();assert.equal(media.length,2);assert.ok(media.every(m=>m.loaded&&!m.played));
audio.play('bats');await Promise.resolve();let bat=media.at(-1);
assert.match(bat.url,/\/pop.ogg$/);assert.equal(bat.volume,.6);assert.equal(bat.currentTime,.39);
audio.play('ghosts');await Promise.resolve();let ghost=media.at(-1);
assert.match(ghost.url,/cartoon_boing.ogg$/);assert.equal(ghost.volume,.6);assert.equal(ghost.currentTime,.04);
preference='off';audio.stop();assert.ok(bat.paused&&ghost.paused);assert.equal(timers.size,0);
const count=media.length;audio.play('ghosts');assert.equal(media.length,count);
preference='on';for(let i=0;i<4;i++)audio.play('bats');await Promise.resolve();assert.equal(media.filter(m=>m.played&&!m.paused).length,3,'Rapid hits have a bounded voice pool');
env.document.hidden=true;documentListeners.visibilitychange();assert.ok(media.filter(m=>m.played).every(m=>m.paused));
const hiddenCount=media.length;audio.play('ghosts');assert.equal(media.length,hiddenCount);
env.document.hidden=false;audio.play('ghosts');await Promise.resolve();ghost=media.at(-1);preference='off';listeners.storage({key:'censo-celebration-sound'});assert.ok(ghost.paused);
console.log('PASS: Pop/Boing at 60%, silence offsets, sound toggle, cross-tab mute, bounded voices and hidden-page cleanup.');
