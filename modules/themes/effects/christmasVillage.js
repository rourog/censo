/* Decorative buildings between the middle and foreground snow; no clinical state. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const HOSPITAL_RATIO=512/116;
export function createChristmasVillage(host,app){
  if(!host||!app)return {getStatus:()=>({visible:false,buildings:0}),dispose(){}};
  const hospital=document.createElement('img');hospital.className='christmas-village-hospital';
  hospital.src=new URL('hospital-delicias-snow.png',ASSETS).href;hospital.alt='';hospital.draggable=false;
  host.append(hospital);
  let disposed=false,visible=false;
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  function layout(){
    if(disposed)return;
    const bounds=rect(host.parentElement),appBounds=rect(app);
    let top=rect(app.querySelector('.header'))?.bottom||80;
    const table=rect(document.getElementById('scrollTableWrapper'));
    if(app.classList.contains('table-is-active')&&table)top=Math.max(top,table.bottom);
    else for(const section of app.querySelectorAll('#content > .section')){
      const box=rect(section);if(box&&box.right>0&&box.left<innerWidth)top=Math.max(top,box.bottom);
    }
    const width=bounds?.width||0,height=bounds?.height||0;
    const bottom=Math.max(8,height*.08),available=(bounds?.bottom||0)-top-bottom-14;
    visible=!!appBounds&&width>=768&&available>=45;
    host.hidden=!visible;if(!visible)return;
    const hospitalWidth=Math.min(540,width*.36,available*HOSPITAL_RATIO);
    hospital.style.width=hospitalWidth+'px';hospital.style.height='auto';
    hospital.style.left=((width-hospitalWidth)/2)+'px';hospital.style.bottom=bottom+'px';
  }
  const timer=window.setInterval(layout,500);window.addEventListener('resize',layout);layout();
  return {getStatus:()=>({visible,buildings:1,hospital:'center',houses:'hidden',snowPlane:'before-foreground'}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);window.removeEventListener('resize',layout);
      hospital.remove();host.hidden=false;}};
}
