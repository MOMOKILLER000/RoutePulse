// public/firebase-messaging-sw.js

// Import the compat versions of Firebase libraries via importScripts
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCIeM7Ogd1Tzdi_C85m7vu1nD8F1dJ7_jU",
    authDomain: "routepulse-ad0d0.firebaseapp.com",
    projectId: "routepulse-ad0d0",
    storageBucket: "routepulse-ad0d0.firebasestorage.app",
    messagingSenderId: "728330907004",
    appId: "1:728330907004:web:3e5a4030132371264e88f9",
    measurementId: "G-E51DEGP3R1"
};

// Initialize the Firebase app in the service worker using the compat libraries
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance to handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    console.log('Received background message: ', payload);
    const title = payload.notification.title;
    const options = {
        body: payload.notification.body,
        icon: '/firebase-logo.png', // Ensure this icon exists in your public folder
    };
    self.registration.showNotification(title, options);
});
