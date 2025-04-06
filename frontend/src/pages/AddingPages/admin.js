import React, { useState, useEffect } from 'react';
import { messaging, getMessagingToken } from '../../firebase';
import styles from "../../styles/Adding/admin.module.css";
import { useNavigate } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const PushNotificationComponent = () => {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState('');
    const [feedbacks, setFeedbacks] = useState([]);
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);

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

    useEffect(() => {
        fetch("http://localhost:8000/api/feedback/")
            .then((response) => response.json())
            .then((data) => setFeedbacks(data))
            .catch((error) => console.log(error));
    }, []);

    const handleFeedback = (id) => {
        navigate(`/feedback/${id}`);
    };

    const handleReports = (id) => {
        navigate(`/report/${id}`);
    }
    const handleBroadcast = async (e) => {
        e.preventDefault();
        setBroadcastStatus('');

        try {
            const currentToken = token || await getMessagingToken(messaging, {
                vapidKey: 'BM3006r6JiFC4ey0qrIBno0iubQHEeUmmRzW4P2udg7rC93PY_lDVT2UqSBqf5SZHJkmMtoI6DALZdd1utUjsSE',
            });

            if (!currentToken) {
                setBroadcastStatus('Error: No valid token found.');
                return;
            }

            console.log('Sending broadcast with token:', currentToken);

            const response = await fetch('http://localhost:8000/api/broadcast-notification/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: broadcastTitle,
                    body: broadcastBody,
                    token: currentToken,
                }),
            });

            if (response.ok) {
                setBroadcastStatus('Broadcast sent successfully.');
            } else {
                const errorResponse = await response.json();
                console.error('Error response:', errorResponse);
                setBroadcastStatus(`Error: ${errorResponse.message || 'Failed to send notification'}`);
            }
        } catch (err) {
            console.error('Broadcast Error:', err);
            setBroadcastStatus('Error sending broadcast.');
        }
    };

    const handleEditPublicRoutes = () => {
        navigate('/edit-data');
    };


    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };


    const handleDeleteReport = async (id) => {
        if (!window.confirm("Are you sure you want to delete this report?")) return;
        try {
            const response = await fetch(`http://localhost:8000/api/delete_report/${id}/`, {
                method: 'DELETE',
            });
            if (response.ok) {
                // Remove deleted report from state
                setReports(prevReports => prevReports.filter(report => report.id !== id));
            } else {
                const errorResponse = await response.json();
                console.error('Error response:', errorResponse);
                alert(`Error: ${errorResponse.message || 'Failed to delete report'}`);
            }
        } catch (err) {
            console.error('Delete Report Error:', err);
            alert('Error deleting report.');
        }
    };

    return (
        <div>
            <div className={styles['navbarAdjust']}>
                <Navbar />
            </div>
            <div className={styles.container}>
                <div className={styles.leftSection}>
                    <div className={styles.broadcastForm}>
                        <h2>Broadcast Notification</h2>
                        <form onSubmit={handleBroadcast}>
                            <div>
                                <label>Title:</label>
                                <input
                                    type="text"
                                    placeholder="Enter title..."
                                    value={broadcastTitle}
                                    onChange={(e) => setBroadcastTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label>Body:</label>
                                <input
                                    type="text"
                                    placeholder="Enter message..."
                                    value={broadcastBody}
                                    onChange={(e) => setBroadcastBody(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className={styles.button}>Send Broadcast</button>
                        </form>
                        {broadcastStatus && <p className={styles.success}>{broadcastStatus}</p>}
                    </div>

                    <div className={styles.publicRoutesSection}>
                        <h2>Public Routes Data</h2>
                        <p>Edit public routes data for your application.</p>
                        <button onClick={handleEditPublicRoutes} className={styles.button}>
                            Edit Public Routes Data
                        </button>
                    </div>
                </div>

                <div className={styles.rightSection}>
                    <div className={styles.feedbackSection}>
                        <h2 className={styles.Contacts}>Contacts</h2>
                        {feedbacks.length === 0 ? (
                            <p>No feedback available.</p>
                        ) : (
                            <ul className={styles.feedbackList}>
                                {feedbacks.map((feedback) => (
                                    <li
                                        key={feedback.id}
                                        className={styles.feedbackItem}
                                        onClick={() => handleFeedback(feedback.id)}
                                    >
                                        <p><strong>{feedback.name}</strong> ({feedback.email})</p>
                                        <p className={styles.date}>{formatDate(feedback.date)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className={styles.reportsContainer}>
                    <h2>Reports</h2>
                    {reports.length === 0 ? (
                        <p>No Reports available.</p>
                    ) : (
                        <div className={styles.reportsList}>
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className={styles.reportItem}
                                    onClick={() => handleReports(report.id)}
                                >
                                    <p className={styles.location}><strong>City: {report.city}</strong></p>
                                    <p className={styles.location}><strong>Street: {report.street}</strong></p>
                                    <p className={styles.date}>Date: {formatDate(report.date)}</p>
                                    <p className={styles.date}>Time: {report.time}</p>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteReport(report.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Reports section displayed horizontally under the main container */}
            <Footer />
        </div>
    );
};

export default PushNotificationComponent;
