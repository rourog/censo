/* Shared disposal scope for upcoming seasonal effects.
 * Every effect should register DOM listeners, observers, timers and frames here.
 * The engine owns the lifecycle; effects own only their rendering.
 */
export function createEffectScope() {
  const cleanup=[];
  let disposed=false;
  const add=fn=>{
    if(disposed){fn();return ()=>{};}
    cleanup.push(fn);
    return fn;
  };
  return {
    on(target,type,listener,options){
      target.addEventListener(type,listener,options);
      return add(()=>target.removeEventListener(type,listener,options));
    },
    interval(fn,delay){
      const timer=setInterval(fn,delay);
      add(()=>clearInterval(timer));
      return timer;
    },
    timeout(fn,delay){
      const timer=setTimeout(fn,delay);
      add(()=>clearTimeout(timer));
      return timer;
    },
    observer(observer){
      add(()=>observer.disconnect());
      return observer;
    },
    frame(requestId){
      add(()=>cancelAnimationFrame(requestId));
      return requestId;
    },
    remove(node){
      add(()=>node.remove());
      return node;
    },
    dispose(){
      if(disposed)return;
      disposed=true;
      for(const fn of cleanup.reverse())try{fn();}catch(error){console.warn('[SeasonalScope] Cleanup failed:',error);}
      cleanup.length=0;
    },
    get disposed(){return disposed;}
  };
}
