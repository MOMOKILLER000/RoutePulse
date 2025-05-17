import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <GoogleOAuthProvider clientId={clientID}>
        <Router> {/* ✅ Wrap your app with Router */}
            <React.StrictMode>
                <App />
            </React.StrictMode>
        </Router>
    </GoogleOAuthProvider>
);

reportWebVitals();
