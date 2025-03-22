import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Components/navbar.module.css'; // Your CSS module
function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    const tokenExpiration = localStorage.getItem('token-expiration');
    
    if (token && tokenExpiration) {
      const expirationTime = new Date(tokenExpiration);
      const currentTime = new Date();
      if (currentTime >= expirationTime) {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('token-expiration');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    }
  }, []);
  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/logout/', {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent along
      });

      if (response.ok) {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('token-expiration');
        setIsAuthenticated(false);
        navigate('/Login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  const navItems = isAuthenticated
    ? ["Home", "Articles", "Reports", "Car Routes", "Profile", "Logout", "MyRoutes", "Accidents"]
    : ["Home", "Login", "Articles", "Reports", "Car Routes", "Accidents"];

  return (
    <nav className={styles.navbar}>
      <div className={styles.right}>
        <div className={styles.name}>Exploration</div>
      </div>
      <div className={styles.left}>
        {navItems.map((item, index) => {
          if (item === "Logout") {
            return (
              <div key={index} className={styles.sus} onClick={handleLogout}>
                {item}
              </div>
            );
          } else if (item === "Profile") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/Profile')}>
                {item}
              </div>
            );
          } else if (item === "Login") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/Login')}>
                {item}
              </div>
            );
          } else if (item === "Home") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/')}>
                {item}
              </div>
            );
          } else if (item === "Car Routes") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/Cars')}>
                {item}
              </div>
            );
          } else if (item === "Articles") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/Articles')}>
                {item}
              </div>
            );
          } else if (item === "Reports") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/Reports')}>
                {item}
              </div>
            );
          } else if (item === "MyRoutes") {
            return (
              <div key={index} className={styles.sus} onClick={() => navigate('/UserRoutes')}>
                {item}
              </div>
            )
          } else if (item === "Accidents") {
            return (
                <div key={index} className={styles.sus} onClick={() => navigate('/Accidents')}>
                  {item}
                </div>
            )
          }
          return (
            <div key={index} className={styles.sus}>
              {item}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default Navbar;
