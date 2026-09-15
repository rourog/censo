(() => {
  const explorer = document.getElementById('cie10Explorer');
  if (!explorer) return;

  const columns = [1,2,3,4].map(step => document.getElementById(`cie10Col${step}`));
  let activeStep = 1;

  function selectedIn(step) {
    return Boolean(document.querySelector(`#cie10List${step} .cie10-item.selected`));
  }

  function inferredStep() {
    if (selectedIn(3)) return 4;
    if (selectedIn(2)) return 3;
    if (selectedIn(1)) return 2;
    return 1;
  }

  function applyLayout() {
    columns.forEach((column, index) => {
      if (!column) return;
      const step = index + 1;
      column.classList.remove('is-compact','is-expanded','is-future');
      const head = column.querySelector('.cie10-column-head');

      if (step < activeStep) {
        column.classList.add('is-compact');
        column.setAttribute('aria-hidden','false');
        if (head) {
          head.tabIndex = 0;
          head.setAttribute('role','button');
          head.setAttribute('aria-label',`Cambiar paso ${step}`);
        }
      } else if (step === activeStep) {
        column.classList.add('is-expanded');
        column.setAttribute('aria-hidden','false');
        if (head) {
          head.tabIndex = -1;
          head.removeAttribute('role');
          head.removeAttribute('aria-label');
        }
      } else {
        column.classList.add('is-future');
        column.setAttribute('aria-hidden','true');
        if (head) {
          head.tabIndex = -1;
          head.removeAttribute('role');
          head.removeAttribute('aria-label');
        }
      }
    });
  }

  function goToStep(step) {
    activeStep = Math.max(1, Math.min(4, step));
    applyLayout();
    const active = columns[activeStep - 1];
    active?.scrollIntoView?.({ behavior:'smooth', block:'nearest', inline:'nearest' });
  }

  explorer.addEventListener('click', event => {
    const column = event.target.closest('.cie10-column');
    if (!column) return;
    const step = columns.indexOf(column) + 1;
    if (!step) return;

    const head = event.target.closest('.cie10-column-head');
    if (head && column.classList.contains('is-compact')) {
      goToStep(step);
      return;
    }

    if (event.target.closest('.cie10-item')) {
      window.setTimeout(() => {
        if (step < 4) goToStep(step + 1);
        else goToStep(4);
      }, 0);
    }
  }, true);

  explorer.addEventListener('keydown', event => {
    if (!['Enter',' '].includes(event.key)) return;
    const head = event.target.closest('.cie10-column-head');
    const column = head?.closest('.cie10-column');
    if (!head || !column?.classList.contains('is-compact')) return;
    event.preventDefault();
    const step = columns.indexOf(column) + 1;
    if (step) goToStep(step);
  });

  const observer = new MutationObserver(() => {
    if (explorer.hidden) return;
    const inferred = inferredStep();
    if (inferred > activeStep) activeStep = inferred;
    applyLayout();
  });
  observer.observe(explorer, { childList:true, subtree:true });

  const visibilityObserver = new MutationObserver(() => {
    if (!explorer.hidden) applyLayout();
  });
  visibilityObserver.observe(explorer, { attributes:true, attributeFilter:['hidden'] });

  applyLayout();
})();
