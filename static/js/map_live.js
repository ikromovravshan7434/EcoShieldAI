const map = L.map('map', {zoomControl:true}).setView([39.47, 63.83], 9);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

const riskColors = {
  'Past': '#68c977',
  'O‘rta': '#e4c560',
  "O'rta": '#e4c560',
  'Yuqori': '#e68d46',
  'Juda yuqori': '#d55c5c'
};

let riskLayer = L.layerGroup().addTo(map);
let windLayer = L.layerGroup().addTo(map);
let sandLayer = L.layerGroup().addTo(map);

function windIcon(speed, directionDeg){
  const size = Math.max(42, Math.min(62, 40 + speed * 1.4));
  return L.divIcon({
    className: 'wind-icon-wrapper',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="wind-arrow" style="transform:rotate(${directionDeg}deg);width:${size}px;height:${size}px;">
          <span>➤</span>
        </div>
        <div class="wind-label">${speed} m/s</div>
      </div>
    `,
    iconSize: [72, 74],
    iconAnchor: [36, 37]
  });
}

function createSandFlow(lat, lon, directionDeg, speed){
  const length = 0.08 + speed * 0.008;
  const rad = (directionDeg - 180) * Math.PI / 180.0;
  const endLat = lat + Math.cos(rad) * length;
  const endLon = lon + Math.sin(rad) * length;
  const line = L.polyline([[lat, lon], [endLat, endLon]], {
    color: '#f6c26f',
    weight: Math.max(2, speed / 2),
    opacity: 0.9,
    dashArray: '8, 12'
  });
  const trail = [];
  for(let i=1;i<=4;i++){
    const t = i / 5;
    trail.push(L.circleMarker(
      [lat + (endLat-lat)*t, lon + (endLon-lon)*t],
      {
        radius: 2 + i,
        color: '#f6c26f',
        fillColor: '#f6c26f',
        fillOpacity: 0.20 + i*0.15,
        weight: 0
      }
    ));
  }
  return { line, trail };
}

async function loadRiskZones(){
  const res = await fetch('/api/risk-zones');
  const data = await res.json();
  riskLayer.clearLayers();
  const geo = L.geoJSON(data, {
    style: f => ({
      color: riskColors[f.properties.risk] || '#68c977',
      fillColor: riskColors[f.properties.risk] || '#68c977',
      fillOpacity: 0.25,
      weight: 2
    }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`
        <strong>${feature.properties.name}</strong><br>
        Xavf: ${feature.properties.risk}<br>
        Maydon: ${feature.properties.area_ha} ga
      `);
    }
  });
  riskLayer.addLayer(geo);
  map.fitBounds(geo.getBounds(), {padding:[25,25]});
}

async function loadWindLive(){
  try{
    const res = await fetch('/api/wind-live');
    const data = await res.json();
    windLayer.clearLayers();
    sandLayer.clearLayers();

    document.getElementById('mapAvgWind').textContent = `${data.summary.average_speed_ms} m/s`;
    document.getElementById('mapDirection').textContent = data.summary.dominant_direction;

    data.stations.forEach(st => {
      const marker = L.marker([st.lat, st.lon], {
        icon: windIcon(st.speed_ms, st.direction_deg)
      }).bindPopup(`
        <strong>${st.name}</strong><br>
        Shamol tezligi: ${st.speed_ms} m/s<br>
        Shamol yo‘nalishi: ${st.direction_text}<br>
        Yangilangan: ${st.updated_at}
      `);
      windLayer.addLayer(marker);

      const sand = createSandFlow(st.lat, st.lon, st.direction_deg, st.speed_ms);
      sand.line.bindPopup(`<strong>${st.name}</strong><br>Qum ko‘chishi ehtimoliy oqimi`);
      sandLayer.addLayer(sand.line);
      sand.trail.forEach(t => sandLayer.addLayer(t));
    });
  }catch(e){
    console.error(e);
  }
}

document.getElementById('riskToggle').addEventListener('change', e => {
  e.target.checked ? map.addLayer(riskLayer) : map.removeLayer(riskLayer);
});
document.getElementById('windToggle').addEventListener('change', e => {
  e.target.checked ? map.addLayer(windLayer) : map.removeLayer(windLayer);
});
document.getElementById('sandToggle').addEventListener('change', e => {
  e.target.checked ? map.addLayer(sandLayer) : map.removeLayer(sandLayer);
});

loadRiskZones();
loadWindLive();
setInterval(loadWindLive, 300000);
