import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Authentification/registration.module.css';
import { useNavigate } from 'react-router-dom';
import {getMessagingToken, messaging} from "../../firebase";

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const SignUp = () => {
  const [showTransport, setShowTransport] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState('');
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState(false);

  const navigate = useNavigate();
  const csrfFetched = useRef(false);
  useEffect(() => {
    if (csrfFetched.current) return;
    csrfFetched.current = true;

    fetch('http://localhost:8000/api/csrf-token/', {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => {
        if (response.ok) return response.json();
        throw new Error('Failed to fetch CSRF token');
      })
      .then((data) => {
      })
      .catch((error) => console.error('Error fetching CSRF token:', error));
  }, []);

  const toggleTransportDropdown = () => {
    setShowTransport(!showTransport);
  };

  const selectTransportOption = (transport) => {
    setSelectedTransport(transport);
    setShowTransport(false);
  };

  const togglePasswordVisibility = (passwordId) => {
    if (passwordId === 'password1') {
      setShowPassword1(!showPassword1);
    } else {
      setShowPassword2(!showPassword2);
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
        console.log('Firebase Token:', currentToken);
        return currentToken;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
        return null;
      }
    } catch (err) {
      console.error('Error retrieving token', err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      alert('CSRF token is missing!');
      return;
    }
    const firebaseToken = await fetchToken();
    const userData = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      username,
      preferred_transport: selectedTransport,
      notifications,
      firebase_token: firebaseToken,
    };

    try {
      const response = await fetch('http://localhost:8000/api/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (response.ok) {
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + 6);
        localStorage.setItem('auth-token', 'true');
        localStorage.setItem('token-expiration', expirationTime.toString());
        setTimeout(() => {
          window.location.href = '/'; // Redirect to home page
        }, 0);
      } else {
        const errorData = await response.json();
        alert('Error: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error during sign-up:', error);
      alert('There was an error during sign-up');
    }
  };

  return (
    <div>
      <div className={styles["custom-shape-divider-bottom-1740491939"]}>
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M598.97 114.72L0 0 0 120 1200 120 1200 0 598.97 114.72z"
            className={styles["shape-fill"]}
          ></path>
        </svg>
      </div>

      <img src="nush.jpg" className={styles.harta} alt="Map" />
      <div className={styles["main-container"]}>
        <div className={styles.signup}>
          <h1 className={styles["signup-titlu"]}>Sign Up for Free</h1>

          <div className={styles.sus}>
            <div className={`${styles.Prenume} ${styles.nume}`}>
              <input
                type="text"
                className={styles.inputs}
                required
                autoComplete="off"
                placeholder="First Name*"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className={`${styles.Nume} ${styles.nume}`}>
              <input
                type="text"
                className={styles.inputs}
                required
                autoComplete="off"
                placeholder="Last Name*"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.username}>
            <input
              type="text"
              className={styles.inputs}
              required
              autoComplete="off"
              placeholder="UserName*"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className={styles.email}>
            <input
              type="email"
              className={styles.inputs}
              required
              autoComplete="off"
              placeholder="Email*"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.parole}>
            <div className={styles["password-field"]}>
              <input
                type={showPassword1 ? 'text' : 'password'}
                className={styles.inputs}
                required
                autoComplete="off"
                placeholder="Set a Password*"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                className={styles["toggle-password"]}
                onClick={() => togglePasswordVisibility('password1')}
              >
                {showPassword1 ? '👁️' : '🙈'}
              </span>
            </div>
            <div className={styles["password-field"]}>
              <input
                type={showPassword2 ? 'text' : 'password'}
                className={styles.inputs}
                required
                autoComplete="off"
                placeholder="Confirm Password*"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <span
                className={styles["toggle-password"]}
                onClick={() => togglePasswordVisibility('password2')}
              >
                {showPassword2 ? '👁️' : '🙈'}
              </span>
            </div>
          </div>

          <div className={styles.notifications}>
            <label htmlFor="notifications" className={styles.notificare}>
              Notifications
            </label>
            <label className={styles.switch}>
              <input
                type="checkbox"
                id="notifications"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.transport}>
            <div className={styles.choose}>
              <p className={styles.preferatu} onClick={toggleTransportDropdown}>
                Preferred means of transport {selectedTransport ? `: ${selectedTransport}` : ''} ⬇
              </p>
              <ul className={`${styles.transportOptions} ${showTransport ? styles.show : ''}`}>
                <li onClick={() => selectTransportOption('Car')}>Car</li>
                <li onClick={() => selectTransportOption('Tram')}>Tram</li>
                <li onClick={() => selectTransportOption('Bus')}>Bus</li>
              </ul>
            </div>
          </div>

          {/* Submit button */}
          <div className={styles["sign-up"]}>
            <button className={styles["buton-signup"]} onClick={handleSubmit}>
              SIGN UP
            </button>
          </div>
        </div>
      </div>

      <div className={styles.text}>
        <h1 className={styles["titlu-text"]}>New here?</h1>
        <div className={styles["welcome-text"]}>
          Welcome to our community! We're thrilled to have you here. Please fill in the fields below to
          create your account and start your journey with us for logging in.
        </div>
        <button onClick={() => navigate('/Login')} className={styles.ionut}>
          Login
        </button>
      </div>
    </div>
  );
};

export default SignUp;
