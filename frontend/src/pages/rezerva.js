import React, { useState, useEffect } from 'react';
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import styles from '../../styles/TransportPages/personalized.module.css';
import Footer from "../../components/Footer";

// Price per kilometer in EUR
const PRICE_PER_KM = 0.5;

// Distance helper (not strictly needed for ORS summary but kept)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Center map to given position
function SetMapCenter({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

// Fit map bounds to route
function FitBounds({ positions }) {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            map.fitBounds(L.latLngBounds(positions), { padding: [20, 20] });
        }
    }, [positions, map]);
    return null;
}

// Geocode an address via Nominatim
async function geocodeAddress(address) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address
        )}`
    );
    const data = await res.json();
    if (!data.length) throw new Error('Locație negăsită');
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Fetch route and summary from OpenRouteService
async function fetchRouteFromORS(coordsList) {
    const apiKey = '5b3ce3597851110001cf624846162079195844a0a165ab7634c2d7dd';
    const res = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
            method: 'POST',
            headers: {
                Authorization: apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: coordsList.map(c => [c[1], c[0]])
            })
        }
    );
    if (!res.ok) throw new Error('Eroare la generarea traseului');
    const data = await res.json();
    const feat = data.features[0];
    const geom = feat.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const { distance, duration } = feat.properties.summary;
    return { geom, distance, duration };
}

// Custom map icons
const redIcon = new L.Icon({
    iconUrl:
        'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
const blueIcon = new L.Icon({
    iconUrl:
        'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Format seconds to "Hh Mm"
const formatDuration = sec => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
};

export default function UserRoutes() {
    const [locationInput, setLocationInput] = useState('');
    const [destinations, setDestinations] = useState([]);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [error, setError] = useState(null);

    // Route state
    const [routedPath, setRoutedPath] = useState([]);
    const [routeDistance, setRouteDistance] = useState(0); // meters
    const [routeDuration, setRouteDuration] = useState(0); // seconds
    const [routePrice, setRoutePrice] = useState(0); // EUR

    // Get user location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            pos =>
                setCurrentPosition([
                    pos.coords.latitude,
                    pos.coords.longitude
                ]),
            () => setError('Nu s-a putut obține locația curentă')
        );
    }, []);

    // Recompute route when inputs change
    useEffect(() => {
        async function computeRoute() {
            if (!currentPosition || destinations.length === 0) {
                setRoutedPath([]);
                return;
            }
            try {
                const coordsList = [
                    currentPosition,
                    ...destinations.map(d => d.coords)
                ];
                const { geom, distance, duration } =
                    await fetchRouteFromORS(coordsList);
                setRoutedPath(geom);
                setRouteDistance(distance);
                setRouteDuration(duration);
                setRoutePrice((distance / 1000) * PRICE_PER_KM);
            } catch (e) {
                console.error(e);
                alert('Nu s-a putut genera traseul.');
            }
        }
        computeRoute();
    }, [currentPosition, destinations]);

    const handleAddLocation = async () => {
        if (!locationInput.trim()) return;
        try {
            const coords = await geocodeAddress(locationInput);
            setDestinations(prev => [
                ...prev,
                { name: locationInput, coords }
            ]);
            setLocationInput('');
        } catch (e) {
            alert(e.message);
        }
    };

    const handleDeleteLocation = idx => {
        setDestinations(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.routeList}>
                        <h2>Adaugă locații</h2>
                        <input
                            type="text"
                            placeholder="Ex: Ateneul Român"
                            value={locationInput}
                            onChange={e => setLocationInput(e.target.value)}
                        />
                        <button onClick={handleAddLocation}>
                            Adaugă locație
                        </button>
                        <ul>
                            {destinations.map((d, i) => (
                                <li key={i} className={styles.routeItem}>
                                    {d.name}
                                    <button
                                        className={styles.deleteButton}
                                        onClick={() => handleDeleteLocation(i)}
                                    >
                                        &times;
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {routedPath.length > 1 && (
                            <div className={styles.summary}>
                                <p>
                                    Distanță:{' '}
                                    <strong>
                                        {(routeDistance / 1000).toFixed(2)} km
                                    </strong>
                                </p>
                                <p>
                                    Timp estimat:{' '}
                                    <strong>
                                        {formatDuration(routeDuration)}
                                    </strong>
                                </p>
                                <p>
                                    Cost:{' '}
                                    <strong>
                                        {routePrice.toFixed(2)} EUR
                                    </strong>
                                </p>
                            </div>
                        )}

                        {error && <p style={{ color: 'red' }}>{error}</p>}
                    </div>

                    <div className={styles.mapContainer}>
                        <MapContainer
                            center={
                                currentPosition || [44.4268, 26.1025]
                            }
                            zoom={13}
                            scrollWheelZoom
                            className={styles.leafletContainer}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                            />
                            {currentPosition && (
                                <SetMapCenter center={currentPosition} />
                            )}
                            {currentPosition && (
                                <Marker
                                    position={currentPosition}
                                    icon={redIcon}
                                >
                                    <Popup>Locația curentă</Popup>
                                </Marker>
                            )}
                            {destinations.map((d, i) => (
                                <Marker
                                    key={i}
                                    position={d.coords}
                                    icon={blueIcon}
                                >
                                    <Popup>{d.name}</Popup>
                                </Marker>
                            ))}
                            {routedPath.length > 1 && (
                                <Polyline
                                    positions={routedPath}
                                    color="#007bff"
                                    weight={6}
                                    opacity={0.8}
                                    lineJoin="round"
                                />
                            )}
                            <FitBounds positions={routedPath} />
                        </MapContainer>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
