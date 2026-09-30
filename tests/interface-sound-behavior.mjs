import assert from 'node:assert/strict';
const prefs=new Map(),listeners={};let tones=0,resumes=0,clock=200;
globalThis.localStorage={getItem:key=>prefs.get(key)};
globalThis.document={hidden:false,addEventListener(type,fn){listeners[type]=fn;}};
const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
globalThis.window={addEventListener(){},AudioContext:class{
 state='suspended';currentTime=0;destination={};
 async resume(){this.state='running';resumes++;}
 createOscillator(){return {frequency:param,connect(){},disconnect(){},start(){tones++;},stop(){this.onended();}};}
 createGain(){return {gain:param,connect(){},disconnect(){}};}
}};
globalThis.performance={now:()=>clock};
const {initCelebrationAudio,playInterfaceSound}=await import('../modules/celebrationEffects.js');
initCelebrationAudio();await playInterfaceSound();assert.equal(tones,0);
prefs.set('censo-celebration-sound','on');await playInterfaceSound('hover');assert.equal(tones,0,'Hover cannot unlock audio');
await playInterfaceSound();assert.equal(tones,1);assert.equal(resumes,1);
const button={disabled:false,getAttribute(){},contains:target=>target==='child'};
const target={closest:()=>button};
listeners.pointerover({target,pointerType:'touch'});assert.equal(tones,1);
listeners.pointerover({target,pointerType:'mouse'});assert.equal(tones,2);
clock+=200;listeners.pointerover({target,pointerType:'mouse',relatedTarget:'child'});assert.equal(tones,2);
button.disabled=true;listeners.click({target});await Promise.resolve();assert.equal(tones,2);
button.disabled=false;prefs.set('censo-celebration-sound','off');await playInterfaceSound();assert.equal(tones,2);
prefs.set('censo-celebration-sound','on');document.hidden=true;await playInterfaceSound();assert.equal(tones,2);
console.log('OK: UI audio respects OFF, gesture unlock, touch, disabled buttons, child transitions and hidden pages.');
