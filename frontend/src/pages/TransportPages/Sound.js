import React, { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../../styles/TransportPages/Sound.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const getColor = (decibels) => {
    if (decibels == null) return "#999";
    if (decibels < 55) return "#2ecc71";
    if (decibels < 70) return "#f1c40f";
    if (decibels < 85) return "#e67e22";
    return "#e74c3c";
};

export default function PolutionMap() {
    const [points, setPoints] = useState([]);
    const [center, setCenter] = useState([47.1585, 27.6014]);

    useEffect(() => {
        fetch("http://localhost:8000/api/sound_polution/")
            .then((res) => res.json())
            .then((data) => setPoints(data))
            .catch((err) =>
                console.error("Failed to load pollution points:", err)
            );
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => setCenter([coords.latitude, coords.longitude]),
                (err) =>
                    console.warn("Geolocation failed, using default center:", err)
            );
        }
    }, []);

    const legendItems = [
        { color: "#2ecc71", label: "< 55 dB" },
        { color: "#f1c40f", label: "55 – 69 dB" },
        { color: "#e67e22", label: "70 – 84 dB" },
        { color: "#e74c3c", label: "≥ 85 dB" },
    ];

    return (
        <div className={styles.body}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <div className={styles.pageWrapper}>
                <h2 className={styles.title}>Phonic Pollution Map</h2>
                <p className={styles.subtitle}>
                    This map displays real-time decibel levels detected in
                    different areas of the city. The color of each point
                    reflects the severity of noise pollution.
                </p>

                <div className={styles.mapContainer}>
                    <MapContainer
                        center={center}
                        zoom={13}
                        scrollWheelZoom
                        style={{ height: "100%", width: "100%" }}  // ← this is essential!
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                        />

                        {points.map((p) => (
                            <CircleMarker
                                key={p.id}
                                center={[p.latitude, p.longitude]}
                                radius={12}
                                pathOptions={{
                                    color: getColor(p.decibels),
                                    fillColor: getColor(p.decibels),
                                    fillOpacity: 0.7,
                                }}
                            >
                                <Popup>
                                    <strong>Decibels:</strong>{" "}
                                    {p.decibels != null
                                        ? Math.floor(p.decibels)
                                        : "N/A"}{" "}
                                    dB
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MapContainer>

                    <div className={styles.legend}>
                        <h4>Noise Levels</h4>
                        {legendItems.map((item) => (
                            <div
                                key={item.label}
                                className={styles["legend-item"]}
                            >
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
            <div>
                <Footer/>
            </div>
        </div>
    );
}
