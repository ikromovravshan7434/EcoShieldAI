const map = L.map("map", { zoomControl: false }).setView([39.48, 63.82], 9);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

const riskLayer = L.layerGroup().addTo(map);
const windLayer = L.layerGroup().addTo(map);
const sandLayer = L.layerGroup().addTo(map);
const ndviLayer = L.layerGroup().addTo(map);
const greenBarrierLayer = L.layerGroup().addTo(map);

const riskColors = {
  "Past": "#23d16f",
  "O‘rta": "#ff9f19",
  "O'rta": "#ff9f19",
  "Yuqori": "#ff4b3a",
  "Juda yuqori": "#ff3d2f"
};

function flowBearing(windFromDegrees) {
  return (Number(windFromDegrees) + 180) % 360;
}

function cssRotation(flowDegrees) {
  return (flowDegrees - 90 + 360) % 360;
}

function destinationPoint(lat, lon, bearingDeg, distanceDeg) {
  const rad = bearingDeg * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const endLat = lat + Math.cos(rad) * distanceDeg;
  const correction = Math.max(Math.cos(latRad), 0.25);
  const endLon = lon + (Math.sin(rad) * distanceDeg) / correction;
  return [endLat, endLon];
}

function bearingText(deg) {
  const names = [
    "Shimol–janub",
    "Shimoli-sharq–janubi-g‘arb",
    "Sharq–g‘arb",
    "Janubi-sharq–shimoli-g‘arb"
  ];
  return names[Math.round((((deg % 180) + 180) % 180) / 45) % 4];
}

function createWindMarker(lat, lon, speed, direction) {
  const flow = flowBearing(direction);
  return L.marker([lat, lon], {
    icon: L.divIcon({
      className: "blue-wind-arrow-wrap",
      html: `<div class="blue-wind-arrow" style="transform:rotate(${cssRotation(flow)}deg)">➤</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  });
}

function addWindField(stations) {
  windLayer.clearLayers();

  stations.forEach(station => {
    const center = [station.lat, station.lon];
    const offsets = [
      [0,0], [0.10,0.08], [-0.12,0.10], [0.08,-0.12], [-0.10,-0.10],
      [0.18,0.02], [-0.18,0.02], [0.02,0.18], [0.02,-0.18]
    ];

    offsets.forEach(([dlat, dlon], index) => {
      const marker = createWindMarker(
        center[0] + dlat,
        center[1] + dlon,
        station.wind_speed_ms,
        station.wind_direction_deg
      );

      if (index === 0) {
        marker.bindPopup(`
          <strong>${station.name}</strong><br>
          Shamol tezligi: ${station.wind_speed_ms} m/s<br>
          Yo‘nalish: ${station.wind_direction_text}
        `);
      }

      windLayer.addLayer(marker);
    });
  });
}

function createCurvedSandFlow(station, bearingOffset = 0, distanceFactor = 1) {
  const flow = flowBearing(station.wind_direction_deg) + bearingOffset;
  const length = (0.12 + station.wind_speed_ms * 0.014) * distanceFactor;

  const p1 = destinationPoint(station.lat, station.lon, flow + 12, length * 0.25);
  const p2 = destinationPoint(p1[0], p1[1], flow - 16, length * 0.25);
  const p3 = destinationPoint(p2[0], p2[1], flow + 11, length * 0.25);
  const end = destinationPoint(station.lat, station.lon, flow, length);

  const line = L.polyline(
    [[station.lat, station.lon], p1, p2, p3, end],
    {
      color: "#ffb000",
      weight: 3,
      opacity: 0.95,
      dashArray: "7,7",
      lineCap: "round",
      lineJoin: "round"
    }
  );

  const arrow = L.marker(end, {
    icon: L.divIcon({
      className: "gold-arrow-wrap",
      html: `<div class="gold-arrow" style="transform:rotate(${cssRotation(flow)}deg)">➤</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  });

  return { line, arrow };
}

function addSandFlows(stations) {
  sandLayer.clearLayers();

  stations.forEach(station => {
    [
      createCurvedSandFlow(station, -18, 0.90),
      createCurvedSandFlow(station, 0, 1.10),
      createCurvedSandFlow(station, 18, 1.00)
    ].forEach(flow => {
      sandLayer.addLayer(flow.line);
      sandLayer.addLayer(flow.arrow);
    });
  });
}

/*
  Tavsiya etilgan yashil to‘siq:
  1) Shamol qayerdan kelayotganini olamiz.
  2) Qum oqimi qayerga ketayotganini aniqlaymiz.
  3) Himoya yo‘lagini oqimga 90° perpendikulyar chizamiz.
  4) Shamol yo‘nalishi yangilanganda qatlam qayta chiziladi.
*/
function createGreenBarrier(station, index = 0) {
  const flow = flowBearing(station.wind_direction_deg);
  const barrierBearing = (flow + 90) % 360;

  // To‘siq qum oqimining old tomoniga joylashtiriladi.
  const barrierCenter = destinationPoint(
    station.lat,
    station.lon,
    flow,
    0.085 + station.wind_speed_ms * 0.006
  );

  const halfLength = 0.055 + station.wind_speed_ms * 0.0035;
  const left = destinationPoint(
    barrierCenter[0],
    barrierCenter[1],
    barrierBearing + 180,
    halfLength
  );
  const right = destinationPoint(
    barrierCenter[0],
    barrierCenter[1],
    barrierBearing,
    halfLength
  );

  // Asosiy tavsiya yo‘lagi
  const mainLine = L.polyline([left, right], {
    color: "#14d66f",
    weight: 10,
    opacity: 0.92,
    lineCap: "round"
  });

  // Oqartirilgan markaziy chiziq — bu tavsiya ekanini ko‘rsatadi
  const recommendationLine = L.polyline([left, right], {
    color: "#b9ffd2",
    weight: 2,
    opacity: 0.95,
    dashArray: "8,7"
  });


  // Yashil nuqtalar — tavsiya etilgan yo‘lakni yozuvsiz aniq ko‘rsatadi
  const dots = [];
  for (let index = 0; index <= 12; index++) {
    const t = index / 12;
    const lat = left[0] + (right[0] - left[0]) * t;
    const lon = left[1] + (right[1] - left[1]) * t;

    dots.push(
      L.circleMarker([lat, lon], {
        radius: 4.2,
        color: "#b9ffd2",
        fillColor: "#22dc72",
        fillOpacity: 0.95,
        opacity: 0.95,
        weight: 1.2
      })
    );
  }

  // Himoya ta’siri zonasi
  const effectLeft = destinationPoint(left[0], left[1], flow, 0.055);
  const effectRight = destinationPoint(right[0], right[1], flow, 0.055);
  const effectZone = L.polygon(
    [left, right, effectRight, effectLeft],
    {
      color: "#2de683",
      fillColor: "#2de683",
      weight: 1.5,
      fillOpacity: 0.16,
      opacity: 0.65,
      dashArray: "6,6"
    }
  );

  const estimatedLengthKm = Math.max(2.8, 3.2 + station.wind_speed_ms * 0.18).toFixed(1);

  [mainLine, recommendationLine, effectZone].forEach(layer => {
    layer.bindPopup(`
      <strong>${station.name}</strong><br>
      Tavsiya etilgan yashil himoya yo‘lagi<br>
      Yo‘nalish: ${bearingText(barrierBearing)}<br>
      Taxminiy uzunlik: ${estimatedLengthKm} km<br>
      Tavsiya etilgan kenglik: 25–40 m<br>
      <em>Bu mavjud daraxtzor emas, tavsiya hisoblanadi.</em>
    `);
  });

  return {
    mainLine,
    recommendationLine,
    effectZone,
    dots,
    barrierBearing,
    estimatedLengthKm
  };
}

function addGreenBarriers(stations) {
  greenBarrierLayer.clearLayers();

  let primaryRecommendation = null;

  stations.forEach((station, index) => {
    const barrier = createGreenBarrier(station, index);

    greenBarrierLayer.addLayer(barrier.effectZone);
    greenBarrierLayer.addLayer(barrier.mainLine);
    greenBarrierLayer.addLayer(barrier.recommendationLine);
    barrier.dots.forEach(dot => greenBarrierLayer.addLayer(dot));

    if (index === 0) primaryRecommendation = barrier;
  });

  if (primaryRecommendation) {
    document.getElementById("greenBarrierDirection").textContent =
      bearingText(primaryRecommendation.barrierBearing);
    document.getElementById("greenBarrierLength").textContent =
      `${primaryRecommendation.estimatedLengthKm} km`;
  }
}

async function loadRiskZones() {
  const response = await fetch("/api/risk-zones");
  const data = await response.json();

  riskLayer.clearLayers();

  const geo = L.geoJSON(data, {
    style: feature => ({
      color: riskColors[feature.properties.risk] || "#23d16f",
      fillColor: riskColors[feature.properties.risk] || "#23d16f",
      fillOpacity: 0.32,
      weight: 2.5
    }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`
        <strong>${feature.properties.name}</strong><br>
        Xavf: ${feature.properties.risk}<br>
        Maydon: ${feature.properties.area_ha} ga
      `);
    }
  });

  geo.eachLayer(layer => riskLayer.addLayer(layer));
  map.fitBounds(geo.getBounds(), { padding: [35, 35] });
}

function addNdviLayer(stations) {
  ndviLayer.clearLayers();

  stations.forEach(station => {
    const color = Number(station.ndvi) >= 0.5 ? "#4ad45d" : "#8fd54e";

    ndviLayer.addLayer(
      L.circle([station.lat, station.lon], {
        radius: 17000,
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5
      }).bindPopup(`<strong>${station.name}</strong><br>NDVI: ${station.ndvi}`)
    );
  });
}

function updateCards(summary) {
  document.getElementById("topWindSpeed").textContent = `${summary.wind_speed_ms} m/s`;
  document.getElementById("topWindDirection").textContent = summary.wind_direction_text;
  document.getElementById("topTemperature").textContent = `${summary.current_temperature}°C`;
  document.getElementById("topNdvi").textContent = summary.ndvi;
  document.getElementById("ndviScaleMarker").style.left = `${summary.ndvi * 100}%`;
  document.getElementById("mapUpdatedTime").textContent = summary.updated_at || "--";
}

async function loadMapData() {
  const response = await fetch("/api/daily-monitoring");
  const data = await response.json();

  updateCards(data.summary);
  addWindField(data.stations);
  addSandFlows(data.stations);
  addNdviLayer(data.stations);
  addGreenBarriers(data.stations);
}

document.getElementById("riskToggle").addEventListener("change", event => {
  event.target.checked ? map.addLayer(riskLayer) : map.removeLayer(riskLayer);
});

document.getElementById("windToggle").addEventListener("change", event => {
  event.target.checked ? map.addLayer(windLayer) : map.removeLayer(windLayer);
});

document.getElementById("sandToggle").addEventListener("change", event => {
  event.target.checked ? map.addLayer(sandLayer) : map.removeLayer(sandLayer);
});

document.getElementById("ndviToggle").addEventListener("change", event => {
  event.target.checked ? map.addLayer(ndviLayer) : map.removeLayer(ndviLayer);
});

document.getElementById("greenBarrierToggle").addEventListener("change", event => {
  event.target.checked ? map.addLayer(greenBarrierLayer) : map.removeLayer(greenBarrierLayer);
});

document.getElementById("refreshMapBtn").addEventListener("click", loadMapData);
document.getElementById("zoomPlus").addEventListener("click", () => map.zoomIn());
document.getElementById("zoomMinus").addEventListener("click", () => map.zoomOut());
document.getElementById("locateMap").addEventListener("click", () => map.setView([39.48, 63.82], 9));

document.getElementById("fullscreenMap").addEventListener("click", () => {
  const shell = document.querySelector(".image-map-shell");
  if (!document.fullscreenElement) shell.requestFullscreen();
  else document.exitFullscreen();
});

loadRiskZones();
loadMapData();
setInterval(loadMapData, 300000);
setTimeout(() => map.invalidateSize(), 250);
