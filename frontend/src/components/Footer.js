import React, { useEffect, useState } from "react";
import styles from "../styles/PostsPages/articles.module.css";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";

const Footer = () => {
    const [rating, setRating] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:8000/api/average_rating/`, { credentials: "include" })
            .then((response) => response.json())
            .then((data) => {
                console.log("Rating Data:", data); // Debugging
                setRating(data.average_rating.avg); // Use the correct field here
            })
            .catch((error) => console.error("Error fetching user data:", error));
    }, []);

    const [user, setUser] = useState({});

    useEffect(() => {
        fetch(`http://localhost:8000/api/user/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                setUser(data);
            })
            .catch(error => {
            });
    }, []);

    return (
        <footer className={styles.footer}>
            <div className={styles["footer-content"]}>
                {rating !== null && (
                    <p className={styles.rating}>
                        {Array.from({ length: Math.floor(rating) }, (_, i) => (
                            <FaStar key={i} />
                        ))}
                        {rating % 1 !== 0 && <FaStarHalfAlt />}
                        &nbsp; {rating}/5
                    </p>
                )}
                { user && user.prize2 && (<p>Thank you, {user.username}, for being a valued part of our community! Your support and engagement mean the world to us.
                    Keep exploring and enjoy your rewards!</p>)}
                <p>&copy; 2025 Traffic Routes. Designed & Developed by Luchian Adrian, Buzdugan Mihnea & Sănduleasa Daria.</p>
            </div>
            <p className={styles["footer-quote"]}>"Syncing You with the City's Flow!"</p>
        </footer>
    );
};

export default Footer;
