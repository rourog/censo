/* Seasonal Engine 2.0 - central catalog, independent from application wiring. */
import november from './seasons/november/config.js';
import {isSeasonInRange} from './calendar.js';
import {getPreviewSeason,isDecorationEnabled} from './preferences.js';

export const seasons=Object.freeze([november]);
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
  throw new Error('Season has no registered renderer: '+season.id);
}
