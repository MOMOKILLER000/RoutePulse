/* global H */
import React, { useState, useEffect, useRef } from 'react';
import {MapContainer, TileLayer, Marker, Popup, useMap, Polyline} from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../../components/Navbar';
import styles from "../../styles/TransportPages/DailyTasks.module.css";
import 'leaflet/dist/leaflet.css';
import Footer from "../../components/Footer";

// Fix leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
const SCAN_DURATION = 10;

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371e3; // Radius of the Earth in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}


// Component to reset the map view whenever center changes
const ResetMapView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 15);
        }
    }, [center, map]);
    return null;
};

function getMillisecondsToMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0); // next midnight
    return tomorrow - now; // difference in ms
}

export default function DailyTasks() {
    const [task, setTask] = useState(null);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [currentPoint, setCurrentPoint] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    // User location state to center map initially
    const [userLocation, setUserLocation] = useState([46.7712, 23.6236]); // fallback center
    const volumesRef = useRef([]);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const countdownRef = useRef(null);
    const [helpId, setHelpId] = useState(null);
    const finishingRef = useRef(false);
    const [timeToMidnight, setTimeToMidnight] = useState(getMillisecondsToMidnight());
    const [routePolyline, setRoutePolyline] = useState([]);


    useEffect(() => {
        const interval = setInterval(() => {
            setTimeToMidnight(getMillisecondsToMidnight());
        }, 1000);

        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const loc = [coords.latitude, coords.longitude];
                setUserLocation(loc);
                fetchTask(coords.latitude, coords.longitude);
            },
            () => fetchTask()
        );
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            cancelAnimationFrame(rafRef.current);
            clearInterval(countdownRef.current);
        };
    }, []);

    function fetchTask(lat, lng) {
        const qs = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : '';
        fetch(`http://localhost:8000/api/my-daily-task/${qs}`, { credentials: 'include' })
            .then(res => res.json())
            .then(setTask)
            .catch(console.error);
    }

    function startScan(pointId) {
        if (scanning) return;
        const pointObj = task.points.find(p => p.id === pointId);
        if (!pointObj) return;

        // Check if userLocation is available
        if (!userLocation) {
            alert('User location not available.');
            return;
        }

        const distance = getDistanceFromLatLonInMeters(
            userLocation[0],
            userLocation[1],
            pointObj.latitude,
            pointObj.longitude
        );

        if (distance > 10000) {
            alert('You need to be within 10 meters of the task point to scan.');
            return;
        }

        setCurrentPoint(pointObj);
        setScanning(true);
        setTimeLeft(SCAN_DURATION);
        volumesRef.current = [];

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                streamRef.current = stream;
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const micSrc = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                micSrc.connect(analyser);

                const data = new Uint8Array(analyser.frequencyBinCount);
                const loop = () => {
                    analyser.getByteFrequencyData(data);
                    const vol = data.reduce((a, b) => a + b, 0) / data.length;
                    volumesRef.current.push(vol);
                    setNoiseLevel(vol.toFixed(2));
                    rafRef.current = requestAnimationFrame(loop);
                };
                loop();

                countdownRef.current = setInterval(() => {
                    setTimeLeft(t => {
                        if (t <= 1) {
                            finishScan(pointId);
                            return 0;
                        }
                        return t - 1;
                    });
                }, 1000);
            })
            .catch(err => {
                console.error('Mic error:', err);
                resetScan();
            });
    }

    function finishScan(pointId) {
        if (finishingRef.current) return;  // Prevent multiple calls
        finishingRef.current = true;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        cancelAnimationFrame(rafRef.current);
        clearInterval(countdownRef.current);

        const vols = volumesRef.current;
        const avg = vols.reduce((a, b) => a + b, 0) / vols.length;
        setNoiseLevel(avg.toFixed(2));

        fetch(`http://localhost:8000/api/complete-point/${pointId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ decibels: avg })
        })
            .then(res => res.json())
            .then(() => {
                setTask(prev => ({
                    ...prev,
                    points: prev.points.map(p =>
                        p.id === pointId
                            ? { ...p, completed: true, decibels: avg }
                            : p
                    )
                }));
            })
            .catch(console.error)
            .finally(() => {
                resetScan();
                finishingRef.current = false;
            });
    }

    function resetScan() {
        setScanning(false);
        setCurrentPoint(null);
        setTimeLeft(0);
        volumesRef.current = [];
    }

    function cancelScan() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        cancelAnimationFrame(rafRef.current);
        clearInterval(countdownRef.current);
        resetScan();
        finishingRef.current = false;
    }

    const formatTime = ms => {
        const sec = Math.floor(ms/1000);
        const h = String(Math.floor(sec/3600)).padStart(2,'0');
        const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
        const s = String(sec%60).padStart(2,'0');
        return `${h}:${m}:${s}`;
    };


    function fetchRouteToPoint(lat1, lng1, lat2, lng2) {
        const url = `https://router.hereapi.com/v8/routes?transportMode=pedestrian&origin=${lat1},${lng1}&destination=${lat2},${lng2}&return=polyline&apiKey=tK7VNjCDPeGh8hQ4r5za6HRDFGhyMAPcjVFwyBWgxeM`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                const polyline = data.routes[0].sections[0].polyline;
                const route = decodeHerePolyline(polyline);
                setRoutePolyline(route);
            })
            .catch(err => console.error("Failed to fetch route:", err));
    }


    const decodeHerePolyline = (polylineString) => {
        try {
            const decoded = H.util.flexiblePolyline.decode(polylineString);
            return decoded.polyline.map(coord => [coord[0], coord[1]]);
        } catch (err) {
            console.error("Error decoding polyline", err);
            return [];
        }
    };


    return (
        <div className={styles.body}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>
            <div className={styles.pollutionPage}>
                <div className={styles.mainContent}>
                    <aside className={styles.sidebar}>
                        <h2>Tasks <span className={styles.timer}>({formatTime(timeToMidnight)} left)</span></h2>
                        <ul>
                            {task?.points?.length > 0 ? (
                                task.points.map((p, i) => (
                                    <li key={p.id} className={styles.taskItem}>
                                        <div
                                            className={styles.taskLeft}
                                            onClick={() => {
                                                setCurrentPoint(p);
                                                if (userLocation) {
                                                    fetchRouteToPoint(userLocation[0], userLocation[1], p.latitude, p.longitude);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <input type="checkbox" checked={p.completed} readOnly />
                                            <span className={styles.taskText}>
                                            Points awarded: 40
                                        </span>
                                            <span className={`ml-2 ${p.completed ? 'text-green-600' : 'text-red-600'}`}>
                                            {p.completed ? `Done (${p.decibels?.toFixed(2)} dB)` : 'Incomplete'}
                                        </span>
                                            <button className={styles.infoBtn} onClick={() => setHelpId(helpId===p.id? null:p.id)}>ℹ️</button>
                                        </div>
                                        {helpId===p.id && <p className={styles.helpText}>Use your microphone to record at least 20 seconds to get the sound polution.</p>}
                                    </li>
                                ))
                            ) : (
                                <li>No points available.</li>
                            )}
                        </ul>
                        {currentPoint && !currentPoint.completed && (
                            <>
                                {!scanning ? (
                                    <button onClick={() => startScan(currentPoint.id)} className={styles.recordBtnSidebar}>
                                        Scan Sound
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button onClick={cancelScan} className={styles.recordBtnSidebar} style={{marginRight: '10px'}}>
                                            Cancel Scan
                                            <span><strong> Time left:</strong> {timeLeft}s</span>
                                        </button>
                                        <span><strong>Current dB:</strong> {noiseLevel}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                    <section className={styles.mapContainer}>
                        <MapContainer
                            center={userLocation}
                            zoom={13}
                            className={styles.map}
                            scrollWheelZoom={false}
                        >
                            <ResetMapView center={currentPoint ? [currentPoint.latitude, currentPoint.longitude] : userLocation} />
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {task?.points?.map((point, index) => (
                                <Marker key={point.id} position={[point.latitude, point.longitude]}>
                                    <Popup>
                                        <strong>Point {index + 1}</strong><br />
                                        {point.completed ? `Completed (${point.decibels?.toFixed(2)} dB)` : 'Incomplete'}
                                    </Popup>
                                </Marker>
                            ))}
                            {routePolyline.length > 0 && (
                                <Polyline positions={routePolyline} color="blue" />
                            )}
                            {/* User location marker */}
                            <Marker position={userLocation} icon={greenIcon}>
                                <Popup>Your location</Popup>
                            </Marker>
                        </MapContainer>
                    </section>
                </div>
            </div>
        <Footer />
        </div>
    );
}
