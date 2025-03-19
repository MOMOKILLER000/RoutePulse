import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import Navbar from "../../components/Navbar";
import L from 'leaflet'; // For custom marker icons
import Footer from "../../components/Footer";
import styles from '../../styles/TransportPages/bucharest.module.css';

const Bucharest = () => {
  const { transport } = useParams(); // Get transport from URL param
  const [selectedRoute, setSelectedRoute] = useState('');
  const [geojsonData, setGeojsonData] = useState(null);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [statiiData, setStatiiData] = useState([]);
  useEffect(() => {
    if (!transport) return;

    const fileName = transport === 'tram' ? '/Tramvai.geojson' : '/Rute_Bucuresti.geojson';
    console.log('Fetching GeoJSON:', fileName); // Debugging log
    fetch(fileName)
        .then((response) => response.json())
        .then((data) => {
          console.log('GeoJSON data loaded:', data); // Debugging log
          setGeojsonData(data);
        })
        .catch((error) => console.error('Error loading GeoJSON data:', error));
    fetch('/Statii.geojson')
        .then(response => response.json())
        .then(data => {
          console.log('Stations data loaded:', data); // Debugging log
          setStatiiData(data);
        })
        .catch(error => console.error('Error loading stations data:', error));
  }, [transport]);
  useEffect(() => {
    if (geojsonData && geojsonData.features) {
      const routesSet = new Set();
      geojsonData.features.forEach((feature) => {
        const routeName = transport === 'tram' ? feature.properties['Nume rută'] : feature.properties.route_name;
        routesSet.add(routeName);
      });
      setAvailableRoutes(Array.from(routesSet));
    } else {
      setAvailableRoutes([]);
    }
  }, [geojsonData, transport]);
  const handleRouteChange = (e) => {
    setSelectedRoute(e.target.value);
    console.log('Selected Route:', e.target.value); // Debugging log
  };
  const renderPolylines = (data) => {
    const polylines = [];
    if (data && data.features && selectedRoute) {
      const filteredFeatures = data.features.filter((feature) => {
        const routeName = transport === 'tram' ? feature.properties['Nume rută'] : feature.properties.route_name;
        return routeName === selectedRoute;
      });

      filteredFeatures.forEach((feature, featureIndex) => {
        if (feature.geometry.type === 'LineString') {
          const coordinates = feature.geometry.coordinates.map(
              (coord) => [coord[1], coord[0]]
          );
          polylines.push(
              <Polyline
                  key={`polyline-${featureIndex}`}
                  positions={coordinates}
                  color={transport === 'tram' ? 'blue' : 'red'}
                  weight={4}
              />
          );
        } else if (feature.geometry.type === 'MultiLineString') {
          feature.geometry.coordinates.forEach((lineCoords, idx) => {
            const coordinates = lineCoords.map(
                (coord) => [coord[1], coord[0]]
            );
            polylines.push(
                <Polyline
                    key={`polyline-${featureIndex}-${idx}`}
                    positions={coordinates}
                    color={transport === 'tram' ? 'blue' : 'red'}
                    weight={4}
                />
            );
          });
        }
      });
    }
    return polylines;
  };
  const renderMarkers = (statiiData) => {
    const markers = [];
    if (statiiData && statiiData.features) {
      statiiData.features.forEach((feature) => {
        const routeName = transport === 'tram' ? feature.properties['Linia/sens'] : feature.properties['Linia/sens'];
        if (routeName === selectedRoute) {
          const { coordinates } = feature.geometry;
          const stationName = feature.properties.Statie;
          const defaultIcon = new L.Icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', // Default marker icon
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          markers.push(
              <Marker
                  key={feature.properties.CodStatie}
                  position={[coordinates[1], coordinates[0]]}
                  icon={defaultIcon}
              >
                <Popup>{stationName}</Popup>
              </Marker>
          );
        }
      });
    }
    return markers;
  };

  return (
      <div>
        <Navbar />
        <div className={styles.container}>
          <h2>{transport === 'tram' ? 'Tram Routes' : 'Bus Routes'}</h2>

          {availableRoutes.length > 0 && (
              <>
                <label htmlFor="routeSelect" className={styles.label}>
                  Select route:
                </label>
                <select id="routeSelect" value={selectedRoute} onChange={handleRouteChange} className={styles.select}>
                  <option value="">Select a route</option>
                  {availableRoutes.map((route, index) => (
                      <option key={index} value={route}>
                        Route {route}
                      </option>
                  ))}
                </select>
              </>
          )}
        </div>

        {geojsonData && statiiData && (
            <MapContainer center={[44.4268, 26.1025]} zoom={12} className={styles.mapContainer}>
              <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {selectedRoute && renderPolylines(geojsonData)}
              {selectedRoute && renderMarkers(statiiData)}
            </MapContainer>
        )}
        <Footer />
      </div>
  );
};

export default Bucharest;
