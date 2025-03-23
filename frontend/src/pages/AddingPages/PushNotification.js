// src/components/PushNotificationComponent.js
import React, { useState, useEffect } from 'react';
import { messaging, getMessagingToken } from '../../firebase';

const PushNotificationComponent = () => {
    // Token and permission states
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // States for broadcasting a message
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState('');

    // On mount, if notifications are allowed, fetch the FCM token.
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
                fetchToken();
            } else {
                console.log('Permission denied');
                setError('Permission denied');
            }
        } catch (err) {
            console.error('Permission request failed', err);
            setError('Error requesting permission');
        } finally {
            setLoading(false);
        }
    };

    const fetchToken = async () => {
        try {
            // Wait for the service worker to be ready
            const swRegistration = await navigator.serviceWorker.ready;
            // Use the getMessagingToken function with the serviceWorkerRegistration option
            const currentToken = await getMessagingToken(messaging, {
                vapidKey: 'BM3006r6JiFC4ey0qrIBno0iubQHEeUmmRzW4P2udg7rC93PY_lDVT2UqSBqf5SZHJkmMtoI6DALZdd1utUjsSE', // Replace with your public VAPID key
                serviceWorkerRegistration: swRegistration,
            });
        } catch (err) {
            console.error('Error retrieving token', err);
            setError('Error retrieving FCM token');
        }
    };

    // Function to broadcast a push notification to all users
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
            console.error('Error broadcasting message:', err);
            setBroadcastStatus('Error sending broadcast.');
        }
    };

    return (
        <div>
            <h1>Push Notifications</h1>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {isPermissionGranted ? (
                <p>Notifications are enabled. Token: {token}</p>
            ) : (
                <div>
                    <p>You need to enable push notifications to receive updates.</p>
                    <button onClick={requestPermission} disabled={loading}>
                        {loading ? 'Requesting Permission...' : 'Enable Notifications'}
                    </button>
                </div>
            )}
            <hr />
            <h2>Broadcast Notification</h2>
            <form onSubmit={handleBroadcast}>
                <div>
                    <label>
                        Title:
                        <input
                            type="text"
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            required
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Body:
                        <input
                            type="text"
                            value={broadcastBody}
                            onChange={(e) => setBroadcastBody(e.target.value)}
                            required
                        />
                    </label>
                </div>
                <button type="submit">Send Broadcast</button>
            </form>
            {broadcastStatus && <p>{broadcastStatus}</p>}
        </div>
    );
};

export default PushNotificationComponent;
