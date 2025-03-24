// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken as getMessagingToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Get Messaging instance
const messaging = getMessaging(app);

// Set up a foreground message handler.
// When a message is received while the app is open, this will display a notification.
onMessage(messaging, (payload) => {
    console.log('Message received in foreground: ', payload);
    if (Notification.permission === 'granted' && payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title, { body });
    }
});

export { messaging, getMessagingToken };
