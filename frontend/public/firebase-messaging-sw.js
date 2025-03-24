// public/firebase-messaging-sw.js

// Import the compat versions of Firebase libraries via importScripts
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
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
