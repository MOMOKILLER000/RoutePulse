/* global H */
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Footer from "../../components/Footer";
import styles from "../../styles/TransportPages/useRoute.module.css";


function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}


const getDecodedPolyline = (polylineInput) => {

    if (Array.isArray(polylineInput)) {
        return polylineInput;
    }


    if (typeof polylineInput === "string" && polylineInput.trim().startsWith("[")) {
        try {
            const parsed = JSON.parse(polylineInput);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            console.error("Error parsing polyline JSON:", e);

        }
    }


    try {
        if (!H || !H.util || !H.util.flexiblePolyline) {
            console.error("HERE Maps flexiblePolyline library is not available.");
            return [];
        }
        const decoded = H.util.flexiblePolyline.decode(polylineInput);
        return decoded.polyline.map((coord) => [coord[0], coord[1]]);
    } catch (err) {
        console.error("Error decoding polyline:", err);
        return [];
    }
};;


const getCookie = (name) => {
    const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(name + "="));
    return cookieValue ? cookieValue.split("=")[1] : null;
};

const UseRoute = () => {
    const location = useLocation();
    const state = location.state;
    const navigate = useNavigate();
    const [currentPosition, setCurrentPosition] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [pointsAwarded, setPointsAwarded] = useState(false); // Track if points were awarded
    const [isUnmounted, setIsUnmounted] = useState(false);


    const [mapKey, setMapKey] = useState(Date.now());


    useEffect(() => {
        if (!state) {
            navigate("/Cars");
        }
    }, [state, navigate]);


    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const message =
                "Are you sure you want to leave? Your current route progress will be lost.";
            e.returnValue = message; // Standard for most browsers
            return message; // For Chrome
        };


        window.addEventListener("beforeunload", handleBeforeUnload);


        window.history.pushState(null, "", window.location.href);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);

            if (!isUnmounted) {
                window.history.replaceState({}, document.title);
            }
        };
    }, [isUnmounted]);


    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newPos = [
                        position.coords.latitude,
                        position.coords.longitude,
                    ];
                    setCurrentPosition(newPos);
                },
                (error) => {
                    console.error("Error watching position:", error);
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        } else {
            console.error("Geolocation is not supported by your browser.");
        }
    }, []);


    useEffect(() => {
        if (currentPosition && state && state.destinationCoords && !pointsAwarded) {
            const [destLat, destLon] = state.destinationCoords;
            const [currLat, currLon] = currentPosition;
            let routePoints = Math.ceil(state.routeDistance /1000);
            const transportType = state.transport
                ? state.transport.charAt(0).toUpperCase() + state.transport.slice(1).toLowerCase()
                : "";

            if (transportType === "Tram" || transportType === "Bus") {
                routePoints *= 3;
            }

            const toRad = (value) => (value * Math.PI) / 180;
            const R = 6371 * 1000; // Earth radius in meters
            const dLat = toRad(destLat - currLat);
            const dLon = toRad(destLon - currLon);
            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(currLat)) *
                Math.cos(toRad(destLat)) *
                Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c; // Distance in meters

            if (distance <= 200) {
                setPointsAwarded(true); // Prevent re-awarding points
                fetch(`http://localhost:8000/api/update_user_progress/${routePoints}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCookie("csrftoken"),
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        current_position: currentPosition,
                        destination: state.destinationCoords,
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.message === "Points added") {
                            let alertMessage = `Congrats! You've earned ${routePoints} points. Total Routes: ${data.total_routes}`;

                            // Notify user about the boost
                            if (transportType === "Tram" || transportType === "Bus") {
                                alertMessage += "\n(3x points boost applied for public transport!)";
                            }

                            alert(alertMessage);
                            navigate("/end-route", {
                                state: {
                                    originCoords: state.originCoords,
                                    destinationCoords: state.destinationCoords,
                                    mapCenter: state.mapCenter,
                                    routeDistance: state.routeDistance,
                                    routeDuration: state.routeDuration,
                                    routeCost: state.routeCost,
                                    polyline: decodedPolyline,
                                    transport: transportType,
                                    route_short_name: state.route_short_name,
                                    route_long_name: state.route_long_name,
                                    agency_id: state.agency_id,
                                    origin: state.origin,
                                    destination: state.destination,
                                },
                            });
                        }
                    })
                    .catch((error) => console.error("Error updating progress:", error));
            }
        }
    }, [currentPosition, state, pointsAwarded, navigate]);


    if (!state || !state.route) {
        return null;
    }

    const { route, originCoords, destinationCoords, mapCenter } = state;
    const polylineString = route.sections[0].polyline;
    const decodedPolyline = getDecodedPolyline(polylineString);

    const centerPosition = currentPosition || mapCenter || originCoords;
    const zoomLevel = currentPosition ? 18 : 12;

    const userIcon = new L.Icon({
        iconUrl: "https://maps.google.com/mapfiles/kml/shapes/arrow.png",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });



    const recenterMap = () => {
        if (!currentPosition) {
            console.warn("Current position not available");
            return;
        }
        console.log("Recentering map to", currentPosition, "with zoom", zoomLevel);
        setMapKey(Date.now());
    };

    return (
        <div>
            {currentPosition && (
                <button className={styles.recenterButton} onClick={recenterMap}>
                    Recenter
                </button>
            )}
            <div className={styles.useRouteContainer}>
                <div className={styles.mapWrapper}>
                    {/* The key property forces MapContainer to reinitialize when changed */}
                    <MapContainer
                        key={mapKey}
                        center={centerPosition}
                        zoom={zoomLevel}
                        scrollWheelZoom={true}
                        className={styles.leafletContainer}
                        whenCreated={setMapInstance}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                        />
                        {originCoords && (
                            <Marker
                                position={originCoords}
                                icon={new L.Icon({
                                    iconUrl:
                                        "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-green.png",
                                    iconSize: [25, 41],
                                    iconAnchor: [12, 41],
                                    popupAnchor: [1, -34],
                                    shadowSize: [41, 41],
                                })}
                            >
                                <Popup>Origin</Popup>
                            </Marker>
                        )}
                        {destinationCoords && (
                            <Marker
                                position={destinationCoords}
                                icon={new L.Icon({
                                    iconUrl:
                                        "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-red.png",
                                    iconSize: [25, 41],
                                    iconAnchor: [12, 41],
                                    popupAnchor: [1, -34],
                                    shadowSize: [41, 41],
                                })}
                            >
                                <Popup>Destination</Popup>
                            </Marker>
                        )}
                        {currentPosition && (
                            <Marker position={currentPosition} icon={userIcon}>
                                <Popup>You are here</Popup>
                            </Marker>
                        )}
                        {decodedPolyline.length > 0 && (
                            <Polyline positions={decodedPolyline} color="blue" weight={4} />
                        )}
                        <ChangeView center={centerPosition} zoom={zoomLevel} />
                    </MapContainer>
                </div>
                <Footer />
            </div>
        </div>
    );
};

export default UseRoute;
