/* BETA: one accessible header menu; existing handlers keep authorization and behavior. */
export function initHeaderMenu() {
  const trigger=document.getElementById('censoMenuButton');
  const menu=document.getElementById('censoHeaderMenu');
  if(!trigger||!menu)return;
  // El header usa overflow:hidden para sus decoraciones; el menú se
  // monta fuera para evitar que su lista quede cortada por ese contenedor.
  document.body.appendChild(menu);
  function positionMenu(){
    const rect=trigger.getBoundingClientRect();
    const width=Math.min(268,window.innerWidth-28);
    const left=Math.max(14,Math.min(window.innerWidth-width-14,rect.right-width));
    menu.style.left=left+'px';
    menu.style.top=Math.min(rect.bottom+9,window.innerHeight-20)+'px';
    menu.style.right='auto';
  }
  const actions={
    theme:'themeToggleBtn',
    beds:'adminSettingsBtn',
    view:'viewToggleBtn',
    reload:'reloadBtn',
    logout:'btnLogoutBtn'
  };
  let open=false;
  const items=Array.from(menu.querySelectorAll('[data-menu-action]'));
  function close({restoreFocus=false}={}){
    open=false;menu.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus();
  }
  function show(){
    positionMenu();open=true;menu.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    updateViewLabel();
    items[0]?.focus();
  }
  function updateViewLabel(){
    const current=window.CensoApp?.state?.currentViewMode;
    const label=menu.querySelector('[data-view-label]');
    if(label)label.textContent=current==='table'?'Cambiar a tarjetas':'Cambiar a tabla';
  }
  trigger.addEventListener('click',()=>open?close({restoreFocus:true}):show());
  menu.addEventListener('click',event=>{
    const action=event.target.closest('[data-menu-action]')?.dataset.menuAction;
    if(!action)return;
    close();
    if(action==='season'){
      document.getElementById('themeToggleBtn')?.click();
      // Appearance dialog is long: show the seasonal controls directly.
      requestAnimationFrame(()=>{
        const selector=document.getElementById('seasonalEnginePreview');
        selector?.scrollIntoView({block:'center',behavior:'smooth'});
        selector?.focus({preventScroll:true});
      });
      return;
    }
    document.getElementById(actions[action])?.click();
  });
  window.addEventListener('resize',()=>{if(open)positionMenu();});
  window.addEventListener('scroll',()=>{if(open)positionMenu();},true);
  document.addEventListener('pointerdown',event=>{
    if(open&&!menu.contains(event.target)&&!trigger.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
    if(!open)return;
    if(event.key==='Escape'){event.preventDefault();close({restoreFocus:true});}
    if(event.key==='Tab'){
      const current=items.indexOf(document.activeElement);
      if(event.shiftKey&&current===0){event.preventDefault();items[items.length-1]?.focus();}
      else if(!event.shiftKey&&current===items.length-1){event.preventDefault();items[0]?.focus();}
    }
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      const current=Math.max(0,items.indexOf(document.activeElement));
      const next=(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      event.preventDefault();items[next]?.focus();
    }
  });
}
