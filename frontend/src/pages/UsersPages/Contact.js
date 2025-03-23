import React, { useState } from "react";
import styles from "../../styles/UsersPages/contact.module.css";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'; // For Map component
import 'leaflet/dist/leaflet.css';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [formMessage, setFormMessage] = useState('');

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
        const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

        if (name && email && subject && message) {
            // Prepare the data to be sent
            const contactData = {
                name,
                email,
                subject,
                content: message,
                date
            };

            try {
                const response = await fetch('http://localhost:8000/api/contact/', { // Adjust the URL based on your API endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(contactData),
                });

                const result = await response.json();

                if (response.ok) {
                    setFormMessage(result.message); // Display success message
                } else {
                    setFormMessage(result.error); // Display error message
                }
            } catch (error) {
                setFormMessage("An error occurred. Please try again later.");
            }

            // Reset form fields after submission
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: ''
            });
        } else {
            setFormMessage("Please fill in all the fields.");
        }
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
                            <MapContainer center={[47.1585, 27.6014]} zoom={13} style={{ height: "400px", width: "100%" }}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                {/* Removed Marker here */}
                            </MapContainer>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Contact;
