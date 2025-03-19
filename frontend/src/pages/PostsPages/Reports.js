import React, { useEffect } from 'react';
import image from '../../assets/images.png';
import styles from '../../styles/PostsPages/reports.module.css';
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";

const reportsData = [
    {
        title: "Title 1",
        description: "This is a short description for report 1. It gives a brief overview of the content."
    },
    {
        title: "Title 2",
        description: "This is a short description for report 2. It gives a brief overview of the content."
    },
    {
        title: "Title 3",
        description: "This is a short description for report 3. It gives a brief overview of the content."
    },
    {
        title: "Title 4",
        description: "This is a short description for report 4. It gives a brief overview of the content."
    },
    {
        title: "Title 5",
        description: "This is a short description for report 5. It gives a brief overview of the content."
    },
    {
        title: "Title 6",
        description: "This is a short description for report 6. It gives a brief overview of the content."
    }
];

const Reports = () => {
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = image;
        link.as = 'image';
        document.head.appendChild(link);
    }, []);

    return (
        <div className={styles.firstContainer}>
                <Navbar />
            <div className={styles.mainContainer}>
                <div className={styles.bodyContainer}>
                    {reportsData.map((report, index) => (
                        <div key={index} className={styles.report}>
                            <img
                                className={styles.reportImage}
                                src={image}
                                alt={`Report ${index + 1}`}
                                loading="lazy"
                            />
                            <div className={styles.reportText}>
                                <h2 className={styles.reportTitle}>{report.title}</h2>
                                <p className={styles.reportContent}>{report.description}</p>
                                <button className={styles.readReportButton}>Read Report</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default Reports;
