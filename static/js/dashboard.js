async function loadWindDashboard(){
  try{
    const res = await fetch('/api/wind-live');
    const data = await res.json();
    const s = data.summary;
    document.getElementById('avgWind').textContent = `${s.average_speed_ms} m/s`;
    document.getElementById('domDirection').textContent = s.dominant_direction;
    document.getElementById('peakStation').textContent = s.peak_station;
    document.getElementById('peakSpeed').textContent = `${s.peak_speed_ms} m/s`;
    document.getElementById('liveUpdateTime').textContent = s.updated_at || 'yangilandi';

    const grid = document.getElementById('stationGrid');
    grid.innerHTML = '';
    data.stations.forEach(st => {
      let riskClass = 'risk-' + (st.risk.split(' ')[0] || st.risk);
      const card = document.createElement('article');
      card.className = 'station-item';
      card.innerHTML = `
        <div class="station-top">
          <div class="station-name">${st.name}</div>
          <div class="station-risk ${riskClass}">${st.risk}</div>
        </div>
        <div class="station-meta">
          <div><label>Tezlik</label><strong>${st.speed_ms} m/s</strong></div>
          <div><label>Yo‘nalish</label><strong>${st.direction_text}</strong></div>
          <div><label>Gradus</label><strong>${st.direction_deg}°</strong></div>
        </div>
      `;
      grid.appendChild(card);
    });
  }catch(e){
    console.error(e);
  }
}
loadWindDashboard();
setInterval(loadWindDashboard, 300000);
