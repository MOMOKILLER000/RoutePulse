import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from "../../styles/Adding/feedback.module.css"; // Assuming all styles are now here
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loading from "../../components/Loading";

const Feedback = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            fetch(`http://localhost:8000/api/feedback/${id}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Feedback not found');
                    }
                    return res.json();
                })
                .then(data => {
                    setFeedback(data);
                    setError(null);
                })
                .catch(err => {
                    console.error(err);
                    setError(err.message);
                });
        }
    }, [id]);

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this feedback?")) {
            fetch(`http://localhost:8000/api/feedback/${id}/`, {
                method: 'DELETE',
            })
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Failed to delete feedback');
                    }
                    alert("Feedback deleted successfully!");
                    navigate('/admin');
                })
                .catch(err => {
                    console.error(err);
                    alert("Error deleting feedback.");
                });
        }
    };

    if (error) {
        return <p className={styles.errorMessage}>{error}</p>;
    }

    if (!feedback) {
        return <Loading />;
    }

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };


    return (
        <div className={styles.mainContainer}>
            <div className={styles.container}>
                <div className={styles.navbarAdjust}>
                    <Navbar />
                </div>
                <div className={styles.mainContent}>
                    <div className={styles.feedbackContainer}>
                        <h2 className={styles.feedbackTitle}>{feedback.name}</h2>
                        <p className={styles.feedbackEmail}>📧 {feedback.email}</p>
                        <h2 className={styles.feedbackSubject}>{feedback.subject}</h2>
                        <p className={styles.feedbackMessage}>💬 "{feedback.message}"</p>
                        <p className={styles.feedbackDate}>🗓️ {formatDate(feedback.date)}</p>
                        <button className={styles.deleteButton} onClick={handleDelete}>Delete Feedback</button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Feedback;
