import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Authentification/registration.module.css';
import { useNavigate } from 'react-router-dom';
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          console.log('Fetched CSRF token (response):', data.csrf_token);
        })
        .catch((error) => console.error('Error fetching CSRF token:', error));
  }, []);
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };
  const handleSignUpClick = () => {
    navigate('/Signup');
  };
  const handleAdminLoginClick = () => {
    navigate('/adminlogin');
  }
  const handleSubmit = async (e) => {
    e.preventDefault();
    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      alert('CSRF token is missing!');
      return;
    }

    const userData = {
      email,
      password,
    };

    try {
      const response = await fetch('http://localhost:8000/api/user_login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
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
      console.error('Error during login:', error);
      alert('There was an error during login');
    }
  };

  return (
      <div>
        <button onClick={handleAdminLoginClick} className={styles.ionut1}>
          Admins
        </button>
        <div className={styles['custom-shape-divider-bottom-1740491939']}>
          <svg
              data-name="Layer 1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
          >
            <path
                d="M598.97 114.72L0 0 0 120 1200 120 1200 0 598.97 114.72z"
                className={styles['shape-fill']}
            ></path>
          </svg>
        </div>
        <img src="nush.jpg" className={styles.harta} alt="Map" />
        <div className={styles['main-container']}>
          <div className={styles.signup}>
            <h1 className={styles['signup-titlu']}>Login into your account</h1>
            <div className="email">
              <input
                  type="email"
                  className={styles.inputs}
                  required
                  autoComplete="off"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.parole}>
              <div className={styles['password-field']}>
                <input
                    type={showPassword ? 'text' : 'password'}
                    className={styles.inputs}
                    required
                    autoComplete="off"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <span
                    className={styles['toggle-password']}
                    onClick={togglePasswordVisibility}
                >
                {showPassword ? '👁️' : '🙈'}
              </span>
              </div>
            </div>

            <div className="sign-up">
              <button className={styles['buton-signup']} onClick={handleSubmit}>
                LOGIN
              </button>
            </div>
          </div>
        </div>

        <div className={styles.text}>
          <h1 className={styles['titlu-text']}>New here?</h1>
          <div className={styles['welcome-text']}>
            Welcome to our community! We're thrilled to have you here. Please fill in the fields
            below to create your account and start your journey with us.
          </div>
          <button onClick={handleSignUpClick} className={styles.ionut}>
            Sign up
          </button>
        </div>
      </div>
  );
};

export default Login;
