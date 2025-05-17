import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Components/navbar.module.css';

function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [menuActive, setMenuActive] = useState(false);
    const [polutionActive, setPolutionActive] = useState(false);
    const [soundSubmenuActive, setSoundSubmenuActive] = useState(false);
    const [assistentsActive, setAssistentsActive] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('auth-token');
        const tokenExpiration = localStorage.getItem('token-expiration');
        if (token && tokenExpiration) {
            const expirationTime = new Date(tokenExpiration);
            if (new Date() < expirationTime) {
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('auth-token');
                localStorage.removeItem('token-expiration');
            }
        }
    }, []);

    useEffect(() => {
        fetch('http://localhost:8000/api/user/', { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => setUser(data))
            .catch(console.error);
    }, []);

    const handleLogout = async () => {
        await fetch('http://localhost:8000/api/logout/', { method: 'POST', credentials: 'include' });
        localStorage.removeItem('auth-token');
        localStorage.removeItem('token-expiration');
        setIsAuthenticated(false);
        navigate('/Login');
    };

    const navItems = isAuthenticated
        ? [
            'Home',
            'Articles',
            'Reports',
            'Profile',
            'MyRoutes',
            'Accidents',
            'Polution',
            'Prizes',
            'Assistents',
            'Contact',
            'Logout',
        ]
        : ['Home', 'Login', 'Articles', 'Reports', 'Contact'];

    const toggleMenu = () => setMenuActive(!menuActive);

    const renderNavItem = (item, index) => {
        if (!item) return null;

        if (item === 'Polution') {
            return (
                <div key={index} className={styles.dropdown}>
                    <div
                        className={styles.sus}
                        onClick={() => {
                            setPolutionActive(!polutionActive);
                            setSoundSubmenuActive(false);
                        }}
                    >
                        Polution ▼
                    </div>
                    {polutionActive && (
                        <div className={styles.dropdownMenu}>
                            <div
                                className={styles.sus}
                                onClick={() => setSoundSubmenuActive(!soundSubmenuActive)}
                            >
                                Sound
                            </div>
                            {soundSubmenuActive && (
                                <div className={styles.submenu}>
                                    <div
                                        className={styles.sus}
                                        onClick={() => navigate('/dailytasks')}
                                    >
                                        Daily Tasks
                                    </div>
                                    <div
                                        className={styles.sus}
                                        onClick={() => navigate('/sound')}
                                    >
                                        Phonic Pollution
                                    </div>
                                </div>
                            )}
                            <div
                                className={styles.sus}
                                onClick={() => {
                                    setSoundSubmenuActive(false);
                                    navigate('/co2pollution');
                                }}
                            >
                                CO2
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (item === 'Assistents') {
            return (
                <div key={index} className={styles.dropdown}>
                    <div
                        className={styles.sus}
                        onClick={() => setAssistentsActive(!assistentsActive)}
                    >
                        Assistents ▼
                    </div>
                    {assistentsActive && (
                        <div className={styles.dropdownMenu}>
                            {user.prize3 && (<div
                                className={styles.sus}
                                onClick={() => navigate('/ai-chat')}
                            >
                                AI
                            </div>)}
                            <div
                                className={styles.sus}
                                onClick={() => navigate('/virtualassistant')}
                            >
                                WhatsApp Virtual
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        const handlers = {
            Logout: handleLogout,
            Profile: () => navigate('/Profile'),
            Login: () => navigate('/Login'),
            Home: () => navigate('/'),
            Articles: () => navigate('/Articles'),
            Reports: () => navigate('/Reports'),
            MyRoutes: () => navigate('/UserRoutes'),
            Accidents: () => navigate('/Accidents'),
            Contact: () => navigate('/Contact'),
            Prizes: () => navigate('/Prizes'),
        };

        return (
            <div
                key={index}
                className={styles.sus}
                onClick={handlers[item] || null}
            >
                {item}
            </div>
        );
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.right}>
                <img src="/icon.jpg" alt="Logo" className={styles.logo} />
                <div className={styles.name}>RoutePulse</div>
            </div>

            <div className={styles.left}>
                {navItems.map((item, i) => renderNavItem(item, i))}
            </div>

            <button className={styles.hamburger} onClick={toggleMenu}>
                &#9776;
            </button>

            <div className={`${styles.mobileMenu} ${menuActive ? styles.active : ''}`}>
                {navItems.map((item, i) => renderNavItem(item, i))}
            </div>
        </nav>
    );
}

export default Navbar;