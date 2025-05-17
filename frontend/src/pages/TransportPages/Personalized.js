/* global H */
import React, { useState, useEffect, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup
} from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../../styles/TransportPages/personalized.module.css';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {useNavigate} from "react-router-dom";


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Fix Leaflet default icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});


async function getAddressFromCoordinates([lat, lon]) {
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                lat,
                lon,
                format: 'json',
            },
            headers: { 'Accept-Language': 'en' }
        });
        return res.data.display_name;
    } catch (error) {
        console.error("Reverse geocoding failed", error);
        return `${lat}, ${lon}`;
    }
}

function getDecodedPolyline(polyline) {
    return H.util.flexiblePolyline.decode(polyline).polyline;
}

export default function MultiStopRouteMap() {
    const [center, setCenter] = useState([47.1585, 27.6014]); // Default: Iasi
    const mapRef = useRef(null);
    const csrfFetched = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (csrfFetched.current) return;
        csrfFetched.current = true;
        fetch('http://localhost:8000/api/csrf-token/', {
            method: 'GET',
            credentials: 'include',
        })
            .then((response) => {
                if (response.ok) return response.json();
                throw new Error('Failed to fetch CSRF token');
            })
            .then((data) => {
                console.log('Fetched CSRF token (response):', data.csrf_token);
            })
            .catch((error) => console.error('Error fetching CSRF token:', error));
    }, []);


    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            pos => setCenter([pos.coords.latitude, pos.coords.longitude]),
            () => {},
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }, []);

    const [points, setPoints] = useState([
        { input: '', coord: '', name: '' },
        { input: '', coord: '', name: '' }
    ]);
    const [segments, setSegments] = useState([]);
    const [totalSummary, setTotalSummary] = useState({ distance: 0, duration: 0, cost: 0 });

    const updateInput = (i, v) => {
        const a = [...points];
        a[i] = { input: v, coord: '', name: '' };
        setPoints(a);
    };
    const addPoint = () => setPoints(ps => [...ps, { input: '', coord: '', name: '' }]);
    const removePoint = i => points.length > 2 && setPoints(ps => ps.filter((_, j) => j !== i));

    const fetchAll = async () => {
        const resolved = await Promise.all(
            points.map(async pt => {
                const t = pt.input.trim();
                if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t)) {
                    return { ...pt, coord: t, name: '' };
                }
                try {
                    const res = await axios.get(
                        'https://nominatim.openstreetmap.org/search',
                        {
                            params: { q: t, format: 'json', limit: 1 },
                            headers: { 'Accept-Language': 'en' }
                        }
                    );
                    if (res.data[0]) {
                        const { lat, lon, display_name } = res.data[0];
                        return {
                            input: t,
                            coord: `${lat},${lon}`,
                            name: display_name
                        };
                    }
                } catch {}
                return pt;
            })
        );

        const valid = resolved.filter(pt => pt.coord);
        if (valid.length < 2) {
            alert('Enter at least two valid points.');
            return;
        }
        setPoints(resolved);

        const params = new URLSearchParams();
        valid.forEach(pt => params.append('points', pt.coord));
        try {
            const r = await axios.get(
                'http://localhost:8000/api/get-multi-waypoint-route/',
                { params }
            );
            const segs = r.data.segments || [];
            setSegments(segs);

            // Build full list of coords to fit
            const allCoords = segs.flatMap(seg =>
                seg.routes.flatMap(rt =>
                    H.util.flexiblePolyline.decode(rt.sections[0].polyline).polyline
                )
            );
            if (mapRef.current && allCoords.length) {
                const bounds = L.latLngBounds(allCoords);
                mapRef.current.fitBounds(bounds, { padding: [30, 30] });
            }

            // Compute totals
            let totalDistance = 0;
            let totalDuration = 0;
            let totalCost = 0;

            segs.forEach(seg => {
                const best = seg.routes[0];
                if (best) {
                    const summary = best.sections[0].travelSummary;
                    totalDistance += summary.length;
                    totalDuration += summary.duration;
                    totalCost += best.cost;
                }
            });
            setTotalSummary({
                distance: totalDistance,
                duration: totalDuration,
                cost: totalCost
            });
        } catch (e) {
            console.error(e);
            alert('Error fetching routes.');
        }
    };

    const handleUseRoute = () => {
        if (!segments.length) {
            alert("No route to use.");
            return;
        }

        const from = points[0];
        const to = points[points.length - 1];

        const originCoords = from.coord?.split(',').map(Number);
        const destinationCoords = to.coord?.split(',').map(Number);
        const mapCenter = originCoords;

        // Validate route structure
        const isValid = segments.every(
            seg => seg.routes?.[0]?.sections?.[0]?.travelSummary
        );

        if (!isValid || !originCoords || !destinationCoords) {
            alert("Invalid route data.");
            return;
        }

        const routeDistance = segments.reduce(
            (sum, seg) => sum + seg.routes[0].sections[0].travelSummary.length,
            0
        );
        const routeDuration = segments.reduce(
            (sum, seg) => sum + seg.routes[0].sections[0].travelSummary.duration,
            0
        );
        const routeCost = segments.reduce(
            (sum, seg) => sum + (seg.routes[0].cost || 0),
            0
        );

        let bonusPoints = 0;

        // 🔧 Combine polyline strings into one array of decoded coordinates
        const allDecoded = segments.flatMap(seg => {
            const polyline = seg.routes[0].sections[0].polyline;
            return getDecodedPolyline(polyline);
        });

        // 🔄 Create a synthetic single route object
        const combinedRoute = {
            sections: [
                {
                    polyline: JSON.stringify(allDecoded),
                },
            ],
        };

        navigate('/use-route', {
            state: {
                route: combinedRoute,
                originCoords,
                destinationCoords,
                mapCenter,
                routeDistance,
                routeDuration,
                routeCost,
                bonusPoints,
            },
        });
    };

    const handleSaveRoute = async () => {
        if (segments.length === 0) {
            alert("No route to save.");
            return;
        }

        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            alert('CSRF token is missing!');
            return;
        }

        // Decode and merge polyline data
        const fullPolyline = segments.flatMap(seg =>
            getDecodedPolyline(seg.routes[0].sections[0].polyline)
        );

        // Sum stats
        const totalDuration = segments.reduce(
            (sum, seg) => sum + seg.routes[0].sections[0].travelSummary.duration,
            0
        );
        const totalDistance = segments.reduce(
            (sum, seg) => sum + seg.routes[0].sections[0].travelSummary.length,
            0
        );
        const totalCost = segments.reduce(
            (sum, seg) => sum + seg.routes[0].cost,
            0
        );

        const from = points[0];
        const to = points[points.length - 1];

        const fromCoords = from.coord.split(',').map(Number);
        const toCoords = to.coord.split(',').map(Number);

        const fromAddress = from.name || await getAddressFromCoordinates(fromCoords);
        const toAddress = to.name || await getAddressFromCoordinates(toCoords);

        const routeData = {
            origin: fromAddress,
            origin_coordinates: fromCoords,
            destination: toAddress,
            destination_coordinates: toCoords,
            polyline: JSON.stringify(fullPolyline),
            duration: totalDuration,
            distance: totalDistance,
            cost: totalCost
        };

        try {
            const res = await fetch('http://localhost:8000/api/save_route/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(routeData)
            });

            if (res.ok) {
                alert("Route saved successfully!");
            } else {
                const data = await res.json();
                alert(data.error || "Error saving route.");
            }
        } catch (err) {
            console.error("Save error", err);
            alert("Error saving route.");
        }
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const coordString = `${lat},${lon}`;

                let address = "Current Location";

                // Optional: Reverse geocode to get actual address
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                    );
                    const data = await response.json();
                    if (data && data.display_name) {
                        address = data.display_name;
                    }
                } catch (err) {
                    console.warn("Reverse geocoding failed, using fallback label.");
                }

                // Update the first point
                const updatedPoints = [...points];
                updatedPoints[0] = {
                    ...updatedPoints[0],
                    coord: coordString,
                    input: address,
                    name: address,
                };

                setPoints(updatedPoints);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className={styles.body}>
            <div className={styles.navbarAdjust}>
            <Navbar />
            </div>
            <div className={styles.container}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <h2>MultiPoints Route</h2>
                    {points.map((pt, i) => (
                        <div key={i} className={styles.option}>
                            <input
                                type="text"
                                placeholder="Enter Location"
                                value={pt.input}
                                onChange={e => updateInput(i, e.target.value)}
                            />
                            {(i === 0 && points.length > 1) && (
                                <button
                                    type="button"
                                    className={styles.locationButton}
                                    onClick={handleUseCurrentLocation}
                                >
                                    📍
                                </button>
                            )}
                            {points.length > 2 && (
                                <button onClick={() => removePoint(i)}>✕</button>
                            )}
                        </div>
                    ))}

                    <div className={styles.actionButtons}>
                        <button onClick={addPoint} className={`${styles.button} ${styles.addWaypointBtn}`}>
                            + Add Task Point
                        </button>
                        <button onClick={fetchAll} className={`${styles.button} ${styles.goBtn}`}>
                            Search Routes
                        </button>
                        <button onClick={handleSaveRoute} className={`${styles.button} ${styles.saveBtn}`}>
                            Save Route
                        </button>
                        <button onClick={handleUseRoute} className={`${styles.button} ${styles.useBtn}`}>
                            Use Route
                        </button>
                    </div>
                    {/* Overall Summary */}
                    {segments.length > 0 && (
                        <div className={styles.segment}>
                            <h3>Overall Summary</h3>
                            <p>Total Distance: {(totalSummary.distance / 1000).toFixed(1)} km</p>
                            <p>
                                Total Time: {Math.floor(totalSummary.duration / 3600)} h{" "}
                                {Math.floor((totalSummary.duration % 3600) / 60)} min
                            </p>
                            <p>Total Cost: €{totalSummary.cost.toFixed(2)}</p>
                        </div>
                    )}

                    {/* Individual Segments */}
                    {segments.map((seg, si) => {
                        const from = points[si];
                        const to = points[si + 1];
                        const fromLabel = from.name || from.input;
                        const toLabel = to.name || to.input;
                        return (
                            <div key={si} className={styles.segment}>
                                <h3>Segment {si + 1}: {fromLabel} → {toLabel}</h3>
                                {seg.routes.map((rt, ri) => {
                                    const { length, duration } = rt.sections[0].travelSummary;
                                    return (
                                        <div key={ri} className={styles.option}>
                                            <p>Distance: {(length / 1000).toFixed(1)} km</p>
                                            <p>
                                                Time: {Math.floor(duration / 3600)} h {Math.floor((duration % 3600) / 60)} min
                                            </p>
                                            <p>Cost: €{rt.cost.toFixed(2)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Map */}
                <div className={styles.mapWrapper}>
                    <MapContainer
                        center={center}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        whenCreated={mapInstance => {
                            mapRef.current = mapInstance;
                        }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                        />

                        {/* Markers */}
                        {points.map(
                            (pt, i) =>
                                pt.coord && (
                                    <Marker
                                        key={`m-${i}`}
                                        position={pt.coord.split(',').map(Number)}
                                    >
                                        <Popup>
                                            <strong>{pt.name || pt.input}</strong>
                                        </Popup>
                                    </Marker>
                                )
                        )}

                        {/* Polylines */}
                        {segments.map((seg, si) =>
                            seg.routes.map((rt, ri) => {
                                const coords = H.util.flexiblePolyline
                                    .decode(rt.sections[0].polyline)
                                    .polyline;
                                return (
                                    <Polyline
                                        key={`p-${si}-${ri}`}
                                        positions={coords}
                                        pathOptions={{
                                            color: `hsl(${(si * 60) % 360}, 70%, 50%)`,
                                            weight: 4
                                        }}
                                    />
                                );
                            })
                        )}
                    </MapContainer>
                </div>
            </div>

            <Footer />
        </div>
    );
}
