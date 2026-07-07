from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
from datetime import datetime
import statistics
import requests
import json
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "ecoshield-local-secret-change-me")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@ecoshieldai.uz")
ADMIN_PASSWORD_HASH = os.environ.get(
    "ADMIN_PASSWORD_HASH",
    generate_password_hash("EcoShield2026")
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "static" / "data"

STATIONS = [
    {"name": "Qorako‘l", "lat": 39.507, "lon": 63.854, "ndvi": 0.41},
    {"name": "Olot", "lat": 39.415, "lon": 63.803, "ndvi": 0.43},
]


def login_required() -> bool:
    return bool(session.get("logged_in"))


def degrees_to_uzbek(deg: float) -> str:
    directions = [
        "Shimol",
        "Shimoli-sharq",
        "Sharq",
        "Janubi-sharq",
        "Janub",
        "Janubi-g‘arb",
        "G‘arb",
        "Shimoli-g‘arb",
    ]
    return directions[int((deg + 22.5) // 45) % 8]


def dust_risk_index(wind_ms: float, temperature_c: float, humidity: float) -> float:
    """
    MVP indeks:
    - shamol kuchaysa xavf oshadi;
    - harorat oshsa xavf oshadi;
    - namlik oshsa xavf kamayadi.
    Bu PM10/PM2.5 fizik o‘lchovi emas.
    """
    wind_component = min(max(wind_ms / 12.0, 0), 1) * 0.55
    temp_component = min(max((temperature_c - 20.0) / 25.0, 0), 1) * 0.25
    dry_component = min(max((55.0 - humidity) / 55.0, 0), 1) * 0.20
    return round(min(max(wind_component + temp_component + dry_component, 0), 1), 2)


def dust_risk_label(index: float) -> str:
    if index < 0.30:
        return "Past"
    if index < 0.55:
        return "O‘rta"
    if index < 0.75:
        return "Yuqori"
    return "Juda yuqori"


def fetch_station_monitoring(station: dict) -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={station['lat']}&longitude={station['lon']}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,"
        "wind_direction_10m,wind_gusts_10m"
        "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,"
        "wind_direction_10m"
        "&daily=temperature_2m_max,temperature_2m_min"
        "&wind_speed_unit=ms"
        "&forecast_days=1"
        "&timezone=auto"
    )

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        payload = response.json()

        current = payload.get("current", {})
        hourly = payload.get("hourly", {})
        daily = payload.get("daily", {})

        current_temperature = float(current.get("temperature_2m", 0))
        humidity = float(current.get("relative_humidity_2m", 0))
        wind_speed = float(current.get("wind_speed_10m", 0))
        wind_direction = float(current.get("wind_direction_10m", 0))
        wind_gust = float(current.get("wind_gusts_10m", wind_speed))

        hourly_times = hourly.get("time", [])[:24]
        hourly_temperatures = [float(x) for x in hourly.get("temperature_2m", [])[:24]]
        hourly_humidity = [float(x) for x in hourly.get("relative_humidity_2m", [])[:24]]
        hourly_wind = [float(x) for x in hourly.get("wind_speed_10m", [])[:24]]

        hourly_dust = []
        for idx in range(min(len(hourly_temperatures), len(hourly_humidity), len(hourly_wind))):
            hourly_dust.append(
                dust_risk_index(
                    hourly_wind[idx],
                    hourly_temperatures[idx],
                    hourly_humidity[idx],
                )
            )

        tmax = float((daily.get("temperature_2m_max") or [current_temperature])[0])
        tmin = float((daily.get("temperature_2m_min") or [current_temperature])[0])
        current_dust = dust_risk_index(wind_speed, current_temperature, humidity)

        return {
            "name": station["name"],
            "lat": station["lat"],
            "lon": station["lon"],
            "current_temperature": round(current_temperature, 1),
            "min_temperature": round(tmin, 1),
            "max_temperature": round(tmax, 1),
            "humidity": round(humidity, 1),
            "wind_speed_ms": round(wind_speed, 1),
            "wind_gust_ms": round(wind_gust, 1),
            "wind_direction_deg": round(wind_direction, 1),
            "wind_direction_text": degrees_to_uzbek(wind_direction),
            "dust_index": current_dust,
            "dust_risk": dust_risk_label(current_dust),
            "ndvi": station["ndvi"],
            "hours": hourly_times,
            "hourly_temperature": hourly_temperatures,
            "hourly_dust_index": hourly_dust,
            "updated_at": current.get("time", ""),
            "source": "Open-Meteo",
        }

    except Exception:
        current_temperature = 38.0 if station["name"] == "Qorako‘l" else 37.0
        wind_speed = 6.6 if station["name"] == "Qorako‘l" else 6.9
        humidity = 18.0
        wind_direction = 315.0
        dust_index = dust_risk_index(wind_speed, current_temperature, humidity)
        hours = [f"{hour:02d}:00" for hour in range(24)]
        temperatures = [27,26,25,25,24,24,25,26,28,31,34,36,37,38,39,40,39,39,38,37,36,34,32,30]
        dust_values = [
            dust_risk_index(wind_speed * (0.72 + i / 48), temp, humidity)
            for i, temp in enumerate(temperatures)
        ]

        return {
            "name": station["name"],
            "lat": station["lat"],
            "lon": station["lon"],
            "current_temperature": current_temperature,
            "min_temperature": 23.0,
            "max_temperature": 41.0,
            "humidity": humidity,
            "wind_speed_ms": wind_speed,
            "wind_gust_ms": 11.2,
            "wind_direction_deg": wind_direction,
            "wind_direction_text": degrees_to_uzbek(wind_direction),
            "dust_index": dust_index,
            "dust_risk": dust_risk_label(dust_index),
            "ndvi": station["ndvi"],
            "hours": hours,
            "hourly_temperature": temperatures,
            "hourly_dust_index": dust_values,
            "updated_at": "offline-demo",
            "source": "Offline demo",
        }


def get_monitoring_payload() -> dict:
    stations = [fetch_station_monitoring(station) for station in STATIONS]
    strongest = max(stations, key=lambda item: item["wind_speed_ms"])
    primary = stations[0]

    return {
        "stations": stations,
        "summary": {
            "current_temperature": primary["current_temperature"],
            "min_temperature": primary["min_temperature"],
            "max_temperature": primary["max_temperature"],
            "wind_speed_ms": round(statistics.mean(x["wind_speed_ms"] for x in stations), 1),
            "wind_gust_ms": max(x["wind_gust_ms"] for x in stations),
            "wind_direction_deg": strongest["wind_direction_deg"],
            "wind_direction_text": strongest["wind_direction_text"],
            "dust_index": round(statistics.mean(x["dust_index"] for x in stations), 2),
            "dust_risk": dust_risk_label(statistics.mean(x["dust_index"] for x in stations)),
            "ndvi": round(statistics.mean(x["ndvi"] for x in stations), 2),
            "monitoring_points": 12,
            "open_soil_percent": 17.6,
            "updated_at": primary["updated_at"],
            "source": primary["source"],
        },
    }


@app.route("/")
def home():
    return redirect(url_for("dashboard")) if login_required() else redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        if email == ADMIN_EMAIL and check_password_hash(ADMIN_PASSWORD_HASH, password):
            session["logged_in"] = True
            session["user_email"] = email
            return redirect(url_for("dashboard"))

        flash("Email yoki parol noto‘g‘ri.")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard")
def dashboard():
    if not login_required():
        return redirect(url_for("login"))
    return render_template("dashboard.html")


@app.route("/hudud-xaritasi")
def map_page():
    if not login_required():
        return redirect(url_for("login"))
    return render_template("map.html")


@app.route("/api/daily-monitoring")
def daily_monitoring():
    return jsonify(get_monitoring_payload())


@app.route("/api/risk-zones")
def risk_zones():
    path = DATA_DIR / "risk_zones.geojson"
    return jsonify(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
