import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Components/pleaselogin.module.css";

const PleaseLogin = () => {
    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>You are not logged in</h2>
            <Link to="/" className={styles.loginLink}>
                Go to home page
            </Link>
        </div>
    );
};

export default PleaseLogin;