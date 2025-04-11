import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Components/navbar.module.css';

function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [menuActive, setMenuActive] = useState(false);
    const [user, setUser] = useState(null);
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

    useEffect(() => {
        fetch('http://localhost:8000/api/user/', { credentials: 'include' })
            .then((response) => response.json())
            .then((data) => {
                console.log("User Data:", data);
                setUser(data);
            })
            .catch((error) => console.error("Error fetching user data:", error));
    }, []);

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/logout/', {
                method: 'POST',
                credentials: 'include',
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
        ? [
            "Home",
            "Articles",
            "Reports",
            "Profile",
            "MyRoutes",
            "Accidents",
            "Prizes",
            "Contact",
            user && user.prize3 ? "AI Assistant" : null,
            "Logout",
        ]
        : ["Home", "Login", "Articles", "Reports", "Contact"];

    const toggleMenu = () => {
        setMenuActive(!menuActive);
    };

    const renderNavItem = (item, index) => {
        if (!item) return null; // Ignore null values in navItems

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
        } else if (item === "AI Assistant") {
            return (
                <div key={index} className={styles.sus} onClick={() => navigate('/ai-chat')}>
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
            );
        } else if (item === "Accidents") {
            return (
                <div key={index} className={styles.sus} onClick={() => navigate('/Accidents')}>
                    {item}
                </div>
            );
        } else if (item === "Contact") {
            return (
                <div key={index} className={styles.sus} onClick={() => navigate('/Contact')}>
                    {item}
                </div>
            );
        } else if (item === "Prizes") {
            return (
                <div key={index} className={styles.sus} onClick={() => navigate('/Prizes')}>
                    {item}
                </div>
            );
        }
        return (
            <div key={index} className={styles.sus}>
                {item}
            </div>
        );
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.right}>
                `<img src="/icon.jpg" alt="Phone" className={styles.logo} />
                <div className={styles.name}>RoutePulse</div>
            </div>
            <div className={styles.left}>
                {navItems.map((item, index) => renderNavItem(item, index))}
            </div>
            <button className={styles.hamburger} onClick={toggleMenu}>
                &#9776;
            </button>
            <div className={`${styles.mobileMenu} ${menuActive ? styles.active : ''}`}>
                {navItems.map((item, index) => renderNavItem(item, index))}
            </div>
        </nav>
    );
}

export default Navbar;
