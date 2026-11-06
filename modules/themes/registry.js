/* Seasonal Engine 2.0 - central catalog, independent from application wiring. */
// Version each child independently: a new build must bypass stale ESM caches.
const build=String(window.CensoBuild?.version || 'runtime');
const load=async path=>{
  const url=new URL(path,import.meta.url);
  url.searchParams.set('v',build);
  return import(url.href);
};
const [{default:november},{default:christmas},{isSeasonInRange},{getPreviewSeason,isDecorationEnabled}] = await Promise.all([
  load('./seasons/november/config.js'),load('./seasons/christmas/config.js'),
  load('./calendar.js'),load('./preferences.js')
]);

export const seasons=Object.freeze([november,christmas]);
export const getRegisteredSeasons=()=>seasons;

export function getSeasonalConfiguration(date=new Date()) {
  const preview=getPreviewSeason();
  const season=preview!=='auto'
    ? seasons.find(item=>item.id===preview)
    : seasons.find(item=>isSeasonInRange(item.schedule,date));
  return season && isDecorationEnabled(season.id) ? season : null;
}

export async function loadSeasonController(season,app) {
  if (season.load==='november') {
    const url=new URL('../novemberTheme.js',import.meta.url);
    url.searchParams.set('v',String(window.CensoBuild?.version || 'runtime'));
    const {initNovemberTheme}=await import(url.href);
    return initNovemberTheme(app,{managed:true});
  }
  if (season.load==='christmas') {
    const [{initChristmasTheme},{createSnowfall},{createSnowMountains},{createChristmasLights},{createChristmasFireworks},{createChristmasScene},{createChristmasSky},{createChristmasVillage},{createChristmasAudio}]=await Promise.all([
      load('./seasons/christmas/visuals.js'),load('./effects/snowfall.js'),
      load('./effects/snowMountains.js'),load('./effects/christmasLights.js'),
      load('./effects/christmasFireworks.js'),load('./effects/christmasScene.js'),load('./effects/christmasSky.js'),load('./effects/christmasVillage.js'),load('./effects/christmasAudio.js')
    ]);
    return initChristmasTheme(app,{config:season,createSnowfall,createSnowMountains,createChristmasLights,createChristmasFireworks,createChristmasScene,createChristmasSky,createChristmasVillage,createChristmasAudio});
  }
  throw new Error('Season has no registered renderer: '+season.id);
}
