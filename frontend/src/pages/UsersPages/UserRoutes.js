import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import styles from '../../styles/UsersPages/userRoutes.module.css';
import Footer from "../../components/Footer";


const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const toRad = (angle) => (angle * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};



function MapResizeHandler() {
    const map = useMap();
    useEffect(() => {
        const handleResize = () => {
            map.invalidateSize();
        };

        const timeout = setTimeout(() => {
            map.invalidateSize();
        }, 300);

        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);
    return null;
}

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
    // Instead of storing just the routeId for deletion, we now store the full route object.
    const [deletingRoute, setDeletingRoute] = useState(null);
    const [cancelCountdown, setCancelCountdown] = useState(5);
    const navigate = useNavigate();
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

    // Update the unsave function to use the route object.
    const handleUnsaveRoute = async (route) => {
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            alert('CSRF token is missing!');
            return;
        }

        // Choose the endpoint based on the route type
        const endpoint = `http://localhost:8000/api/unsave_route/${route.id}/${route.type}/`;

        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                credentials: 'include',
            });
            if (response.ok) {
                setRoutes(routes.filter((r) => r.id !== route.id));
                setDeletingRoute(null);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Error unsaving route');
            }
        } catch (e) {
            setError('Error unsaving route');
        }
    };

    // Pass the whole route object when starting the delete countdown.
    const startDeleteCountdown = (route) => {
        setDeletingRoute(route);
        setCancelCountdown(5);
    };

    const cancelDelete = () => {
        setDeletingRoute(null);
        setCancelCountdown(0);
    };

    useEffect(() => {
        if (deletingRoute && cancelCountdown > 0) {
            const timer = setInterval(() => {
                setCancelCountdown((prev) => {
                    if (prev === 1) {
                        handleUnsaveRoute(deletingRoute);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cancelCountdown, deletingRoute]);


    const handleUseRouteWithCheck = (route) => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                // Assume route.origin_coordinates is an array like [lat, lon]
                const originCoords = route.origin_coordinates;
                if (!originCoords || originCoords.length < 2) {
                    alert("Route origin coordinates are not available.");
                    return;
                }
                const distance = getDistance(userLat, userLon, originCoords[0], originCoords[1]);
                console.log("Distance to route origin:", distance);
                if (distance > 300) {
                    alert("You must be near the route origin to use this route.");
                } else {
                    navigate("/use-route", {
                        state: {
                            route: { sections: [{ polyline: route.polyline }] },
                            originCoords: route.origin_coordinates,
                            destinationCoords: route.destination_coordinates,
                            polyline: JSON.parse(route.polyline),
                            routeDistance: route.distance,
                            routeDuration: route.duration,
                            routeCost: route.cost,
                            transport: route.transport,
                            route_short_name: route.route_short_name || 'Unknown',
                            route_long_name: route.route_long_name || 'Unknown',
                            agency_id: route.agency_id || 'None',
                            origin: route.origin || 'None',
                            destination: route.destination || 'None',
                        },
                    });
                }
            },
            (error) => {
                alert("Error fetching your location: " + error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div>
            <div className={styles.container}>
                <Navbar />
                <h1>Your Saved Routes</h1>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.content}>
                    {/* Sidebar list */}
                    <div className={styles.routeList}>
                        {routes.length > 0 ? (
                            routes.map((route, index) => (
                                <div
                                    key={route.id}
                                    className={`${styles.routeItem} ${selectedRouteIndex === index ? styles.active : ''}`}
                                    onClick={() => handleSelectRoute(index)}
                                >
                                    {route.type === 'public_transport' ? (
                                        <>
                                            <p><strong>Traseu:</strong> {route.route_short_name}</p>
                                            <p><strong>Ruta:</strong> {route.route_long_name}</p>
                                            <p><strong>Duration:</strong> {route.duration.toFixed(2)} min</p>
                                        </>
                                    ) : (
                                        <>
                                            <p><strong>From:</strong> {route.origin}</p>
                                            <p><strong>To:</strong> {route.destination}</p>
                                            <p><strong>Duration:</strong> {(route.duration / 60).toFixed(2)} min</p>
                                        </>
                                    )}
                                    {selectedRouteIndex === index && (
                                        <>
                                            <p><strong>Distance:</strong> {(route.distance / 1000).toFixed(2)} km</p>
                                            {route.cost && <p><strong>Cost:</strong> {route.cost}</p>}
                                            <p><strong>Transport method: {route.transport}</strong></p>
                                        </>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startDeleteCountdown(route);
                                        }}
                                        className={styles.unsaveButton}
                                    >
                                        Delete Route
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUseRouteWithCheck(route);
                                        }}
                                        className={styles.unsaveButton}
                                    >
                                        Use Route
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className={styles.side}>No saved routes found</p>
                        )}
                    </div>

                    {/* Map container */}
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
                            <MapResizeHandler />
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

                    {deletingRoute && (
                        <div className={styles.confirmation}>
                            <p>Are you sure you want to delete this route?</p>
                            <p>Cancel in {cancelCountdown} seconds</p>
                            <button onClick={cancelDelete} className={styles.cancelButton}>
                                Cancel
                            </button>
                            <button onClick={() => handleUnsaveRoute(deletingRoute)} className={styles.confirmButton}>
                                Confirm
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default UserRoutes;
