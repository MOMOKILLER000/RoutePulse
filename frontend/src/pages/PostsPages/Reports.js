import React, { useEffect, useState } from 'react';
import image from '../../assets/images.png';
import styles from '../../styles/PostsPages/reports.module.css';
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useNavigate } from "react-router-dom";

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const reportsPerPage = 9;
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:8000/api/reports/")
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

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleReportClick = (id) => {
        if (id) {
            navigate(`/report/${id}`);
        } else {
            console.error("Report ID is missing");
        }
    };


    const indexOfLastReport = currentPage * reportsPerPage;
    const indexOfFirstReport = indexOfLastReport - reportsPerPage;
    const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport);
    const totalPages = Math.ceil(reports.length / reportsPerPage);

    return (
        <div>
        <div className={styles.firstContainer}>
            <Navbar />
            <div className={styles.mainContainer}>
                <div className={styles.bodyContainer}>
                    {currentReports.map((report, index) => (
                        <div key={report.id} className={styles.report}>
                            <img
                                className={styles.reportImage}
                                src='/icon.jpg'
                                alt={`Report ${index + 1}`}
                                loading="lazy"
                            />
                            <div className={styles.reportText}>
                                <h2 className={styles.reportTitle}>{report.city} - {report.street}</h2>
                                <p className={styles.reportContent}>{formatDate(report.date)} {report.time}</p>
                                <button onClick={() => handleReportClick(report.id)} className={styles.readReportButton}>Read Report</button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
            <div className={styles.paginationContainer}>
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                >
                    ⬅ Prev
                </button>
                <span className={styles.pageNumber}>Page {currentPage} of {totalPages}</span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                >
                    Next ➡
                </button>
            </div>
        </div>
            <Footer />
        </div>
    );
}

export default Reports;