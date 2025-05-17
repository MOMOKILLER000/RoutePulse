import React, { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import Loading from "../../components/Loading";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import styles from "../../styles/TransportPages/CO2.module.css";

// pick a color by AQI
function getColor(aqi) {
    if (aqi === null) return "#999";
    if (aqi <= 50) return "green";
    if (aqi <= 100) return "yellow";
    return "red";
}
// pick a radius by AQI
function getRadius(aqi) {
    if (aqi === null) return 12;
    if (aqi <= 50) return 13;
    if (aqi <= 100) return 14;
    return 15;
}

// legend entries for AQI
const legendItems = [
    { color: "green", label: "≤ 50 AQI" },
    { color: "yellow", label: "51 – 100 AQI" },
    { color: "red", label: "> 100 AQI" },
];

export default function RomaniaAirQualityMap() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // fetch data
    useEffect(() => {
        fetch("http://localhost:8000/api/air_quality_points/")
            .then((res) => res.json())
            .then((data) => {
                setStations(data.data);
                setLoading(false);
            })
            .catch((err) => {
                setError("Failed to load data: " + err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className={styles.body}>
                <div className={styles.navbarAdjust}>
                    <Navbar />
                </div>
                <div className={styles.status}>
                    <Loading />
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className={styles.body}>
                <div className={styles.navbarAdjust}>
                    <Navbar />
                </div>
                <p className={styles.error}>{error}</p>
            </div>
        );
    }

    return (
        <div className={styles.body}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <div className={styles.pageWrapper}>
                <h1 className={styles.title}>
                    Air Quality Stations Across Romania
                </h1>
                <p className={styles.subtitle}>
                    Real‑time AQI readings from monitoring stations across the country.
                </p>

                <div className={styles.mapContainer}>
                    <MapContainer
                        className={styles.leafletContainer}
                        center={[45.9432, 24.9668]}
                        zoom={7}
                        scrollWheelZoom
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {stations.map((s, idx) => (
                            <CircleMarker
                                key={idx}
                                center={[s.latitude, s.longitude]}
                                radius={getRadius(s.aqi)}
                                pathOptions={{
                                    color: getColor(s.aqi),
                                    fillColor: getColor(s.aqi),
                                    fillOpacity: 0.7,
                                }}
                            >
                                <Popup>
                                    <strong>AQI:</strong>{" "}
                                    {s.aqi === null ? "Unknown" : s.aqi}
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MapContainer>

                    {/* AQI Legend */}
                    <div className={styles.legend}>
                        <h4>AQI Levels</h4>
                        {legendItems.map((item) => (
                            <div key={item.label} className={styles["legend-item"]}>
                <span
                    className={styles["legend-color"]}
                    style={{ background: item.color }}
                />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.footerWrap}>
                <Footer />
            </div>
        </div>
    );
}