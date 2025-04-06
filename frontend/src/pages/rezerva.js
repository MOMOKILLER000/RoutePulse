import React, { useState, useEffect } from 'react';
import { messaging, getMessagingToken } from '../../firebase';
import styles from "../../styles/Adding/admin.module.css";
import {useNavigate} from 'react-router-dom';
const PushNotificationComponent = () => {
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState('');
    const [feedbacks, setFeedbacks] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        fetch("http://localhost:8000/api/feedback/")
            .then((response) => response.json()) // Return the parsed JSON
            .then((data) => {
                setFeedbacks(data);
                console.log(data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);
    useEffect(() => {
        if (Notification.permission === 'granted') {
            setIsPermissionGranted(true);
            fetchToken();
        }
    }, []);

    const requestPermission = async () => {
        setLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setIsPermissionGranted(true);
                await fetchToken();
            } else {
                setError('Permission denied');
            }
        } catch (err) {
            setError('Error requesting permission');
        } finally {
            setLoading(false);
        }
    };

    const fetchToken = async () => {
        try {
            const swRegistration = await navigator.serviceWorker.ready;
            const currentToken = await getMessagingToken(messaging, {
                vapidKey: 'BM3006r6JiFC4ey0qrIBno0iubQHEeUmmRzW4P2udg7rC93PY_lDVT2UqSBqf5SZHJkmMtoI6DALZdd1utUjsSE',
                serviceWorkerRegistration: swRegistration,
            });

            if (currentToken) {
                setToken(currentToken);
                console.log('Firebase Token:', currentToken);
            } else {
                setError('No registration token available.');
            }
        } catch (err) {
            setError('Error retrieving token');
        }
    };

    const handleFeedback = async (id) => {
        navigate(`/feedback/${id}`);
    }
    const handleBroadcast = async (e) => {
        e.preventDefault();
        setBroadcastStatus('');

        try {
            const response = await fetch('http://localhost:8000/api/broadcast-notification/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: broadcastTitle,
                    body: broadcastBody,
                }),
            });

            if (response.ok) {
                setBroadcastStatus('Broadcast sent successfully.');
            } else {
                setBroadcastStatus('Error sending broadcast.');
            }
        } catch (err) {
            setBroadcastStatus('Error sending broadcast.');
        }
    };

    return (
        <div className={styles.container}>
            {}
            <div className={styles.leftSection}>
                {}
                <div className={styles.notificationSection}>
                    <h1>Push Notifications</h1>
                    {loading && <p>Loading...</p>}
                    {error && <p className={styles.error}>{error}</p>}
                    {isPermissionGranted ? (
                        <p>Notifications are enabled.</p>
                    ) : (
                        <div>
                            <p>You need to enable push notifications to receive updates.</p>
                            <button onClick={requestPermission} disabled={loading} className={styles.button}>
                                {loading ? 'Requesting Permission...' : 'Enable Notifications'}
                            </button>
                        </div>
                    )}
                </div>

                {}
                <div className={styles.broadcastForm}>
                    <h2>Broadcast Notification</h2>
                    <form onSubmit={handleBroadcast}>
                        <div>
                            <label>Title:</label>
                            <input type="text" placeholder="Enter title..." value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} required />
                        </div>
                        <div>
                            <label>Body:</label>
                            <input type="text" placeholder="Enter message..." value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} required />
                        </div>
                        <button type="submit" className={styles.button}>Send Broadcast</button>
                    </form>
                    {broadcastStatus && <p className={styles.success}>{broadcastStatus}</p>}
                </div>
            </div>

            {}
            <div className={styles.rightSection}>
                <h1>Feedbacks</h1>
                {feedbacks.length === 0 ? (
                    <p>No feedback available.</p>
                ) : (
                    <ul className={styles.feedbackList}>
                        {feedbacks.map((feedback) => (
                            <li key={feedback.id} className={styles.feedbackItem} onClick={()=> handleFeedback(feedback.id)}>
                                <p><strong>{feedback.name}</strong> ({feedback.email})</p>
                                <p className={styles.date}>{new Date(feedback.date).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default PushNotificationComponent;
