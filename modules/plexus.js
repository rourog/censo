// plexus.js
// Animación neural del encabezado. Aislada para que no rompa login/datos.

// SISTEMA DE PARTÍCULAS NEURAL Y SINAPSIS
// ==========================================================
let plexusRunning = false;
let isTabActive = true;

document.addEventListener("visibilitychange", () => { isTabActive = !document.hidden; });

window.syncPlexusPatients = () => {};

export function initPlexus() {
  if (plexusRunning) return;
  plexusRunning = true;

  const canvas = document.getElementById('plexusCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let width, height, standardParticles = [], patientParticles = [];

  function resize() { 
    width = canvas.width = canvas.offsetWidth; 
    height = canvas.height = canvas.offsetHeight; 
    initStandardParticles();
  }

  const plexusAreaColors = {
    'SALA DE CHOQUE': { solid: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
    'OBSERVACION': { solid: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    'OBSERVACIÓN': { solid: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    'TRAUMA MENOR': { solid: '#eab308', glow: 'rgba(234, 179, 8, 0.4)' },
    'PEDIATRIA': { solid: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    'PEDIATRÍA': { solid: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    'EXTRAS': { solid: '#d946ef', glow: 'rgba(217, 70, 239, 0.4)' }
  };

  function createParticle(isPatient, colorSet) {
    return {
      isPatient: isPatient,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: isPatient ? (Math.random() * 2 + 3) : (Math.random() * 1.5 + 0.5),
      color: colorSet
    };
  }
  
  function initStandardParticles() {
    standardParticles = [];
    let num = Math.floor(width / 35); 
    for (let i = 0; i < num; i++) {
      standardParticles.push(createParticle(false, null));
    }
  }

  window.syncPlexusPatients = (listaPacientes) => {
    patientParticles = [];
    (listaPacientes || []).forEach(p => {
      let areaNormalizada = String(p.area || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      let colorSet = plexusAreaColors[areaNormalizada] || { solid: '#ffffff', glow: 'rgba(255,255,255,0.3)' };
      patientParticles.push(createParticle(true, colorSet));
    });
  };

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    if (!isTabActive) {
      requestAnimationFrame(animate);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    
    let isLight = document.body.className.includes('base-light') || 
                  document.body.className.includes('base-pure-white') || 
                  document.body.className.includes('base-gray-light') || 
                  document.body.className.includes('base-sand') || 
                  document.body.className.includes('base-rose') || 
                  document.body.className.includes('base-mint') || 
                  document.body.className.includes('base-lavender');
                  
    let defaultFill = isLight ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.3)';
    let defaultStroke = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    let allParticles = standardParticles.concat(patientParticles);
    ctx.lineWidth = 0.8; 

    for (let i = 0; i < allParticles.length; i++) {
      let p = allParticles[i];
      p.x += p.vx; p.y += p.vy;
      
      if (p.x < 0 || p.x > width) p.vx *= -1; 
      if (p.y < 0 || p.y > height) p.vy *= -1;
      
      if (p.isPatient) {
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2); 
        ctx.fillStyle = p.color.glow; 
        ctx.fill();
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); 
        ctx.fillStyle = p.color.solid; 
        ctx.fill();
      } else {
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); 
        ctx.fillStyle = defaultFill; 
        ctx.fill();
      }

      for (let j = i + 1; j < allParticles.length; j++) {
        let p2 = allParticles[j];
        let dx = p.x - p2.x, dy = p.y - p2.y;
        if (dx*dx + dy*dy < 8000) { 
          ctx.beginPath(); 
          ctx.strokeStyle = defaultStroke; 
          ctx.moveTo(p.x, p.y); 
          ctx.lineTo(p2.x, p2.y); 
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ==========================================================
