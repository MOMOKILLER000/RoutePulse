import React from 'react';
import styles from '../styles/Components/loading.module.css'; // Custom CSS for styling

const Loading = () => (
    <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <h2>Loading... Please wait</h2>
    </div>
);

export default Loading;
