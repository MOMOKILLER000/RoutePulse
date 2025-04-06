


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


firebase.initializeApp(firebaseConfig);


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
