/* Header menu: enlarged, keyboard-accessible and delegated to existing actions.
 * Clinical permissions and workflows stay in their original action handlers.
 */
export function initHeaderMenu(){
  const trigger=document.getElementById('censoMenuButton');
  const menu=document.getElementById('censoHeaderMenu');
  if(!trigger||!menu||trigger.dataset.censoMenuReady==='true')return;
  trigger.dataset.censoMenuReady='true';

  // Header decorations use overflow:hidden; portal the dropdown to body.
  document.body.appendChild(menu);
  const triggerIcon=trigger.querySelector('.material-symbols-outlined');
  const actionTargets=Object.freeze({
    search:'searchToggleBtn',
    history:'historyBtn',
    cie10:'cie10PageBtn',
    print:'printBtn',
    theme:'themeToggleBtn',
    beds:'adminSettingsBtn',
    view:'viewToggleBtn',
    reload:'reloadBtn',
    logout:'btnLogoutBtn'
  });
  const items=Array.from(menu.querySelectorAll('[data-menu-action]'));
  let open=false;

  function enabledItems(){
    return items.filter(item=>!item.disabled&&!item.hidden);
  }
  function setExpanded(expanded){
    trigger.setAttribute('aria-expanded',String(expanded));
    trigger.setAttribute('aria-label',expanded?'Cerrar menú del Censo':'Abrir menú del Censo');
    trigger.title=expanded?'Cerrar menú':'Abrir menú';
    if(triggerIcon)triggerIcon.textContent=expanded?'close':'menu';
  }
  function updateViewLabel(){
    const current=window.CensoApp?.state?.currentViewMode;
    const label=menu.querySelector('[data-view-label]');
    if(label)label.textContent=current==='table'?'Cambiar a tarjetas':'Cambiar a tabla';
  }
  function updateAvailability(){
    for(const item of items){
      const target=document.getElementById(actionTargets[item.dataset.menuAction]);
      const unavailable=!target||target.disabled;
      item.disabled=unavailable;
      item.setAttribute('aria-disabled',String(unavailable));
    }
  }
  function positionMenu(){
    if(!open||menu.hidden)return;
    if(!trigger.getClientRects().length){close();return;}
    const rect=trigger.getBoundingClientRect();
    const viewport=window.visualViewport;
    const viewportWidth=window.innerWidth;
    const viewportTop=viewport?.offsetTop||0;
    const viewportHeight=viewport?.height||window.innerHeight;
    const topLimit=viewportTop+12;
    const bottomLimit=viewportTop+viewportHeight-12;
    const width=menu.getBoundingClientRect().width||Math.min(322,viewportWidth-24);
    const x=Math.max(12,Math.min(viewportWidth-width-12,rect.right-width));
    menu.style.left=Math.round(x)+'px';

    const spaceBelow=Math.max(0,bottomLimit-rect.bottom-9);
    const spaceAbove=Math.max(0,rect.top-9-topLimit);
    const naturalHeight=menu.scrollHeight;
    const above=spaceBelow<Math.min(naturalHeight,380)&&spaceAbove>spaceBelow;
    const available=above?spaceAbove:spaceBelow;
    const maxHeight=Math.max(90,Math.floor(available));
    menu.style.maxHeight=maxHeight+'px';
    const actualHeight=Math.min(naturalHeight,maxHeight);
    const y=above?Math.max(topLimit,rect.top-9-actualHeight)
      :Math.min(rect.bottom+9,bottomLimit-actualHeight);
    menu.style.top=Math.round(Math.max(topLimit,y))+'px';
  }
  function close({restoreFocus=false}={}){
    if(!open)return;
    open=false;
    menu.hidden=true;
    setExpanded(false);
    if(restoreFocus&&trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function show(){
    updateViewLabel();
    updateAvailability();
    open=true;
    menu.hidden=false;
    setExpanded(true);
    menu.scrollTop=0;
    positionMenu();
    (enabledItems()[0]||trigger).focus({preventScroll:true});
  }
  trigger.addEventListener('click',()=>open?close({restoreFocus:true}):show());

  menu.addEventListener('click',event=>{
    const item=event.target.closest('[data-menu-action]');
    if(!item||!menu.contains(item)||item.disabled)return;
    const target=document.getElementById(actionTargets[item.dataset.menuAction]);
    close({restoreFocus:true});
    if(!target||target.disabled){
      console.warn('[CENSO] Acción del menú no disponible:',item.dataset.menuAction);
      return;
    }
    // Delegation maintains permissions and the existing confirmation dialogs.
    target.click();
  });
  menu.addEventListener('focusout',event=>{
    const next=event.relatedTarget;
    if(open&&next&&!menu.contains(next)&&next!==trigger)close();
  });
  document.addEventListener('pointerdown',event=>{
    if(open&&!menu.contains(event.target)&&!trigger.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
    if(!open)return;
    if(event.key==='Escape'){
      event.preventDefault();
      close({restoreFocus:true});
      return;
    }
    if(!menu.contains(document.activeElement)&&document.activeElement!==trigger)return;
    const enabled=enabledItems();
    if(!enabled.length)return;
    const key=event.key;
    if(!['ArrowDown','ArrowUp','Home','End'].includes(key))return;
    event.preventDefault();
    const current=enabled.indexOf(document.activeElement);
    let next=0;
    if(key==='End')next=enabled.length-1;
    else if(key==='Home')next=0;
    else if(key==='ArrowDown')next=(current+1)%enabled.length;
    else next=(current<0?0:current-1+enabled.length)%enabled.length;
    enabled[next].focus({preventScroll:true});
    enabled[next].scrollIntoView({block:'nearest'});
  });
  const onReposition=()=>{if(open)positionMenu();};
  window.addEventListener('resize',onReposition);
  window.addEventListener('scroll',event=>{
    if(open&&event.target!==menu)positionMenu();
  },true);
  window.visualViewport?.addEventListener('resize',onReposition);
  window.visualViewport?.addEventListener('scroll',onReposition);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
}
