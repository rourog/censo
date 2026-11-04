/* Static snow drifts: three SVG planes, no animation or DOM observers. */
export function createSnowMountains(host) {
  if(!host)return {dispose(){},getStatus:()=>({layers:0})};
  const wrapper=document.createElement('div');
  wrapper.className='christmas-snow-mountains';
  wrapper.setAttribute('aria-hidden','true');
  wrapper.innerHTML=`
    <svg viewBox="0 0 1200 240" preserveAspectRatio="none" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id="christmasFarSnow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cadde9" stop-opacity=".30"/>
          <stop offset="100%" stop-color="#94adbc" stop-opacity=".38"/>
        </linearGradient>
        <linearGradient id="christmasMidSnow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e4eff6" stop-opacity=".46"/>
          <stop offset="100%" stop-color="#b8d0de" stop-opacity=".54"/>
        </linearGradient>
        <linearGradient id="christmasFrontSnow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f4faff" stop-opacity=".62"/>
          <stop offset="100%" stop-color="#c9dce8" stop-opacity=".72"/>
        </linearGradient>
      </defs>
      <path fill="url(#christmasFarSnow)" d="M0 175 Q130 151 260 168 Q375 136 500 160 Q620 130 752 165 Q875 137 970 157 Q1080 140 1200 170 L1200 240 L0 240Z"/>
      <path fill="url(#christmasMidSnow)" d="M0 191 Q130 168 245 185 Q352 166 480 191 Q610 155 730 186 Q845 158 946 187 Q1060 164 1200 184 L1200 240 L0 240Z"/>
      <path fill="url(#christmasFrontSnow)" d="M0 210 Q122 187 254 211 Q380 187 506 209 Q629 185 750 209 Q890 188 1000 207 Q1115 186 1200 204 L1200 240 L0 240Z"/>
    </svg>`;
  host.appendChild(wrapper);
  return {
    getStatus:()=>({layers:3,animated:false}),
    dispose(){wrapper.remove();}
  };
}
