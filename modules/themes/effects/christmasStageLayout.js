/* Shared viewport geometry. Patient count affects visibility, never sprite scale. */
export const HOSPITAL_RATIO=720/115;
export const CHARACTER_SCALE=.65;
export const TREE_SCALE=.8;
export function getChristmasStageLayout(width){
  const hospitalWidth=Math.min(720,width*.48,width*.52-108);
  const hospitalLeft=(width-hospitalWidth)/2,hospitalRight=hospitalLeft+hospitalWidth;
  const treeWidth=136*TREE_SCALE,snowmanWidth=96*CHARACTER_SCALE*1.4,gap=20;
  const treeCenter=Math.min(width*.22,hospitalLeft-gap-treeWidth/2);
  const snowmanCenter=Math.max(width*.78,hospitalRight+gap+snowmanWidth/2);
  return {hospitalWidth,hospitalHeight:hospitalWidth/HOSPITAL_RATIO,hospitalLeft,hospitalRight,
    treeCenter,treeLeft:treeCenter-treeWidth/2,treeRight:treeCenter+treeWidth/2,
    snowmanLeft:snowmanCenter-snowmanWidth/2,snowmanRight:snowmanCenter+snowmanWidth/2};
}
