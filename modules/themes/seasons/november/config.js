/* Registered season data; no DOM/clinical dependencies. */
export default Object.freeze({
  id: 'november',
  name: 'Día de Muertos',
  schedule: { start:'11-01', end:'11-30', timezone:'America/Chihuahua' },
  palette: { base:'base-gray-dark', accent:'accent-orange', effect:'effect-waves' },
  decorations: ['paper-flags','marigold-petals','stone-texture'],
  celebration: { type:'fireworks', duration:5000, colors:['#079b4c','#ffffff','#dc2836'] },
  load: 'november'
});
