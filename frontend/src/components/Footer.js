import React from 'react';
import styles from "../styles/PostsPages/articles.module.css";

const Footer = () => {
    return(
        <footer className={styles.footer}>
            <p>&copy; 2025 Traffic News. All rights reserved.</p>
            <p>
                <a href="https://www.instagram.com/">Privacy Policy</a> | <a href="https://www.instagram.com/">Terms of Service</a>
            </p>
        </footer>
    );
}

export default Footer;