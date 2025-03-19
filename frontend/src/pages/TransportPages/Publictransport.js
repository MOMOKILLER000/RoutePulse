import React, { useEffect, useState} from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams } from 'react-router-dom';  // Import useParams from react-router-dom
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
  const [stops, setStops] = useState([]);
  const [mapCenter, setMapCenter] = useState([47.1585, 27.6014]);
  useEffect(() => {
    if (transport === "tram") {
      setVehicleType("0");
    } else if (transport === "bus") {
      setVehicleType("3");
    }
  }, [transport]);
  const getAgencyIdAndCenter = (city) => {
    switch(city.toLowerCase()) {
      case 'iasi':
        return { agencyId: '1', center: [47.1585, 27.6014] };
      case 'cluj':
        return { agencyId: '2', center: [46.7712, 23.6236] };
      case 'timisoara':
        return { agencyId: '8', center: [45.7585, 21.2256] };
      case 'botoșani':
        return { agencyId: '6', center: [47.7468, 26.6628] };
      default:
        return { agencyId: '1', center: [47.1585, 27.6014] };
    }
  };
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
  useEffect(() => {
    const { agencyId } = getAgencyIdAndCenter(city);
    fetch('https://api.tranzy.ai/v1/opendata/stops', {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': 'zbqG3CwEW4dDwJzsMtqXDu6lTglhCnARg9dJWdap',
        'X-Agency-Id': agencyId,
      }
    })
      .then(response => response.json())
      .then(data => setStops(data))
      .catch(error => console.error('Error fetching stops:', error));
  }, [city]);
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
    return markers;
  };

  const markersToRender = aggregateMarkers();

  return (
    <div>
      <Navbar />
      <div className={styles['map-container']}>
        {vehicleType && (
          <div className={styles['select-container']}>
            <select onChange={handleRouteSelect} value={selectedRoute}>
              <option value="">Select Route</option>
              {routes.map(route => (
                <option key={route.route_id} value={route.route_id}>
                  {route.route_short_name} - {route.route_long_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRoute && trips.length > 0 && (
          <div className={styles['select-container']}>
            <select onChange={handleTripSelect} value={selectedTrip}>
              <option value="">Select Trip</option>
              {trips.map(trip => (
                <option key={trip.trip_id} value={trip.trip_id}>
                  {trip.trip_headsign}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles['map']}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            <MapCenterUpdater mapCenter={mapCenter} />

            {polylineData.map((data, index) => (
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
