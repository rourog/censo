/* Shared viewport geometry. Patient count affects visibility, never sprite scale. */
export const HOSPITAL_RATIO=720/115;
export const CHARACTER_SCALE=.65;
export const TREE_SCALE=.8;
export const ROAD_HEIGHT=44;
export const PEDESTRIAN_BOTTOM=ROAD_HEIGHT-6;
export const VEHICLE_BOTTOM=4;
// Use the final 650 ms to ease into the raised parking plane, then reverse on exit.
export function getVehicleParkingPose(elapsed,departureElapsed,geometry){
  const t=Math.max(0,Math.min(1,departureElapsed==null?(elapsed-2350)/650:1-departureElapsed/650));
  const depth=t*t*(3-2*t);
  return {front:elapsed>=2350&&(departureElapsed==null||departureElapsed<650),depth,scale:1-.12*depth,lift:(geometry.parkingBottom-geometry.vehicleBottom)*depth};
}
export function getChristmasStageLayout(width){
  const hospitalWidth=Math.min(720,width*.48,width*.52-108);
  const hospitalLeft=(width-hospitalWidth)/2,hospitalRight=hospitalLeft+hospitalWidth;
  const treeWidth=136*TREE_SCALE,snowmanWidth=96*CHARACTER_SCALE*1.4,gap=20;
  const treeCenter=Math.min(width*.22,hospitalLeft-gap-treeWidth/2);
  const snowmanCenter=Math.max(width*.78,hospitalRight+gap+snowmanWidth/2);
  return {roadHeight:ROAD_HEIGHT,pedestrianBottom:PEDESTRIAN_BOTTOM,vehicleBottom:VEHICLE_BOTTOM,parkingBottom:ROAD_HEIGHT-8,hospitalBottom:ROAD_HEIGHT,hospitalWidth,hospitalHeight:hospitalWidth/HOSPITAL_RATIO,hospitalLeft,hospitalRight,
    treeCenter,treeLeft:treeCenter-treeWidth/2,treeRight:treeCenter+treeWidth/2,
    snowmanLeft:snowmanCenter-snowmanWidth/2,snowmanRight:snowmanCenter+snowmanWidth/2};
}
