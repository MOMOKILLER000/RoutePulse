    import React, { useEffect, useState} from 'react';
    import {MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap, Popup} from 'react-leaflet';
    import L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import { useParams, useNavigate } from 'react-router-dom';
    import Navbar from '../../components/Navbar';
    import styles from '../../styles/TransportPages/publicTransport.module.css';
    import Footer from "../../components/Footer";
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371000; // Radius of Earth in meters
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
    const polylineColors = ['red', 'blue', 'green', 'purple', 'orange', 'cyan', 'magenta', 'yellow', 'brown', 'pink'];
    const getColor = (index) => polylineColors[index % polylineColors.length];

    const createMarkerIcon = (color) => {
        return new L.Icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    };

    const MapCenterUpdater = ({ mapCenter }) => {
        const map = useMap();
        useEffect(() => {
            if (map && mapCenter) {
                map.setView(mapCenter, map.getZoom());
            }
        }, [map, mapCenter]);
        return null;
    };

    const MapComponent = () => {
        const { city, transport } = useParams();
        const [vehicleType, setVehicleType] = useState("");
        const [routes, setRoutes] = useState([]);
        const [selectedRoute, setSelectedRoute] = useState("");
        const [trips, setTrips] = useState([]);
        const [selectedTrip, setSelectedTrip] = useState("");
        const [polylineData, setPolylineData] = useState([]);
        const [mapCenter, setMapCenter] = useState([47.1585, 27.6014]);
        const [linia, setLinia] = useState(null);
        const [viewOption, setViewOption] = useState('routes'); // Default to 'routes'
        const [stopSearch, setStopSearch] = useState(""); // For Nearest Stop Search
        const [destinationSearch, setDestinationSearch] = useState(""); // For Destination Stop Search
        const navigate = useNavigate();
        useEffect(() => {
            if (transport === "tram") {
                setVehicleType("0");
            } else if (transport === "bus") {
                setVehicleType("3");
            }
        }, [transport]);
        const [stops, setStops] = useState([]);
        const [destinationStop, setDestinationStop] = useState('');
        const [userLocation, setUserLocation] = useState(null);
        const [nearestStop, setNearestStop] = useState(null);
        const [route, setRoute] = useState(null);
        const getAgencyIdAndCenter = (city) => {
            switch(city.toLowerCase()) {
                case 'iasi':
                    return { agencyId: '1', center: [47.1585, 27.6014] };
                case 'cluj':
                    return { agencyId: '2', center: [46.7712, 23.6236] };
                case 'timisoara':
                    return { agencyId: '8', center: [45.7585, 21.2256] };
                case 'botosani':
                    return { agencyId: '6', center: [47.7468, 26.6628] };
                default:
                    return { agencyId: '1', center: [47.1585, 27.6014] };
            }
        };




        useEffect(() => {
            const { agencyId, center } = getAgencyIdAndCenter(city);
            fetch(`http://localhost:8000/api/stops/?agency_id=${agencyId}`)
                .then(response => response.json())
                .then(data => setStops(data))
                .catch(err => console.error("Error fetching stops", err));
        }, [city]);



        const getUserLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                }, error => {
                    console.error("Error getting location", error);
                });
            } else {
                alert("Geolocation is not supported by this browser.");
            }
        };

        const findNearestStop = () => {
            if (!userLocation) {
                alert("Please get your location first");
                return;
            }
            const { agencyId, center } = getAgencyIdAndCenter(city);
            fetch(`http://localhost:8000/api/nearest_stop/?agency_id=${agencyId}&lat=${userLocation.lat}&lon=${userLocation.lon}`)
                .then(response => response.json())
                .then(data => {setNearestStop(data)
                console.log(data)})
                .catch(err => console.error("Error finding nearest stop", err));
        };


        const getRoute = () => {
            if (!nearestStop || !destinationStop) {
                alert("Please ensure you have a nearest stop and a destination selected.");
                return;
            }
            const startingStopId = nearestStop.stop_id;
            const destinationStopId = destinationStop ? destinationStop.stop_id : ''; // Ensure it's the stop_id, not the whole object
            const route_type = Number(vehicleType)
            fetch(`http://localhost:8000/api/generate_route/?starting_stop_id=${startingStopId}&destination_stop_id=${destinationStopId}&route_type=${route_type}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    } else {
                        setRoute(data);
                        setLinia(data.polyline);
                        console.log(data.polyline);
                    }
                })
                .catch(err => console.error("Error fetching route", err));
        };


        function CenterMap({ location }) {
            const map = useMap();
            map.setView(location, map.getZoom());
            return null;
        }


        const polylinePositions = route && route.polyline ? route.polyline : [];
        let allPolylinePositions = [];


        if (route && route.routes) {
            route.routes.forEach(r => {
                if (r.polyline) {
                    allPolylinePositions = [...allPolylinePositions, ...r.polyline];
                }
            });
        } else if (polylinePositions.length > 0) {
            allPolylinePositions = polylinePositions;
        }




        useEffect(() => {
            const { agencyId, center } = getAgencyIdAndCenter(city);
            setMapCenter(center);
            if (vehicleType !== "") {
                fetch(`http://localhost:8000/api/routes/?agency_id=${agencyId}`)
                    .then(response => response.json())
                    .then(data => {
                        const filteredRoutes = data.filter(route => route.route_type === Number(vehicleType));
                        setRoutes(filteredRoutes);
                    })
                    .catch(error => console.error('Error fetching routes:', error));
            } else {
                setRoutes([]);
                setSelectedRoute("");
            }
        }, [vehicleType, city]);

        const handleRouteSelect = (event) => {
            const routeId = event.target.value;
            setSelectedRoute(routeId);
            setSelectedTrip("");
            setPolylineData([]);
            const { agencyId } = getAgencyIdAndCenter(city);
            if (routeId) {
                fetch(`http://localhost:8000/api/routes/${routeId}/trips/?agency_id=${agencyId}`)
                    .then(response => response.json())
                    .then(data => setTrips(data))
                    .catch(error => console.error('Error fetching trips:', error));
            } else {
                setTrips([]);
            }
        };
        const handleTripSelect = (event) => {
            const tripId = event.target.value;
            setSelectedTrip(tripId);
        };
        useEffect(() => {
            if (selectedTrip && trips.length > 0) {
                const trip = trips.find(t => t.trip_id === selectedTrip);
                if (trip) {
                    const { agencyId } = getAgencyIdAndCenter(city);
                    fetch(`http://localhost:8000/api/shapes/${trip.shape_id}/?agency_id=${agencyId}`)
                        .then(response => response.json())
                        .then(data => {
                            setPolylineData([{ shapeId: trip.shape_id, polyline: data.polyline, tripHeadsign: trip.trip_headsign }]);
                        })
                        .catch(error => console.error('Error fetching shape data:', error));
                }
            } else {
                setPolylineData([]);
            }
        }, [selectedTrip, trips, city]);
        const getStopsNearPolyline = (polyline) => {
            return stops.filter(stop =>
                polyline.some(point => getDistance(stop.stop_lat, stop.stop_lon, point[0], point[1]) <= 10)
            );
        };
        const aggregateMarkers = () => {
            const markers = [];
            const stopNameCounts = {};


            if (viewOption === 'routes') {
                polylineData.forEach((data, index) => {
                    const color = getColor(index);
                    const stopsNear = getStopsNearPolyline(data.polyline);
                    stopsNear.forEach(stop => {
                        if (!stopNameCounts[stop.stop_name]) {
                            stopNameCounts[stop.stop_name] = 0;
                        }
                        if (stopNameCounts[stop.stop_name] < 1) {
                            markers.push({ ...stop, color });
                            stopNameCounts[stop.stop_name]++;
                        }
                    });
                });
            }


            if (viewOption === 'direct' && linia) {
                const stopsNear = getStopsNearPolyline(linia);
                stopsNear.forEach(stop => {
                    if (!stopNameCounts[stop.stop_name]) {
                        stopNameCounts[stop.stop_name] = 0;
                    }
                    if (stopNameCounts[stop.stop_name] < 1) {
                        markers.push({ ...stop, color: 'blue' }); // Using 'blue' for direct route markers, can change color
                        stopNameCounts[stop.stop_name]++;
                    }
                });
            }

            return markers;
        };

        const markersToRender = aggregateMarkers();



        const handleStopSelectChange = (e) => {
            const selectedId = e.target.value;
            const selectedStopObj = stops.find(stop => stop.stop_id.toString() === selectedId); // Convert stop_id to string for comparison
            setNearestStop(selectedStopObj);
        };

        const handleDestinationSelectChange = (e) => {
            const selectedId = e.target.value;
            const selectedStopObj = stops.find(stop => stop.stop_id.toString() === selectedId); // Convert stop_id to string for comparison
            setDestinationStop(selectedStopObj);
        };

        const toggleViewOption = () => {
            setViewOption(viewOption === 'routes' ? 'direct' : 'routes');
        };
        const handleSaveRoute = async (route) =>{
            const routeData = {
                startingStopId: nearestStop.stop_id,
                destinationStopId: destinationStop ? destinationStop.stop_id : '',
                route_short_name: route.route.short_name,
                route_long_name: route.route.long_name,
                polyline: route.polyline,
                duration: route.duration,
                distance: route.distance,
            }
            try {
                const route_type = Number(vehicleType);
                const { agencyId } = getAgencyIdAndCenter(city);
                const response = await fetch(`http://localhost:8000/api/save_publictransportroute/${agencyId}/${route_type}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(routeData),
                    credentials: 'include',
                });

                if (response.ok) {
                    alert('Route saved successfully!');
                } else {
                    const data = await response.json();
                }
            } catch (error) {
                console.log("Error saving route.");
            }
        }

        const handleUseRoute = async (route) =>{
            if(vehicleType === '0'){
                const transport = 'Tram'
            }
            else {
                const transport = 'Bus'
            }
            const { agencyId } = getAgencyIdAndCenter(city);
            navigate('/use-route', {
                state: {
                    route: { sections: [{ polyline: route.polyline }] },
                    originCoords: route.origin_coordinates,
                    destinationCoords: route.destination_coordinates,
                    routeDistance: route.distance,
                    routeDuration: route.duration,
                    polyline: route.polyline,
                    routeCost : 0.8,
                    transport : transport,
                    route_short_name: route.route.short_name,
                    route_long_name: route.route.long_name,
                    agency_id : agencyId,
                    origin: nearestStop.stop_id,
                    destination: destinationStop ? destinationStop.stop_id : '',
                },
            });
        }

        const isUserNearOrigin = () => {
            return new Promise((resolve) => {
                if (!nearestStop) {
                    // If no nearest stop is set, resolve to false
                    resolve(false);
                    return;
                }
                if (!navigator.geolocation) {
                    console.error("Geolocation is not supported by this browser.");
                    resolve(false);
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        const distance = getDistance(
                            latitude,
                            longitude,
                            nearestStop.stop_lat,
                            nearestStop.stop_lon
                        );
                        console.log("Distance to nearest stop:", distance);
                        resolve(distance <= 300); // Adjust threshold (in meters) as needed
                    },
                    (error) => {
                        console.error("Error fetching location:", error);
                        resolve(false);
                    },
                    { enableHighAccuracy: true }
                );
            });
        };

        return (
            <div className={styles.body}>
                <div className={styles.navbar}>
                    <Navbar />
                </div>
                <div className={styles['map-container']}>
                    <div className={styles['button-container']}>
                        <button onClick={toggleViewOption} className={styles['toggle-button']}>
                            {viewOption === 'routes' ? 'Switch to Direct Route' : 'Switch to Routes & Trips'}
                        </button>
                    </div>

                    {viewOption === 'routes' && (
                        <div>
                            <h2 className={styles['section-heading']}>Routes & Trips</h2>
                            <p className={styles['sub-text']}>
                                Our service offers eco-friendly transit options that help reduce your carbon footprint.
                            </p>
                            <div className={styles.excursie}>
                                {vehicleType && (
                                    <div className={styles['select-container']}>
                                        <select onChange={handleRouteSelect} value={selectedRoute} className={styles['styled-select']}>
                                            <option value="">Select Route</option>
                                            {routes
                                                .slice() // create a shallow copy to avoid mutating state directly
                                                .sort((a, b) => a.route_short_name.localeCompare(b.route_short_name)) // sort lexicographically
                                                .map(route => (
                                                    <option key={route.route_id} value={route.route_id}>
                                                        {route.route_short_name} - {route.route_long_name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                )}

                                {selectedRoute && trips.length > 0 && (
                                    <div className={styles['select-container']}>
                                        <select onChange={handleTripSelect} value={selectedTrip} className={styles['styled-select']}>
                                            <option value="">Select Trip</option>
                                            {trips.map(trip => (
                                                <option key={trip.trip_id} value={trip.trip_id}>
                                                    {trip.trip_headsign}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {viewOption === 'direct' && (
                        <div>
                            <h2 className={styles['section-heading']}>Direct Route</h2>
                            <p className={styles['sub-text']}>
                                Enjoy a greener journey—our direct routes are designed for eco-friendly travel.
                            </p>
                            {userLocation && (
                                <div className={styles['location-info']}>
                                    <p>
                                        Your Location: {userLocation.lat}, {userLocation.lon}
                                    </p>
                                    <button onClick={findNearestStop} className={styles['action-button']}>
                                        Find Nearest Stop
                                    </button>
                                </div>
                            )}

                            {nearestStop && (
                                <div className={styles['nearest-stop-info']}>
                                    <div className={styles.despartitor}></div>
                                    <h2 className={styles['sub-heading']}>Selected Stop</h2>
                                    <p>{nearestStop.stop_name}</p>
                                </div>
                            )}

                            {/* Nearest Stop Selection */}
                            <div className={styles['select-container-flex']}>
                                <div className={styles['select-stop-container']}>
                                    <h2>Select Nearest Stop</h2>
                                    <input
                                        type="text"
                                        placeholder={nearestStop ? nearestStop.name : "Select a stop..."}
                                        value={stopSearch}
                                        onChange={(e) => setStopSearch(e.target.value)}
                                        className={styles['search-bar']}
                                    />
                                    <select
                                        value={nearestStop ? nearestStop.stop_id : ""}
                                        onChange={handleStopSelectChange}
                                        className={styles['styled-select']}
                                    >
                                        <option value="">--Select Stop--</option>
                                        {stops
                                            .filter((stop, index, self) =>
                                                self.findIndex(s => s.stop_name === stop.stop_name) === index
                                            )
                                            .filter(stop => stop.stop_name.toLowerCase().includes(stopSearch.toLowerCase()))
                                            .sort((a, b) => a.stop_name.localeCompare(b.stop_name))
                                            .map(stop => (
                                                <option key={stop.stop_id} value={stop.stop_id}>
                                                    {stop.stop_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className={styles['select-stop-container']}>
                                    <h2>Select Destination Stop</h2>
                                    <input
                                        type="text"
                                        placeholder="Search for a stop..."
                                        value={destinationSearch}
                                        onChange={(e) => setDestinationSearch(e.target.value)}
                                        className={styles['search-bar']}
                                    />
                                    <select
                                        value={destinationStop ? destinationStop.stop_id : ""}
                                        onChange={handleDestinationSelectChange}
                                        className={styles['styled-select']}
                                    >
                                        <option value="">--Select Stop--</option>
                                        {stops
                                            .filter((stop, index, self) =>
                                                self.findIndex(s => s.stop_name === stop.stop_name) === index
                                            )
                                            .filter(stop => stop.stop_name.toLowerCase().includes(destinationSearch.toLowerCase()))
                                            .sort((a, b) => a.stop_name.localeCompare(b.stop_name))
                                            .map(stop => (
                                                <option key={stop.stop_id} value={stop.stop_id}>
                                                    {stop.stop_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.combinatie}>
                                <button onClick={getUserLocation} className={styles['action-buttonone']}>
                                    Get My Location
                                </button>
                                <button onClick={getRoute} className={styles['action-button']}>
                                    Get Direct Route
                                </button>
                            </div>
                            {route && (
                                <div className={styles['route-container']}>
                                    <h2 className={styles['section-heading']}>Direct Route Information</h2>

                                    <div className={styles['route-info-container']}>
                                        <p className={styles['route-info']}>Route Number: {route.route.short_name}</p>
                                        <p className={styles['route-info']}>Distance: {(route.distance / 1000).toFixed(2)} km</p>
                                        <p className={styles['route-info']}>Duration: {route.duration}</p>
                                        <p className={styles['route-info']}>Cost: 0.80$</p>
                                    </div>

                                    <div className={styles['route-buttons']}>
                                        <button onClick={() => handleSaveRoute(route)}>Save Route</button>
                                        <button
                                            onClick={async () => {
                                                const near = await isUserNearOrigin();
                                                if (!near) {
                                                    alert("You must be near the route origin to use this route.");
                                                } else {
                                                    handleUseRoute(route);
                                                }
                                            }}
                                            className={styles.button}
                                        >
                                            Use Route
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles['map']}>
                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                            />
                            {viewOption === 'direct' && userLocation && (
                                <Marker position={[userLocation.lat, userLocation.lon]} icon={createMarkerIcon('green')}>
                                    <Popup>Your Location</Popup>
                                </Marker>
                            )}

                            {viewOption === 'direct' && nearestStop && (
                                <Marker position={[nearestStop.stop_lat, nearestStop.stop_lon]} icon={createMarkerIcon('red')}>
                                    <Popup>{nearestStop.stop_name}</Popup>
                                </Marker>
                            )}

                            {/* Fix destinationStop handling */}
                            {viewOption === 'direct' && destinationStop && (
                                <Marker
                                    position={[destinationStop.stop_lat, destinationStop.stop_lon]}
                                    icon={createMarkerIcon('red')}
                                >
                                    <Popup>{destinationStop.stop_name}</Popup>
                                </Marker>
                            )}

                            {viewOption === 'direct' && linia && (
                                <Polyline positions={linia} color="blue" />
                            )}

                            {viewOption === 'direct' && userLocation && <CenterMap location={[userLocation.lat, userLocation.lon]} />}

                            {viewOption === 'routes' && <MapCenterUpdater mapCenter={mapCenter} />}

                            {viewOption === 'routes' &&
                                polylineData.map((data, index) => (
                                    <Polyline key={data.shapeId} positions={data.polyline} color={getColor(index)} weight={4} />
                                ))}

                            {markersToRender.map((stop) => (
                                <Marker
                                    key={stop.stop_id + '-' + stop.stop_name}
                                    position={[stop.stop_lat, stop.stop_lon]}
                                    icon={createMarkerIcon(stop.color)}
                                >
                                    <Tooltip direction="top" offset={[0, -10]} permanent>
                                        {stop.stop_name}
                                    </Tooltip>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
                <Footer />
            </div>
        );
    };
    export default MapComponent;
