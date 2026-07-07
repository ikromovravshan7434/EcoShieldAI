let chartInstance = null;

function riskDescription(label) {
  const descriptions = {
    "Past": "Chang ko‘tarilishi ehtimoli past",
    "O‘rta": "Mahalliy chang ko‘tarilishi mumkin",
    "Yuqori": "Kuchli chang ko‘tarilishi ehtimoli yuqori",
    "Juda yuqori": "Chang bo‘roni xavfi juda yuqori"
  };
  return descriptions[label] || "Hisoblangan xavf indeksi";
}

function renderChart(labels, temperatures, dustIndexes) {
  const context = document.getElementById("dailyChart");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(context, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Harorat",
          data: temperatures,
          borderColor: "#ff9f32",
          backgroundColor: "rgba(255,159,50,.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          yAxisID: "y"
        },
        {
          label: "Chang xavfi",
          data: dustIndexes,
          borderColor: "#ff5e54",
          backgroundColor: "rgba(255,94,84,.12)",
          borderDash: [6, 5],
          fill: true,
          tension: 0.35,
          pointRadius: 1.5,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#9fb5b1", maxTicksLimit: 8 },
          grid: { color: "rgba(255,255,255,.05)" }
        },
        y: {
          ticks: { color: "#9fb5b1" },
          grid: { color: "rgba(255,255,255,.05)" }
        },
        y1: {
          position: "right",
          min: 0,
          max: 1,
          ticks: { color: "#ff746d" },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

async function loadDashboard() {
  try {
    const response = await fetch("/api/daily-monitoring");
    if (!response.ok) throw new Error("Monitoring ma’lumotlari olinmadi.");

    const data = await response.json();
    const summary = data.summary;

    document.getElementById("currentTemp").textContent = `${summary.current_temperature}°C`;
    document.getElementById("minTemp").textContent = `${summary.min_temperature}°C`;
    document.getElementById("maxTemp").textContent = `${summary.max_temperature}°C`;
    document.getElementById("dustRisk").textContent = summary.dust_risk;
    document.getElementById("dustText").textContent = riskDescription(summary.dust_risk);
    document.getElementById("dustProgress").style.width = `${summary.dust_index * 100}%`;
    document.getElementById("windSpeed").textContent = summary.wind_speed_ms;
    document.getElementById("windDirection").textContent = summary.wind_direction_text;
    document.getElementById("windGust").textContent = `${summary.wind_gust_ms} m/s`;
    document.getElementById("ndviValue").textContent = summary.ndvi;
    document.getElementById("ndviMarker").style.left = `${summary.ndvi * 100}%`;
    document.getElementById("monitoringPoints").textContent = summary.monitoring_points;
    document.getElementById("openSoil").textContent = `${summary.open_soil_percent}%`;
    document.getElementById("dataSource").textContent = `${summary.source} / ochiq ma’lumotlar`;
    document.getElementById("updatedAt").textContent = `Yangilanish: ${summary.updated_at || "--"}`;

    const regionCards = document.getElementById("regionCards");
    regionCards.innerHTML = "";

    data.stations.forEach(station => {
      const card = document.createElement("div");
      card.className = "region-item";
      card.innerHTML = `
        <div class="region-title">
          <strong>${station.name}</strong>
          <span>● Jonli</span>
        </div>
        <div class="region-stats">
          <div><small>Harorat</small><b>${station.current_temperature}°C</b></div>
          <div><small>Shamol</small><b>${station.wind_speed_ms} m/s</b></div>
          <div><small>Chang xavfi</small><b>${station.dust_risk}</b></div>
        </div>
        <p>NDVI: <b>${station.ndvi}</b></p>
      `;
      regionCards.appendChild(card);
    });

    const first = data.stations[0];
    const labels = first.hours.map(time => time.includes("T") ? time.split("T")[1] : time);
    renderChart(labels, first.hourly_temperature, first.hourly_dust_index);

  } catch (error) {
    console.error(error);
  }
}

loadDashboard();
setInterval(loadDashboard, 300000);
