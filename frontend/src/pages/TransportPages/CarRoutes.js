/* global H */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import {MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvent, Circle} from 'react-leaflet';
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

const reportIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const stationIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-yellow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})


function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


function findNearbyStations(polylinePoints, stations) {
  const nearby = [];

  for (const station of stations) {
    for (const [lat, lon] of polylinePoints) {
      const dist = haversineDistance(lat, lon, station.latitude, station.longitude);
      if (dist <= 200) { // within 100 meters
        nearby.push(station);
        break;
      }
    }
  }
  return nearby.filter(nearby=>nearby.aqi>70);
}


const findNearbyReport = (polylinePoints, reports, threshold = 150) => {
  if (!polylinePoints || !reports) return null;
  for (let report of reports) {
    const reportLat = parseFloat(report.latitude);
    const reportLon = parseFloat(report.longitude);
    for (let point of polylinePoints) {
      const distance = haversineDistance(reportLat, reportLon, point[0], point[1]);
      if (distance < threshold) {
        return report;
      }
    }
  }
  return null;
};

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
  const [sortBy, setSortBy] = useState("duration");
  const [sortedRoutes, setSortedRoutes] = useState([]);
  const navigate = useNavigate();
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [routeCost, setRouteCost] = useState(null);
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [nearbyReport, setNearbyReport] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [nearbyStations, setNearbyStations] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/air_quality_points/")
        .then((res) => res.json())
        .then((data) => {
          setStations(data.data);
        })
        .catch((err) => {
          setError("Failed to load data: " + err.message);
        });
  }, []);


  useEffect(() => {
    fetch("http://localhost:8000/api/reports/recent/")
        .then((response) => response.json())
        .then((data) => {
          console.log("Reports:", data);
          setReports(data);
        })
        .catch((error) => {
          console.error("Error fetching reports:", error);
          alert("Failed to fetch reports. Please try again later.");
        });
  }, []);

  useEffect(() => {
    fetch(`http://localhost:8000/api/user/`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
          console.log("User Data:", data);
          setUser(data);
        })
        .catch(error => console.error("Error fetching user data:", error));
  }, []);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = [position.coords.latitude, position.coords.longitude];
            // Set both the user's current location and the origin if using current location as origin
            setUserLocation(coords);
            setOriginCoords(coords);
            console.log('Current location obtained:', coords);
            setOriginInput(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
            setMapCenter(coords);
          },
          (err) => {
            console.error("Geolocation error:", err);
            setError("Unable to retrieve your location. Please ensure location services are enabled and you have granted permissions.");
          }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  const isUserNearOrigin = async () => {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported");
      return false;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const userCoords = [position.coords.latitude, position.coords.longitude];
            console.log("User location fetched:", userCoords);

            if (!originCoords) {
              console.log("Origin coordinates not set!");
              resolve(false);
              return;
            }

            const distance = haversineDistance(
                userCoords[0], userCoords[1],
                originCoords[0], originCoords[1]
            );

            console.log("Calculated distance:", distance);
            resolve(distance <= 300);
          },
          (error) => {
            console.log("Error fetching location:", error);
            resolve(false);
          },
          { enableHighAccuracy: true }
      );
    });
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
    iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-blue.png',
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
      distance: (routeDetails.sections[0].travelSummary.length),
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
      setMapCenter(origin);
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

  const sortRoutes = (routes, sortBy) => {
    if (!routes) return [];
    return [...routes].sort((a, b) => {
      if (sortBy === "duration") {
        return a.sections[0].travelSummary.duration - b.sections[0].travelSummary.duration;
      } else if (sortBy === "distance") {
        return a.sections[0].travelSummary.length - b.sections[0].travelSummary.length;
      } else if (sortBy === "cost") {
        return (a.cost || 0) - (b.cost || 0);
      }
      return 0;
    });
  };

  useEffect(() => {
    if (routeInfo && routeInfo.routes) {
      const sorted = sortRoutes(routeInfo.routes, sortBy);
      setSortedRoutes(sorted);
      setSelectedRoute(0); // Reset selection on sort change
    }
  }, [routeInfo, sortBy]);

  const selectedRouteDetails = sortedRoutes[selectedRoute];
  useEffect(() => {
    if (selectedRouteDetails) {
      setRouteDistance(convertDistance(selectedRouteDetails.sections[0].travelSummary.length) * 1000);
      setRouteDuration(convertDuration(selectedRouteDetails.sections[0].travelSummary.duration));
      setRouteCost(selectedRouteDetails.cost);

      // Decode polyline points
      const polylinePoints = getDecodedPolyline(selectedRouteDetails.sections[0].polyline);

      // Find nearby report
      const report = findNearbyReport(polylinePoints, reports);
      setNearbyReport(report);

      // Find nearby stations (CO2 points)
      const nearbyStations = findNearbyStations(polylinePoints, stations);
      setNearbyStations(nearbyStations);
    }
  }, [selectedRouteDetails, reports, stations]);

  const handleUseRoute = (route) => {
    console.log(routeDistance);
    let bonusPoints = 0;
    if (nearbyStations)
      bonusPoints = 20;
    navigate('/use-route', {
      state: {
        route,
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

  const handleReport = (nearbyReport) =>{
    console.log(nearbyReport);
    const report_id = nearbyReport.id;
    navigate(`/report/${report_id}`);
  };

  function DestinationSelector({ onSelect }) {
    useMapEvent('click', (e) => {
      const coords = [e.latlng.lat, e.latlng.lng];
      onSelect(coords);
    });
    return null;
  }

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
                <button onClick={()=> navigate('/personalized')}  className={styles.NavigateButton}>Use the multi task page</button>
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
                      <div className={styles.sortContainer}>
                        <label>Sort by: </label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                          <option value="duration">Fastest</option>
                          <option value="distance">Shortest Distance</option>
                          <option value="cost">Lowest Cost</option>
                        </select>
                      </div>
                      <div className={styles.routeTabs}>
                        {sortedRoutes.map((route, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedRoute(index)}
                                className={`${styles.tabButton} ${
                                    selectedRoute === index
                                        ? (nearbyReport ? styles.activeTabRed : styles.activeTab)
                                        : ''
                                }`}
                            >
                              Route {index + 1}
                            </button>
                        ))}
                      </div>
                      {selectedRouteDetails && (
                          <div className={styles.detailsText}>
                            <p><strong>Travel Time:</strong> {routeDuration}</p>
                            <p><strong>Route Distance:</strong> {routeDistance / 1000} km</p>
                            <p><strong>Cost:</strong> {selectedRouteDetails.cost}$</p>
                            {nearbyReport && (
                                <p className={styles.reportRed}>
                                  <strong onClick={() => handleReport(nearbyReport)}>
                                    Accident Reported Near Route:
                                  </strong> {nearbyReport.city}, {nearbyReport.street}
                                </p>
                            )}
                            {nearbyStations.filter(station => station.aqi > 70).length > 0 && (
                                <p className={styles.reportRed}>
                                  <strong>
                                    High air pollution near route
                                    <br />
                                    We recommend you to use the public transport or the train.
                                  </strong>
                                </p>
                            )}
                          </div>
                      )}
                      {selectedRouteDetails && user && (
                          <div className={styles.buttonsContainer}>
                            <button onClick={() => handleSaveRoute(selectedRouteDetails)} className={styles.button}>
                              Save Route
                            </button>
                            <button
                                onClick={async () => {
                                  const isNear = await isUserNearOrigin();
                                  if (!isNear) {
                                    alert("You must be near the route origin to use this route.");
                                  } else {
                                    handleUseRoute(selectedRouteDetails);
                                  }
                                }}
                                className={styles.button}
                            >
                              Use Route
                            </button>
                          </div>
                      )}
                    </div>
                )}
              </div>

              <div className={styles.rightColumn}>
                <MapContainer
                    center={mapCenter}
                    zoom={12}
                    scrollWheelZoom={true}
                    className={styles.leafletContainer}
                >
                  <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                  />
                  {originCoords && (
                      <Marker position={originCoords} icon={redIcon}>
                        <Popup>Origin</Popup>
                      </Marker>
                  )}
                  {destinationCoords && (
                      <Marker position={destinationCoords} icon={redIcon}>
                        <Popup>Destination</Popup>
                      </Marker>
                  )}
                  {routeInfo && selectedRouteDetails && (
                      <Polyline positions={getDecodedPolyline(selectedRouteDetails.sections[0].polyline)} color="blue" weight={4} />
                  )}
                  {nearbyReport && (
                      <Marker
                          position={[
                            parseFloat(nearbyReport.latitude),
                            parseFloat(nearbyReport.longitude)
                          ]}
                          icon={reportIcon}
                      >
                        <Popup>
                          Accident reported here: {nearbyReport.city}, {nearbyReport.street}
                        </Popup>
                      </Marker>
                  )}
                  {nearbyStations && nearbyStations.map((station, index) => (
                      <Circle
                          key={index}
                          center={[
                            parseFloat(station.latitude),
                            parseFloat(station.longitude),
                          ]}
                          radius={500}
                          pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3 }}
                      >
                        <Popup>
                          CO2 point: {station.aqi}
                        </Popup>
                      </Circle>
                  ))}
                  <DestinationSelector onSelect={async (coords) => {
                    setDestinationCoords(coords);
                    setMapCenter(coords);
                    const address = await getAddressFromCoordinates(coords);
                    setDestination(address);
                  }} />
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
