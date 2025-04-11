import React, { useEffect, useState } from "react";
import styles from "../../styles/UsersPages/contact.module.css";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import L from 'leaflet';

// Fix for Marker Icons not showing in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Define the coordinates for Liceul Teoretic de Informatica Grigore Moisil
const schoolCoordinates = [47.185086, 27.566440]; // Adjust these coordinates if necessary

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [formMessage, setFormMessage] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingMessage, setRatingMessage] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState({});

    useEffect(() => {
        fetch(`http://localhost:8000/api/user/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                console.log("User Data:", data);
                setUser(data);
            })
            .catch(error => console.error("Error fetching user data:", error));
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, email, subject, message } = formData;
        const date = new Date().toISOString().split('T')[0];

        if (name && email && subject && message) {
            const contactData = { name, email, subject, content: message, date };
            try {
                const response = await fetch('http://localhost:8000/api/contact/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contactData),
                });
                const result = await response.json();
                if (response.ok) {
                    setFormMessage(result.message);
                } else {
                    setFormMessage(result.error);
                }
            } catch (error) {
                setFormMessage("An error occurred. Please try again later.");
            }
            setFormData({ name: '', email: '', subject: '', message: '' });
        } else {
            setFormMessage("Please fill in all the fields.");
        }
    };

    const handleStarClick = (star) => {
        const user_id = user.id;
        setRating(star);
        if (star >= 3) {
            setRatingMessage("We're thrilled you love our app! Your satisfaction inspires us to keep getting better.");
        } else {
            setRatingMessage("Thank you for your feedback. Please share your suggestions so we can make your experience even better.");
        }
        fetch(`http://localhost:8000/api/rate_app/${user_id}/${star}/`, {
            method: 'POST',
        });
        setShowModal(true);
    };

    const handleStarMouseEnter = (star) => {
        setHoverRating(star);
    };

    const handleStarMouseLeave = () => {
        setHoverRating(0);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    return (
        <div className={styles.contactContainer}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <main>
                <section className={styles.contactSection}>
                    <h2>We'd Love to Hear From You!</h2>
                    <p>If you have any questions, comments, or feedback, feel free to reach out to us using the form below.</p>

                    <div className={styles.contactContent}>
                        {/* Contact Form Section */}
                        <div className={styles.contactFormContainer}>
                            <form id="contactForm" className={styles.contactForm} onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name"><i className="fas fa-user"></i> Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        placeholder="Your Full Name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="email"><i className="fas fa-envelope"></i> Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="Your Email Address"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="subject"><i className="fas fa-tag"></i> Subject</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        placeholder="Subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="message"><i className="fas fa-comment-alt"></i> Your Message</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        placeholder="Write your message here..."
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                    ></textarea>
                                </div>
                                <button type="submit" className={styles.submitBtn}>Send Message</button>
                            </form>
                            {formMessage && (
                                <div className={`${styles.formMessage} ${formMessage.includes('Thank you') ? styles.successMessage : ''}`}>
                                    <p>{formMessage}</p>
                                </div>
                            )}
                        </div>

                        {/* Map Section */}
                        <div className={styles.contactMap}>
                            <h3>Our Location</h3>
                            <MapContainer center={schoolCoordinates} zoom={15} style={{ height: "400px", width: "100%" }}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <Marker position={schoolCoordinates}>
                                    <Popup>
                                        Liceul Teoretic de Informatica Grigore Moisil
                                    </Popup>
                                </Marker>
                            </MapContainer>

                            {/* Rating Section */}
                            <div className={styles.rateContainer}>
                                <p>Rate Us</p>
                                <div className={styles.stars}>
                                    {[1, 2, 3, 4, 5].map((star) => {
                                        const isFilled = star <= (hoverRating || rating);
                                        return (
                                            <i
                                                key={star}
                                                className={`fas fa-star ${styles.star} ${isFilled ? styles.filled : ""}`}
                                                onClick={() => handleStarClick(star)}
                                                onMouseEnter={() => handleStarMouseEnter(star)}
                                                onMouseLeave={handleStarMouseLeave}
                                            ></i>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Rating Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <button className={styles.modalClose} onClick={closeModal}>&times;</button>
                        <p>{ratingMessage}</p>
                    </div>
                </div>
            )}
            <div className={styles.test}>
                <Footer />
            </div>
        </div>
    );
};

export default Contact;
