/* Christmas theme registration: seasonal data, no clinical dependencies. */
export default Object.freeze({
  id:'christmas',
  name:'Navidad',
  schedule:{start:'12-01',end:'12-31',timezone:'America/Chihuahua'},
  palette:{base:'base-surface-forest',accent:'accent-red',effect:'effect-waves'},
  decorations:['winter-snowfall','static-snow-mountains','pine-garland','interactive-lights','christmas-pixel-scene'],
  celebration:{type:'fireworks',duration:5000,colors:['#e7b85e','#dc4048','#3bc793','#c8eaff']},
  load:'christmas'
});
