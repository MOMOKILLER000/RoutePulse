/* global H */
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import styles from "../../styles/TransportPages/endroute.module.css";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Helper to get a cookie value
const getCookie = (name) => {
    const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(name + "="));
    return cookieValue ? cookieValue.split("=")[1] : null;
};

// Provided function to decode the polyline
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
};



delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Reverse geocoding function using OpenStreetMap's nominatim service
const reverseGeocode = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data?.address?.road || "Unknown address";
    } catch (error) {
        console.error("Error fetching address:", error);
        return "Unknown address";
    }
};

const parseDurationToMinutes = (durationString) => {
    if (!durationString) return 0;

    const hoursMatch = durationString.match(/(\\d+)h/);
    const minutesMatch = durationString.match(/(\\d+)m/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours * 60 + minutes;
};

const EndRoute = () => {
    const location = useLocation();
    const state = location.state;
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [originAddress, setOriginAddress] = useState("");
    const [destinationAddress, setDestinationAddress] = useState("");

    // Redirect if route details are not available
    useEffect(() => {
        if (!state) {
            navigate("/");
        }
    }, [state, navigate]);

    // Fetch human-readable addresses for the origin and destination coordinates
    useEffect(() => {
        const fetchAddresses = async () => {
            const originAddr = await reverseGeocode(
                parseFloat(state.originCoords[0]),
                parseFloat(state.originCoords[1])
            );
            const destinationAddr = await reverseGeocode(
                parseFloat(state.destinationCoords[0]),
                parseFloat(state.destinationCoords[1])
            );
            setOriginAddress(originAddr);
            setDestinationAddress(destinationAddr);
        };
        if (state.originCoords && state.destinationCoords) {
            fetchAddresses();
        }
    }, [state]);

    // In this example we assume that state.polyline is already decoded or in JSON-array format.
    const decodedPolyline = state.polyline;
    // Convert coordinates to numbers for Leaflet.
    const originCoords = state.originCoords.map((coord) => parseFloat(coord));
    const destinationCoords = state.destinationCoords.map((coord) => parseFloat(coord));
    const mapCenter = (state.mapCenter || originCoords).map((coord) => parseFloat(coord));

    // Normalize transport type: ensures the first letter is uppercase.
    const transportType =
        state.transport &&
        state.transport.charAt(0).toUpperCase() + state.transport.slice(1).toLowerCase();

    const handleSaveRoute = async () => {
        if (!state) {
            setError("No route details provided.");
            return;
        }
        const csrfToken = getCookie("csrftoken");
        if (!csrfToken) {
            alert("CSRF token is missing!");
            return;
        }
        if (!decodedPolyline.length) {
            setError("Failed to decode polyline.");
            return;
        }

        let response;

        // Build the payload based on the transport type.
        if (transportType === "Tram" || transportType === "Bus") {
            // Public Transport route_data payload.
            const publicRouteData = {
                startingStopId: state.origin,
                destinationStopId: state.destination,
                route_short_name: state.route_short_name,
                route_long_name: state.route_long_name,
                polyline: decodedPolyline,
                duration: state.routeDuration,
                distance: state.routeDistance,
            };
            console.log(publicRouteData);
            let route_type = 0;
            if (transportType === "Tram") {
                route_type = 0;
            } else {
                route_type = 3;
            }
            response = await fetch(
                `http://localhost:8000/api/save_publictransportroute/${state.agency_id}/${route_type}/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(publicRouteData),
                    credentials: "include",
                }
            );
        } else {
            console.log(destinationCoords);
            const durationInMinutes = parseDurationToMinutes(state.routeDuration) * 60;
            const distanceInM = parseFloat(state.routeDistance); // Convert to float
            const costValue = state.routeCost ? parseFloat(state.routeCost) : 0; // Convert to float
            // Normal route_data payload.
            const normalRouteData = {
                origin: originAddress,
                origin_coordinates: state.originCoords,
                destination: destinationAddress,
                destination_coordinates: state.destinationCoords,
                polyline: decodedPolyline,
                duration: durationInMinutes,
                distance: distanceInM,
                cost: costValue,
            };

            response = await fetch("http://localhost:8000/api/save_route/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify(normalRouteData),
                credentials: "include",
            });
        }

        if (response.ok) {
            alert("Thanks for using RoutePulse! Your route was saved successfully.");
            navigate("/");
        } else {
            const data = await response.json();
            if (data.error) {
                setError(data.error);
            } else {
                setError("An unexpected error occurred while saving the route.");
            }
        }
        setIsSaving(false);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>
            <div className={styles.rateRouteContainer}>
                <div className={styles.content}>
                    <div className={styles.heading}>Thanks for using RoutePulse!</div>
                    <div className={styles.text}>We hope you had a great experience!</div>
                    <div className={styles.text}>Your route details are as follows:</div>
                    <div className={styles.routeDetails}>
                        {(transportType === "Tram" || transportType === "Bus") ? (
                            <>
                                <div className={styles.routeDetailsText}>
                                    <span className={styles.label}>Short Name:</span>{" "}
                                    {state.route_short_name || "Unknown"}
                                </div>
                                <div className={styles.routeDetailsText}>
                                    <span className={styles.label}>Long Name:</span>{" "}
                                    {state.route_long_name || "Unknown"}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.routeDetailsText}>
                                    <span className={styles.label}>Origin:</span>{" "}
                                    {originAddress || state.origin}
                                </div>
                                <div className={styles.routeDetailsText}>
                                    <span className={styles.label}>Destination:</span>{" "}
                                    {destinationAddress || state.destination}
                                </div>
                            </>
                        )}
                        <div className={styles.routeDetailsText}>
                            <span className={styles.label}>Distance:</span>{" "}
                            {Math.floor(state.routeDistance / 1000)} km
                        </div>
                        <div className={styles.routeDetailsText}>
                            <span className={styles.label}>Duration:</span>{" "}
                            {state.routeDuration} mins
                        </div>
                        <div className={styles.routeDetailsText}>
                            <span className={styles.label}>Cost:</span> {state.routeCost} $
                        </div>
                    </div>

                    {/* Leaflet Map */}
                    <MapContainer
                        center={[mapCenter[0], mapCenter[1]]}
                        zoom={12}
                        scrollWheelZoom={true}
                        style={{ height: "400px", width: "100%", margin: "1rem 0" }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={originCoords}>
                            <Popup>{originAddress || "Origin"}</Popup>
                        </Marker>
                        <Marker position={destinationCoords}>
                            <Popup>{destinationAddress || "Destination"}</Popup>
                        </Marker>
                        {decodedPolyline && decodedPolyline.length > 0 && (
                            <Polyline
                                positions={decodedPolyline.map((coord) => [
                                    parseFloat(coord[0]),
                                    parseFloat(coord[1]),
                                ])}
                                color="blue"
                            />
                        )}
                    </MapContainer>

                    <div
                        className={styles.saveButton}
                        onClick={handleSaveRoute}
                        role="button"
                        tabIndex="0"
                        aria-disabled={isSaving || !originAddress || !destinationAddress}
                    >
                        {isSaving ? "Saving..." : "Save Route"}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default EndRoute;
