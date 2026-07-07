from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from pathlib import Path
import json
import requests

app = Flask(__name__)
app.secret_key = "ecoshield-hudud-xaritasi-secret"

DEMO_EMAIL = "demo@ecoshield.uz"
DEMO_PASSWORD = "EcoShield2026"

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "static" / "data"

STATIONS = [
    {"name": "Qorako‘l", "lat": 39.507, "lon": 63.854},
    {"name": "Olot", "lat": 39.415, "lon": 63.803},
]

def degrees_to_uzbek(deg: float) -> str:
    dirs = [
        "Shimol", "Shimoli-sharq", "Sharq", "Janubi-sharq",
        "Janub", "Janubi-g‘arb", "G‘arb", "Shimoli-g‘arb"
    ]
    idx = int((deg + 22.5) // 45) % 8
    return dirs[idx]

def risk_level(speed_ms: float) -> str:
    if speed_ms < 4:
        return "Past"
    elif speed_ms < 7:
        return "O‘rta"
    elif speed_ms < 10:
        return "Yuqori"
    return "Juda yuqori"

def fetch_station_wind(station: dict) -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={station['lat']}&longitude={station['lon']}"
        "&current=wind_speed_10m,wind_direction_10m"
        "&wind_speed_unit=ms"
        "&timezone=auto"
    )
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json().get("current", {})
        speed = float(data.get("wind_speed_10m", 0))
        direction = float(data.get("wind_direction_10m", 0))
        return {
            "name": station["name"],
            "lat": station["lat"],
            "lon": station["lon"],
            "speed_ms": round(speed, 1),
            "direction_deg": round(direction, 1),
            "direction_text": degrees_to_uzbek(direction),
            "risk": risk_level(speed),
            "updated_at": data.get("time", ""),
        }
    except Exception:
        fallback = {
            "Qorako‘l": {"speed_ms": 8.8, "direction_deg": 315.0},
            "Olot": {"speed_ms": 7.4, "direction_deg": 290.0},
        }
        item = fallback.get(station["name"], {"speed_ms": 6.0, "direction_deg": 270.0})
        return {
            "name": station["name"],
            "lat": station["lat"],
            "lon": station["lon"],
            "speed_ms": item["speed_ms"],
            "direction_deg": item["direction_deg"],
            "direction_text": degrees_to_uzbek(item["direction_deg"]),
            "risk": risk_level(item["speed_ms"]),
            "updated_at": "offline-demo",
        }

def get_wind_payload():
    stations = [fetch_station_wind(s) for s in STATIONS]
    avg_speed = round(sum(s["speed_ms"] for s in stations) / max(len(stations), 1), 1)
    dominant = max(stations, key=lambda x: x["speed_ms"])
    return {
        "stations": stations,
        "summary": {
            "average_speed_ms": avg_speed,
            "dominant_direction": dominant["direction_text"],
            "peak_speed_ms": dominant["speed_ms"],
            "peak_station": dominant["name"],
            "updated_at": dominant["updated_at"],
        }
    }

@app.route("/")
def home():
    return redirect(url_for("dashboard")) if session.get("logged_in") else redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        if email == DEMO_EMAIL and password == DEMO_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
        flash("Email yoki parol noto‘g‘ri.")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/dashboard")
def dashboard():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return render_template("dashboard.html")

@app.route("/hudud-xaritasi")
def map_page():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return render_template("map.html")

@app.route("/api/risk-zones")
def risk_zones():
    path = DATA_DIR / "risk_zones.geojson"
    return jsonify(json.loads(path.read_text(encoding="utf-8")))

@app.route("/api/wind-live")
def wind_live():
    return jsonify(get_wind_payload())

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
