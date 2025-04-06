

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken as getMessagingToken, onMessage } from 'firebase/messaging';


const firebaseConfig = {
    apiKey: "AIzaSyCIeM7Ogd1Tzdi_C85m7vu1nD8F1dJ7_jU",
    authDomain: "routepulse-ad0d0.firebaseapp.com",
    projectId: "routepulse-ad0d0",
    storageBucket: "routepulse-ad0d0.firebasestorage.app",
    messagingSenderId: "728330907004",
    appId: "1:728330907004:web:3e5a4030132371264e88f9",
    measurementId: "G-E51DEGP3R1"
};


const app = initializeApp(firebaseConfig);


const messaging = getMessaging(app);



onMessage(messaging, (payload) => {
    console.log('Message received in foreground: ', payload);
    if (Notification.permission === 'granted' && payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title, { body });
    }
});


export { messaging, getMessagingToken };
