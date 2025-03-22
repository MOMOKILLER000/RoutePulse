import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import styles from '../../styles/UsersPages/userRoutes.module.css';
import Footer from "../../components/Footer";
function FitBounds({ positions }) {
    const map = useMap();
    useEffect(() => {
        if (positions && positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [positions, map]);
    return null;
}

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

function UserRoutes() {
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
    const [error, setError] = useState(null);
    const [deletingRouteId, setDeletingRouteId] = useState(null);
    const [cancelCountdown, setCancelCountdown] = useState(5);

    const defaultCenter = [44.4268, 26.1025];
    const csrfFetched = useRef(false);

    const redIcon = new L.Icon({
        iconUrl:
            'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
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

    const csrfToken = getCookie('csrftoken');
    useEffect(() => {
        if (!csrfToken) {
            setError('CSRF token is missing!');
        }
    }, [csrfToken]);
    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/get_saved_routes/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setRoutes(data.routes);
                } else {
                    const errorData = await response.json();
                    setError(errorData.error || 'Error fetching routes');
                }
            } catch (e) {
                setError('Error fetching routes');
            }
        };

        fetchRoutes();
    }, []);
    const selectedRoute =
        selectedRouteIndex !== null && routes[selectedRouteIndex]
            ? routes[selectedRouteIndex]
            : null;
    const handleSelectRoute = (index) => {
        setSelectedRouteIndex(index);
    };
    const handleUnsaveRoute = async (routeId) => {
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            alert('CSRF token is missing!');
            return;
        }
        try {
            const response = await fetch(`http://localhost:8000/api/unsave_route/${routeId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                credentials: 'include',
            });
            if (response.ok) {
                setRoutes(routes.filter((route) => route.id !== routeId));
                setDeletingRouteId(null); // Clear the deletion state
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Error unsaving route');
            }
        } catch (e) {
            setError('Error unsaving route');
        }
    };

    const startDeleteCountdown = (routeId) => {
        setDeletingRouteId(routeId);
        setCancelCountdown(5);
    };

    const cancelDelete = () => {
        setDeletingRouteId(null);
        setCancelCountdown(0);
    };
    useEffect(() => {
        if (deletingRouteId && cancelCountdown > 0) {
            const timer = setInterval(() => {
                setCancelCountdown((prev) => {
                    if (prev === 1) {
                        handleUnsaveRoute(deletingRouteId);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [cancelCountdown, deletingRouteId]);

    return (
        <div className={styles.container}>
            <Navbar />
            <h1>Your Saved Routes</h1>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.content}>
                {/* Sidebar list of saved routes */}
                <div className={styles.routeList}>
                    {routes.length > 0 ? (
                        routes.map((route, index) => (
                            <div
                                key={route.id}
                                className={`${styles.routeItem} ${
                                    selectedRouteIndex === index ? styles.active : ''
                                }`}
                                onClick={() => handleSelectRoute(index)}
                            >
                                <p>
                                    <strong>From:</strong> {route.origin}
                                </p>
                                <p>
                                    <strong>To:</strong> {route.destination}
                                </p>
                                {selectedRouteIndex === index && (
                                    <>
                                        <p>
                                            <strong>Duration:</strong> {(route.duration / 60).toFixed(2)} min
                                        </p>
                                        <p>
                                            <strong>Distance:</strong> {(route.distance / 1000).toFixed(2)} km
                                        </p>
                                        {route.cost && (
                                            <p>
                                                <strong>Cost:</strong> {route.cost}
                                            </p>
                                        )}
                                    </>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startDeleteCountdown(route.id);
                                    }}
                                    className={styles.unsaveButton}
                                >
                                    Delete Route
                                </button>
                            </div>
                        ))
                    ) : (
                        <p>No saved routes found.</p>
                    )}
                </div>

                {/* Map to display the selected route */}
                <div className={styles.mapContainer}>
                    <MapContainer
                        center={
                            selectedRoute && selectedRoute.origin_coordinates
                                ? selectedRoute.origin_coordinates
                                : defaultCenter
                        }
                        zoom={12}
                        scrollWheelZoom={true}
                        className={styles.leafletContainer}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                        />
                        {selectedRoute && selectedRoute.origin_coordinates && (
                            <>
                                <Polyline
                                    positions={JSON.parse(selectedRoute.polyline)}
                                    color="blue"
                                    weight={4}
                                />
                                <FitBounds positions={JSON.parse(selectedRoute.polyline)} />
                                {(() => {
                                    const originCoords = selectedRoute.origin_coordinates;
                                    const destinationCoords = selectedRoute.destination_coordinates;
                                    if (originCoords.length && destinationCoords.length) {
                                        return (
                                            <>
                                                <Marker position={originCoords} icon={redIcon}>
                                                    <Popup>Origin</Popup>
                                                </Marker>
                                                <Marker position={destinationCoords} icon={redIcon}>
                                                    <Popup>Destination</Popup>
                                                </Marker>
                                            </>
                                        );
                                    }
                                    return null;
                                })()}
                            </>
                        )}
                    </MapContainer>
                </div>

                {deletingRouteId && (
                    <div className={styles.confirmation}>
                        <p>Are you sure you want to delete this route?</p>
                        <p>Cancel in {cancelCountdown} seconds</p>
                        <button onClick={() => cancelDelete()} className={styles.cancelButton}>
                            Cancel
                        </button>
                        <button
                            onClick={() => handleUnsaveRoute(deletingRouteId)}
                            className={styles.confirmButton}
                        >
                            Confirm
                        </button>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}

export default UserRoutes;
