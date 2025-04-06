import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {useRef} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import styles from "../../styles/PostsPages/Report.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loading from "../../components/Loading";
const Report = () => {
  const [report, setReport] = useState(null);
  const [reportUsers, setReportUsers] = useState([]);
  const {id} = useParams();
  const mapRef = useRef(null);
  useEffect(() => {
    fetch(`http://localhost:8000/api/report/${id}/`)
        .then(response => response.json()).then(data => {
          setReport(data);
          setReportUsers(data.accidents);
      console.log(data)
        }).catch((error)=>{
          console.error("Nu l-o luat boss");
    })
  }, [id])

  useEffect(() => {
    if (!report || !report.latitude || !report.longitude) return; // Ensure coordinates are available

    if (!mapRef.current) {

      mapRef.current = L.map("map").setView([report.latitude, report.longitude], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
    }


    const customIcon = L.icon({
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
      iconSize: [25, 41], // Default size
      iconAnchor: [12, 41], // Position where marker is placed
      popupAnchor: [1, -34],
    });


    L.marker([report.latitude, report.longitude], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(`<b>Accident Location</b><br>${report.city}, ${report.street}`)
        .openPopup();
  }, [report]);

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };


  return (
    <div className={styles["first-container"]}>
      <div className={styles.navbarAdjust}>
        <Navbar />
      </div>
      <div className={styles["body-container"]}>
        <div className={styles["main-container"]}>
          <div className={styles.sidebar}>
            <h3>📝 Accident Reports</h3>
            <div id="user-list" className={styles["user-list"]}>
              {reportUsers.map((user, index) => (
                <div key={index} className={styles["user-info"]}>
                  <p>
                    <strong>🧑 Name:</strong> {user.user}
                  </p>
                  <p>
                    <strong>⏳ Reported At:</strong> {user.time}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.content}>
            {report ? (
            <div className={styles["report-container"]}>
              <h2>🚨 Accident Details</h2>
              <div className={styles["report-card"]}>
                <div className={styles["report-row"]}>
                  <div className={styles["report-item"]}>
                    <strong>🏙️ City:</strong> {report.city}
                  </div>
                  <div className={styles["report-item"]}>
                    <strong>🏠 Street:</strong> {report.street}
                  </div>
                </div>
                <div className={styles["report-row"]}>
                  <div className={styles["report-item"]}>
                    <strong>📅 Date:</strong> {formatDate(report.date)}
                  </div>
                  <div className={styles["report-item"]}>
                    <strong>⏰ Hour:</strong> {report.time}
                  </div>
                </div>
                <div className={styles["report-row"]}>
                  <div className={`${styles["report-item"]} ${styles["full-width"]}`}>
                    <strong>⚠️ Type of Accident:</strong> {report.problem_type.charAt(0).toUpperCase() + report.problem_type.slice(1)}
                  </div>
                </div>
              </div>
            </div>) : (
                <Loading />
                )}
            <div className={styles["map-container"]}>
              <div id="map" className={styles.map}></div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Report;
