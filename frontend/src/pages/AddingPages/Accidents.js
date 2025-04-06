import React, {useState, useCallback, useEffect} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import styles from "../../styles/Adding/Accidents.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});
const defaultMapCenter = [47.1585, 27.6014];
const MapEvents = React.memo(({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e);
        },
    });
    return null;
});
const MapComponent = React.memo(({ mapCenter, markerPosition, onMapClick }) => {
    return (
        <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={false}
            style={{ width: "90%", height: "640px", borderRadius: "15px" }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={markerPosition}>
                <Popup>Selected Location</Popup>
            </Marker>
            <MapEvents onMapClick={onMapClick} />
        </MapContainer>
    );
});
function Accidents() {
    const [formData, setFormData] = useState({
        user_id: "",
        city: "",
        street: "",
        date: "",
        time: "",
        problemType: "accident",
        details: "",
        contactInfo: "",
        latitude: null,
        longitude: null,
    });
    const [mapCenter, setMapCenter] = useState(defaultMapCenter);
    const [markerPosition, setMarkerPosition] = useState(defaultMapCenter);
    const [mapVisible, setMapVisible] = useState(false);
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const [user, setUser] = useState({});
    useEffect(() => {
        fetch(`http://localhost:8000/api/user/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                console.log("User Data:", data); // Debugging
                setUser(data);
            })
            .catch(error => console.error("Error fetching user data:", error));
    }, []);

    const fetchCoordinates = async (city, street) => {
        const url = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(
            street
        )}&city=${encodeURIComponent(city)}&country=Romania&format=json&addressdetails=1&limit=1`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.length > 0) {
                const bestResult = data[0];
                return {
                    latitude: parseFloat(bestResult.lat),
                    longitude: parseFloat(bestResult.lon),
                };
            } else {
                alert("Could not fetch accurate coordinates based on city and street.");
                return null;
            }
        } catch (error) {
            alert("Error fetching coordinates.");
            return null;
        }
    };
    const fetchAddressFromCoords = async (lat, lng) => {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.address) {
                const address = data.address;
                const city = address.city || address.town || address.village || "";
                const street = address.road || address.pedestrian || "";
                return { city, street };
            } else {
                alert("Could not fetch address from coordinates.");
                return null;
            }
        } catch (error) {
            alert("Error fetching address from coordinates.");
            return null;
        }
    };
    const handleMapClick = useCallback((e) => {
        const { lat, lng } = e.latlng;
        setMarkerPosition([lat, lng]);
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        setMapCenter([lat, lng]);
    }, []);
    const handleUseCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setMarkerPosition([lat, lng]);
                setMapCenter([lat, lng]);
                setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                const address = await fetchAddressFromCoords(lat, lng);
                if (address) {
                    setFormData((prev) => ({ ...prev, city: address.city, street: address.street }));
                }
            },
            (error) => {
                alert("Unable to retrieve your location.");
            }
        );
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        const { city, street, date, time, problemType, details, contactInfo, latitude, longitude } = formData;

        if (!date || !time || !problemType || !details) {
            alert("Please fill in all required fields.");
            return;
        }

        let finalCity = city;
        let finalStreet = street;
        let finalCoords = { latitude, longitude };

        if (mapVisible) {
            if (!latitude || !longitude) {
                alert("Please click on the map or use your current location to select a location.");
                return;
            }
            const address = await fetchAddressFromCoords(latitude, longitude);
            if (address) {
                finalCity = address.city;
                finalStreet = address.street;
            } else {
                return;
            }
        } else {
            if (!city || !street) {
                alert("Please fill in all required fields.");
                return;
            }
            const coords = await fetchCoordinates(city, street);
            if (!coords) return;
            finalCoords = coords;
        }
        const dataToSend = {
            user_id: user.id,  // Make sure to include the user ID here
            city: finalCity,
            street: finalStreet,
            date,
            time,
            problem_type: problemType,
            details,
            contact_info: contactInfo,
            latitude: finalCoords.latitude,
            longitude: finalCoords.longitude,
        };

        try {
            const response = await fetch("http://localhost:8000/api/report-accident/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });
            const responseData = await response.json();
            if (response.ok) {
                alert("Routier problem reported successfully!");
                setFormData({
                    city: "",
                    street: "",
                    date: "",
                    time: "",
                    problemType: "accident",
                    details: "",
                    contactInfo: "",
                    latitude: null,
                    longitude: null,
                });
            } else {
                alert(`Failed to report accident: ${responseData.error || "Unknown error"}`);
            }
        } catch (error) {
            alert("Error reporting accident.");
        }
    };

    return (
        <div className={styles.app}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>
            <div className={styles.bodyContainer}>
                {mapVisible ? (
                    <div className={styles.mapHeader}>
                        <MapComponent mapCenter={mapCenter} markerPosition={markerPosition} onMapClick={handleMapClick} />
                    </div>
                ) : (
                    <header className={styles.header}>
                        <h1>Routier Problem Reporting</h1>
                    </header>
                )}
                <div className={styles.container}>
                    <h2 className={styles.heading}>Report a New Problem</h2>
                    <form id="problemForm" onSubmit={handleSubmit}>
                        <div className={styles["datetime-container"]}>
                            <div className={styles["form-group"]}>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    className={styles.input}
                                    disabled={mapVisible}
                                />
                                <label htmlFor="city" className={styles.label}>
                                    City
                                </label>
                            </div>
                            <div className={styles["form-group"]}>
                                <input
                                    type="text"
                                    id="street"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    required
                                    className={styles.input}
                                    disabled={mapVisible}
                                />
                                <label htmlFor="street" className={styles.label}>
                                    Street
                                </label>
                            </div>
                        </div>
                        <div className={styles["datetime-container"]}>
                            <div className={styles["form-group"]}>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                    className={styles.input}
                                />
                                <label htmlFor="date" className={styles.label}>
                                    Date of Problem
                                </label>
                            </div>
                            <div className={styles["form-group"]}>
                                <input
                                    type="time"
                                    id="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    required
                                    className={styles.input}
                                />
                                <label htmlFor="time" className={styles.label}>
                                    Time of Problem
                                </label>
                            </div>
                        </div>
                        <div className={styles["form-group"]}>
                            <select
                                id="problemType"
                                name="problemType"
                                value={formData.problemType}
                                onChange={handleChange}
                                required
                                className={`${styles.input} ${styles.select}`}
                            >
                                <option value="accident">Accident</option>
                                <option value="roadInProgress">Road in Progress</option>
                                <option value="blockage">Road Blockage</option>
                                <option value="weatherConditions">Weather Conditions</option>
                            </select>
                            <label htmlFor="problemType" className={styles.label}>
                                Type of Problem
                            </label>
                        </div>
                        <div className={styles["form-group"]}>
              <textarea
                  id="details"
                  name="details"
                  rows="4"
                  value={formData.details}
                  onChange={handleChange}
                  required
                  className={styles.input}
              ></textarea>
                            <label htmlFor="details" className={styles.label}>
                                Details
                            </label>
                        </div>
                        <div className={styles["form-group"]}>
                            <input
                                type="text"
                                id="contactInfo"
                                name="contactInfo"
                                value={formData.contactInfo}
                                onChange={handleChange}
                                className={styles.input}
                            />
                            <label htmlFor="contactInfo" className={styles.label}>
                                Contact Info (optional)
                            </label>
                        </div>
                        <div className={styles["form-group"]}>
                            <div className={styles["button-container"]}>
                                <button type="button" className={styles.button} onClick={() => setMapVisible(!mapVisible)}>
                                    {mapVisible ? "Use Inputs" : "Use Map"}
                                </button>
                                <button type="button" className={styles.button} onClick={handleUseCurrentLocation}>
                                    Use Current Location
                                </button>
                            </div>
                        </div>
                        <div className={styles["form-footer"]}>
                            <button type="submit" className={styles.button}>
                                Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default Accidents;
