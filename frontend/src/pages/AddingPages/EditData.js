import React, { useState } from 'react';
import styles from "../../styles/Adding/editdata.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
const EditAgencyData = () => {
    const [agencyId, setAgencyId] = useState('');


    const [routes, setRoutes] = useState([]);
    const [trips, setTrips] = useState([]);
    const [stops, setStops] = useState([]);


    const [selectedRoute, setSelectedRoute] = useState(null);
    const [routeForm, setRouteForm] = useState({
        route_id: '',
        agency_id: '',
        route_short_name: '',
        route_long_name: '',
        route_type: ''
    });


    const [selectedTrip, setSelectedTrip] = useState(null);
    const [tripForm, setTripForm] = useState({
        trip_id: '',
        route: '',
        agency_id: '',
        trip_headsign: '',
        shape_id: ''
    });


    const [shape, setShape] = useState(null);
    const [shapeForm, setShapeForm] = useState({
        shape_id: '',
        polyline: ''
    });


    const [selectedStop, setSelectedStop] = useState(null);
    const [stopForm, setStopForm] = useState({
        stop_id: '',
        agency_id: '',
        stop_name: '',
        stop_lat: '',
        stop_lon: ''
    });

    const [stopSearch, setStopSearch] = useState("");
    const [showFullPolyline, setShowFullPolyline] = useState(false);


    const togglePolyline = () => {
        setShowFullPolyline(!showFullPolyline);
    };

    const fetchRoutes = async (agency) => {
        try {
            const response = await fetch(`http://localhost:8000/api/routes/?agency_id=${agency}`);
            const data = await response.json();
            setRoutes(data);
        } catch (error) {
            console.error('Error fetching routes:', error);
        }
    };

    const fetchTrips = async (routeId, agency) => {
        try {
            const response = await fetch(`http://localhost:8000/api/routes/${routeId}/trips/?agency_id=${agency}`);
            const data = await response.json();
            setTrips(data);
        } catch (error) {
            console.error('Error fetching trips:', error);
        }
    };


    const fetchShape = async (shapeId, agency) => {
        try {
            const response = await fetch(`http://localhost:8000/api/shapes/${shapeId}/?agency_id=${agency}`);
            const data = await response.json();
            setShape(data);
            setShapeForm({
                shape_id: data.shape_id,
                polyline: data.polyline || ''
            });
        } catch (error) {
            console.error('Error fetching shape:', error);
        }
    };


    const fetchStops = async (agency) => {
        try {
            const response = await fetch(`http://localhost:8000/api/stops/?agency_id=${agency}`);
            const data = await response.json();
            setStops(data);
        } catch (error) {
            console.error('Error fetching stops:', error);
        }
    };

    const handleStopSelectChange = (e) => {
        const selectedStopId = e.target.value;
        const selected = stops.find(stop => stop.stop_id === selectedStopId);
        setSelectedStop(selected);
        setStopForm({ ...selected });
    };






    const updateRoute = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(
                `http://localhost:8000/api/routes/${routeForm.route_id}/?agency_id=${agencyId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(routeForm)
                }
            );
            if (response.ok) {
                alert("Route updated successfully!");
                fetchRoutes(agencyId);
            } else {
                alert("Failed to update route.");
            }
        } catch (error) {
            console.error('Error updating route:', error);
        }
    };

    const updateTrip = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(
                `http://localhost:8000/api/trips/detail/${tripForm.trip_id}/?agency_id=${agencyId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tripForm)
                }
            );
            if (response.ok) {
                alert("Trip updated successfully!");
                fetchTrips(selectedRoute.route_id, agencyId);
            } else {
                alert("Failed to update trip.");
            }
        } catch (error) {
            console.error('Error updating trip:', error);
        }
    };

    const updateShape = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(
                `http://localhost:8000/api/shapes/detail/${shapeForm.shape_id}/?agency_id=${agencyId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shapeForm)
                }
            );
            if (response.ok) {
                alert("Shape updated successfully!");
                fetchShape(shapeForm.shape_id, agencyId);
            } else {
                alert("Failed to update shape.");
            }
        } catch (error) {
            console.error('Error updating shape:', error);
        }
    };

    const updateStop = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(
                `http://localhost:8000/api/stops/${selectedStop.stop_id}/?agency_id=${agencyId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stopForm),
                }
            );
            if (response.ok) {
                alert('Stop updated successfully!');
                fetchStops(agencyId);
                setSelectedStop(null);
                setStopForm({
                    stop_id: '',
                    agency_id: '',
                    stop_name: '',
                    stop_lat: '',
                    stop_lon: ''
                });
            } else {
                alert('Failed to update stop.');
            }
        } catch (error) {
            console.error('Error updating stop:', error);
        }
    };




    const deleteRoute = async (e) => {
        e.preventDefault();
        if (window.confirm("Are you sure you want to delete this route?")) {
            try {
                const response = await fetch(
                    `http://localhost:8000/api/routes/${routeForm.route_id}/?agency_id=${agencyId}`,
                    { method: 'DELETE' }
                );
                if (response.ok) {
                    alert("Route deleted successfully!");
                    setSelectedRoute(null);
                    setRouteForm({
                        route_id: '',
                        agency_id: '',
                        route_short_name: '',
                        route_long_name: '',
                        route_type: ''
                    });
                    fetchRoutes(agencyId);
                } else {
                    alert("Failed to delete route.");
                }
            } catch (error) {
                console.error('Error deleting route:', error);
            }
        }
    };

    const deleteTrip = async (e) => {
        e.preventDefault();
        if (window.confirm("Are you sure you want to delete this trip?")) {
            try {
                const response = await fetch(
                    `http://localhost:8000/api/trips/detail/${tripForm.trip_id}/?agency_id=${agencyId}`,
                    { method: 'DELETE' }
                );
                if (response.ok) {
                    alert("Trip deleted successfully!");
                    setSelectedTrip(null);
                    setTripForm({
                        trip_id: '',
                        route: '',
                        agency_id: '',
                        trip_headsign: '',
                        shape_id: ''
                    });
                    fetchTrips(selectedRoute.route_id, agencyId);
                } else {
                    alert("Failed to delete trip.");
                }
            } catch (error) {
                console.error('Error deleting trip:', error);
            }
        }
    };

    const deleteShape = async (e) => {
        e.preventDefault();
        if (window.confirm("Are you sure you want to delete this shape?")) {
            try {
                const response = await fetch(
                    `http://localhost:8000/api/shapes/detail/${shapeForm.shape_id}/?agency_id=${agencyId}`,
                    { method: 'DELETE' }
                );
                if (response.ok) {
                    alert("Shape deleted successfully!");
                    setShape(null);
                    setShapeForm({
                        shape_id: '',
                        polyline: ''
                    });
                } else {
                    alert("Failed to delete shape.");
                }
            } catch (error) {
                console.error('Error deleting shape:', error);
            }
        }
    };

    const deleteStop = async (stop) => {
        if (window.confirm('Are you sure you want to delete this stop?')) {
            try {
                const response = await fetch(
                    `http://localhost:8000/api/stops/${stop.stop_id}/?agency_id=${agencyId}`,
                    { method: 'DELETE' }
                );
                if (response.ok) {
                    alert('Stop deleted successfully!');
                    fetchStops(agencyId);
                } else {
                    alert('Failed to delete stop.');
                }
            } catch (error) {
                console.error('Error deleting stop:', error);
            }
        }
    };






    const handleAgencySubmit = (e) => {
        e.preventDefault();
        if (agencyId.trim()) {

            setRoutes([]);
            setTrips([]);
            setStops([]);
            setSelectedRoute(null);
            setSelectedTrip(null);
            setShape(null);
            setSelectedStop(null);
            fetchRoutes(agencyId);
            fetchStops(agencyId);
        }
    };


    const handleRouteChange = (e) => {
        const routeId = e.target.value;
        const route = routes.find(r => r.route_id.toString() === routeId);
        setSelectedRoute(route);
        setRouteForm({ ...route });
        setTrips([]);
        setSelectedTrip(null);
        setShape(null);
        if (route) {
            fetchTrips(routeId, agencyId);
        }
    };


    const handleTripChange = (e) => {
        const tripId = e.target.value;
        const trip = trips.find(t => t.trip_id.toString() === tripId);
        setSelectedTrip(trip);
        setTripForm({ ...trip });
        setShape(null);
        if (trip && trip.shape_id) {
            fetchShape(trip.shape_id, agencyId);
        }
    };





    return (
        <div>
        <div className={styles['navbarAdjust']}>
            <Navbar />
        </div>
        <div className={styles.container}>
            <h1>Edit Agency Data</h1>

            {}
            <form onSubmit={handleAgencySubmit}>
                <label>
                    Select City:&nbsp;
                    <select
                        value={agencyId}
                        onChange={(e) => setAgencyId(e.target.value)}
                        required
                    >
                        <option value="">-- Choose a City --</option>
                        <option value="1">Iași</option>
                        <option value="2">Cluj</option>
                        <option value="6">Botoșani</option>
                        <option value="8">Timișoara</option> {/* different ID than Botoșani */}
                    </select>
                </label>
                <button type="submit">Fetch Data</button>
            </form>

            {}
            <div className={styles.sectionsContainer}>
                {}
                <div className={styles.sectionCard}>
                    {routes.length > 0 && (
                        <>
                            <h2>Select a Route</h2>
                            <select onChange={handleRouteChange} defaultValue="">
                                <option value="" disabled>
                                    Select Route
                                </option>
                                {routes.map((route) => (
                                    <option key={route.route_id} value={route.route_id}>
                                        {route.route_short_name} - {route.route_long_name}
                                    </option>
                                ))}
                            </select>

                            {selectedRoute && (
                                <>
                                    <h3>Edit Route Details</h3>
                                    <form onSubmit={updateRoute}>
                                        <div>
                                            <label>
                                                Short Name:&nbsp;
                                                <input
                                                    type="text"
                                                    value={routeForm.route_short_name}
                                                    onChange={(e) =>
                                                        setRouteForm({
                                                            ...routeForm,
                                                            route_short_name: e.target.value,
                                                        })
                                                    }
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div>
                                            <label>
                                                Long Name:&nbsp;
                                                <input
                                                    type="text"
                                                    value={routeForm.route_long_name}
                                                    onChange={(e) =>
                                                        setRouteForm({
                                                            ...routeForm,
                                                            route_long_name: e.target.value,
                                                        })
                                                    }
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div>
                                            <label>
                                                Route Type:&nbsp;
                                                <input
                                                    type="number"
                                                    value={routeForm.route_type}
                                                    onChange={(e) =>
                                                        setRouteForm({
                                                            ...routeForm,
                                                            route_type: e.target.value,
                                                        })
                                                    }
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <button type="submit">Update Route</button>
                                        <button className={styles.delete} onClick={deleteRoute}>
                                            Delete Route
                                        </button>
                                    </form>
                                </>
                            )}
                        </>
                    )}
                </div>

                {}
                <div className={styles.sectionCard}>
                    {trips.length > 0 && (
                        <>
                            <h2>Select a Trip</h2>
                            <select onChange={handleTripChange} defaultValue="">
                                <option value="" disabled>
                                    Select Trip
                                </option>
                                {trips.map((trip) => (
                                    <option key={trip.trip_id} value={trip.trip_id}>
                                        {trip.trip_id}{" "}
                                        {trip.trip_headsign ? `- ${trip.trip_headsign}` : ""}
                                    </option>
                                ))}
                            </select>

                            {selectedTrip && (
                                <>
                                    <h3>Edit Trip Details</h3>
                                    <form onSubmit={updateTrip}>
                                        <div>
                                            <label>
                                                Trip Headsign:&nbsp;
                                                <input
                                                    type="text"
                                                    value={tripForm.trip_headsign || ""}
                                                    onChange={(e) =>
                                                        setTripForm({
                                                            ...tripForm,
                                                            trip_headsign: e.target.value,
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                        <button type="submit">Update Trip</button>
                                        <button className={styles.delete} onClick={deleteTrip}>
                                            Delete Trip
                                        </button>
                                    </form>
                                </>
                            )}
                        </>
                    )}
                </div>

                {}
                <div className={`${styles.sectionCard} ${styles.shapeCard}`}>
                    {shape && (
                        <>
                            <h2>Shape Details</h2>
                            <div>
                                <strong>Shape ID:</strong> {shape.shape_id}
                            </div>
                            <div className={styles.polylineGroup}>
                                <div>
                                    <strong>Polyline:</strong>
                                </div>
                                <div>
                  <pre>
                    {showFullPolyline
                        ? shape.polyline
                        : shape.polyline.slice(0, 20) + "..."}
                  </pre>
                                </div>
                                <div>
                                    <button
                                        className={styles.showMoreButton}
                                        onClick={togglePolyline}
                                    >
                                        {showFullPolyline ? "Show Less" : "See More"}
                                    </button>
                                </div>
                            </div>
                            <h3>Edit Shape</h3>
                            <form onSubmit={updateShape}>
                                <div>
                                    <label>
                                        Polyline (JSON):&nbsp;
                                        <textarea
                                            rows="7"
                                            className={styles.polylineTextarea}
                                            value={shapeForm.polyline}
                                            onChange={(e) =>
                                                setShapeForm({
                                                    ...shapeForm,
                                                    polyline: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </label>
                                </div>
                                <button type="submit">Update Shape</button>
                                <button className={styles.delete} onClick={deleteShape}>
                                    Delete Shape
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {}
                <div className={styles.sectionCard}>
                    <h2>Stops</h2>
                    <input
                        type="text"
                        placeholder="Search for a stop..."
                        value={stopSearch}
                        onChange={(e) => setStopSearch(e.target.value)}
                        className={styles.searchBar}
                    />
                    <select
                        value={selectedStop ? selectedStop.stop_id : ""}
                        onChange={handleStopSelectChange}
                        className={styles.styledSelect}
                    >
                        <option value="">--Select Stop--</option>
                        {stops
                            .filter(
                                (stop, index, self) =>
                                    self.findIndex((s) => s.stop_name === stop.stop_name) === index
                            )
                            .filter((stop) =>
                                stop.stop_name.toLowerCase().includes(stopSearch.toLowerCase())
                            )
                            .sort((a, b) => a.stop_name.localeCompare(b.stop_name))
                            .map((stop) => (
                                <option key={stop.stop_id} value={stop.stop_id}>
                                    {stop.stop_name}
                                </option>
                            ))}
                    </select>

                    {selectedStop && (
                        <>
                            <h3>Edit Stop Details</h3>
                            <form onSubmit={updateStop}>
                                <div>
                                    <label>
                                        Stop Name:&nbsp;
                                        <input
                                            type="text"
                                            value={stopForm.stop_name}
                                            onChange={(e) =>
                                                setStopForm({
                                                    ...stopForm,
                                                    stop_name: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={stopForm.stop_lat}
                                            onChange={(e) =>
                                                setStopForm({
                                                    ...stopForm,
                                                    stop_lat : e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={stopForm.stop_lon}
                                            onChange={(e) =>
                                                setStopForm({
                                                    ...stopForm,
                                                    stop_lon : e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </label>
                                </div>
                                <button type="submit">Update Stop</button>
                                <button className={styles.delete} onClick={deleteStop}>
                                    Delete Stop
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
            <Footer />
        </div>
    );
};

export default EditAgencyData;
