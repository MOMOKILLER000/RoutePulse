/* global H */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import styles from '../../styles/TransportPages/car.module.css';
import Footer from "../../components/Footer";

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

// New component to update map view when center changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function CarRoutes() {
  const [originInput, setOriginInput] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const csrfFetched = useRef(false);
  const [mapCenter, setMapCenter] = useState([44.4268, 26.1025]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = [position.coords.latitude, position.coords.longitude];
            setOriginCoords(coords);
            setOriginInput(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
            setMapCenter(coords);  // Update map center when location is fetched
          },
          (err) => {
            console.error("Geolocation error:", err);
            setError("Unable to retrieve your location.");
          }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

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

  const redIcon = new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const getDecodedPolyline = (polylineString) => {
    try {
      const decoded = H.util.flexiblePolyline.decode(polylineString);
      return decoded.polyline.map(coord => [coord[0], coord[1]]);
    } catch (err) {
      console.error("Error decoding polyline", err);
      return [];
    }
  };

  const convertDuration = (durationInSeconds) => {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const convertDistance = (distanceInMeters) => {
    return (distanceInMeters / 1000).toFixed(2);
  };

  const getCityCoordinates = async (locationName) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: locationName,
          format: 'json',
          addressdetails: 1,
          limit: 1,
        },
      });
      if (response.data.length > 0) {
        const loc = response.data[0];
        return [parseFloat(loc.lat), parseFloat(loc.lon)];
      } else {
        setError("Location not found.");
        return null;
      }
    } catch (err) {
      console.error("Error fetching location coordinates:", err);
      setError("Error fetching location coordinates. Please try again.");
      return null;
    }
  };

  const handleSaveRoute = async (routeDetails) => {
    if (!routeDetails) {
      setError("No route selected.");
      return;
    }
    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      alert('CSRF token is missing!');
      return;
    }
    let originAddress = originInput;
    let originCoordinates = originCoords;
    if (originCoords) {
      originAddress = await getAddressFromCoordinates(originCoords);
    }
    let destinationAddress = destination;
    let destinationCoordinates = destinationCoords;
    if (destinationCoords) {
      destinationAddress = await getAddressFromCoordinates(destinationCoords);
    }

    const routeData = {
      origin: originAddress,
      origin_coordinates: originCoordinates,
      destination: destinationAddress,
      destination_coordinates: destinationCoordinates,
      polyline: JSON.stringify(getDecodedPolyline(routeDetails.sections[0].polyline)),
      duration: routeDetails.sections[0].travelSummary.duration,
      distance: routeDetails.sections[0].travelSummary.length,
      cost: routeDetails.cost,
    };

    try {
      const response = await fetch('http://localhost:8000/api/save_route/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(routeData),
        credentials: 'include',
      });

      if (response.ok) {
        alert('Route saved successfully!');
      } else {
        const data = await response.json();
        setError(data.error || "Error saving route.");
      }
    } catch (error) {
      setError("Error saving route.");
    }
  };

  const getAddressFromCoordinates = async (coords) => {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: coords[0],
          lon: coords[1],
          format: 'json',
          addressdetails: 1,
        },
      });

      if (response.data && response.data.address) {
        const { road, suburb, city, state, country } = response.data.address;
        const address = `${road || ''} ${suburb || ''} ${city || ''} ${state || ''} ${country || ''}`.trim();
        return address || 'Unknown Location';
      } else {
        return 'Unknown Location';
      }
    } catch (err) {
      console.error("Error fetching address from coordinates:", err);
      return 'Unable to retrieve address';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!originCoords && !originInput) || !destination) {
      setError("Both origin and destination are required.");
      return;
    }
    let origin;
    if (originCoords) {
      origin = originCoords;
    } else {
      origin = await getCityCoordinates(originInput);
      setOriginCoords(origin);
    }
    const dest = await getCityCoordinates(destination);
    if (origin && dest) {
      setDestinationCoords(dest);
      setError(null);
    }
  };

  useEffect(() => {
    if (originCoords && destinationCoords) {
      const fetchRoute = async () => {
        const baseURL = "http://localhost:8000/api/cars/";
        try {
          const response = await axios.get(baseURL, {
            params: {
              origin: originCoords.join(','),
              destination: destinationCoords.join(','),
            },
          });
          setRouteInfo(response.data);
          setError(null);
        } catch (err) {
          console.error("Error fetching route:", err);
          setError("Error fetching route. Please try again.");
        }
      };
      fetchRoute();
    }
  }, [destinationCoords, originCoords]);

  const selectedRouteDetails = routeInfo && routeInfo.routes && routeInfo.routes[selectedRoute];

  return (
      <div className={styles.firstContainer}>
        <div className={styles.mainContainer}>
          <div className={styles.navbarAdjust}>
            <Navbar />
          </div>
          <div className={styles.bodyContainer}>
            <h1 className={styles.title}>Fastest Route Finder</h1>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.contentContainer}>
              <div className={styles.leftColumn}>
                <form onSubmit={handleSubmit} className={styles.formContainer}>
                  <div className={styles.formGroup}>
                    <label><strong>Origin:</strong></label>
                    <div className={styles.originInputContainer}>
                      <input
                          type="text"
                          value={originInput}
                          onChange={(e) => setOriginInput(e.target.value)}
                          placeholder="Enter starting location"
                          required={!originCoords}
                      />
                      <button
                          type="button"
                          className={styles.locationButton}
                          onClick={handleUseCurrentLocation}
                      >
                        📍
                      </button>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label><strong>Destination:</strong></label>
                    <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Enter destination"
                        required
                    />
                  </div>
                  <button type="submit" className={styles.button}>Get Route</button>
                </form>

                {routeInfo && routeInfo.routes && (
                    <div className={styles.routeInfo}>
                      <h2>Route Details</h2>
                      <div className={styles.routeTabs}>
                        {routeInfo.routes.map((route, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedRoute(index)}
                                className={`${styles.tabButton} ${selectedRoute === index ? styles.activeTab : ''}`}
                            >
                              Route {index + 1}
                            </button>
                        ))}
                      </div>
                      {selectedRouteDetails && (
                          <div className={styles.detailsText}>
                            <p><strong>Travel Time:</strong> {convertDuration(selectedRouteDetails.sections[0].travelSummary.duration)}</p>
                            <p><strong>Distance:</strong> {convertDistance(selectedRouteDetails.sections[0].travelSummary.length)} km</p>
                          </div>
                      )}
                      {selectedRouteDetails && (
                          <button
                              onClick={() => handleSaveRoute(selectedRouteDetails)}
                              className={styles.button}
                          >
                            Save Route
                          </button>
                      )}
                    </div>
                )}
              </div>

              <div className={styles.rightColumn}>
                <MapContainer
                    center={mapCenter}  // Use the dynamic map center
                    zoom={12}
                    scrollWheelZoom={true}
                    className={styles.leafletContainer}
                >
                  <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                  />
                  {originCoords && <Marker position={originCoords} icon={redIcon}><Popup>Origin</Popup></Marker>}
                  {destinationCoords && <Marker position={destinationCoords} icon={redIcon}><Popup>Destination</Popup></Marker>}
                  {routeInfo && selectedRouteDetails && (
                      <>
                        <Polyline positions={getDecodedPolyline(selectedRouteDetails.sections[0].polyline)} color="blue" weight={4} />
                      </>
                  )}
                  {/* Add ChangeView component to update map view */}
                  <ChangeView center={mapCenter} zoom={12} />
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
  );
}

export default CarRoutes;
