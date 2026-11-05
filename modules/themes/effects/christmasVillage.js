/* Decorative buildings between the middle and foreground snow; no clinical state. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const HOSPITAL_RATIO=512/106;
export function createChristmasVillage(host,app){
  if(!host||!app)return {getStatus:()=>({visible:false,buildings:0}),dispose(){}};
  const hospital=document.createElement('img');hospital.className='christmas-village-hospital';
  hospital.src=new URL('hospital-delicias.png',ASSETS).href;hospital.alt='';hospital.draggable=false;
  host.append(hospital);
  const houses=Array.from({length:3},(_,i)=>{const node=document.createElement('span');node.className='christmas-village-house';
    node.style.backgroundImage='url("'+new URL('christmas-houses.png',ASSETS).href+'")';host.append(node);return node;});
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
    const gap=100,margin=width*.04,sideWidth=width/2-gap-margin;
    const hospitalWidth=Math.min(500,sideWidth,available*HOSPITAL_RATIO);
    hospital.style.width=hospitalWidth+'px';hospital.style.height='auto';
    hospital.style.left=(width/2-gap-hospitalWidth)+'px';hospital.style.bottom=bottom+'px';
    const houseSize=Math.min(120,available,sideWidth/3.4);
    houses.forEach((node,i)=>{
      node.style.width=houseSize+'px';node.style.height=houseSize+'px';
      node.style.left=(width/2+gap+i*(sideWidth-houseSize)/2)+'px';node.style.bottom=bottom+'px';
      node.style.backgroundSize=(houseSize*3)+'px '+(houseSize*2)+'px';node.style.backgroundPosition=(-i*houseSize)+'px 0px';
    });
  }
  const timer=window.setInterval(layout,500);window.addEventListener('resize',layout);layout();
  return {getStatus:()=>({visible,buildings:4,hospital:'left',houses:'right',snowPlane:'before-foreground'}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);window.removeEventListener('resize',layout);
      hospital.remove();houses.forEach(node=>node.remove());host.hidden=false;}};
}
