import React, { useState } from 'react';
import styles from "../../styles/Adding/ArticlePosting.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const ArticlePosting = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        content: '',
        photo: null,
    });
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const showStep = (step) => {
        if (step === 2 && (!formData.title || !formData.description || !formData.photo)) {
            setCurrentStep(1);
            alert('Please fill out all required fields before proceeding!');
        } else if (step === 3 && (!formData.content || !formData.title || !formData.description || !formData.photo)) {
            setCurrentStep(2);
            alert('Please complete the required fields before proceeding!');
        } else {
            setCurrentStep(step);
        }
    };
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prevState) => ({
                ...prevState,
                photo: file,
            }));
        }
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('content', formData.content);
        if (formData.photo) {
            formDataToSend.append('image', formData.photo);
        }

        try {
            const response = await fetch('http://localhost:8000/api/create_article/', {
                method: 'POST',
                body: formDataToSend,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to create article');
            }

            const data = await response.json();
            console.log('Article created:', data);
            alert('Post Submitted Successfully!');
            setFormData({
                title: '',
                description: '',
                content: '',
                photo: null,
            });
            setCurrentStep(1);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to submit post. Please try again.');
        }
    };
    const handleImageClick = () => {
        setIsImageModalOpen(true);
    };
    const closeImageModal = () => {
        setIsImageModalOpen(false);
    };

    return (
        <div className={styles.mainContainer}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>
            <div className={styles.bodyContainer}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>Create a New Post</h1>
                    </header>

                    <div className={styles['form-container']}>
                        {}
                        <div className={styles['stepper-nav']}>
                            <button
                                className={`${styles['step-button']} ${currentStep === 1 ? styles.active : ''}`}
                                onClick={() => showStep(1)}
                            >
                                Step 1: Basic Info
                            </button>
                            <button
                                className={`${styles['step-button']} ${currentStep === 2 ? styles.active : ''}`}
                                onClick={() => showStep(2)}
                            >
                                Step 2: Content
                            </button>
                            <button
                                className={`${styles['step-button']} ${currentStep === 3 ? styles.active : ''}`}
                                onClick={() => showStep(3)}
                            >
                                Step 3: Review
                            </button>
                        </div>

                        <form id="postForm" onSubmit={handleSubmit}>
                            <div className={`${styles['form-step']} ${currentStep === 1 ? styles.active : ''}`}>
                                <div className={styles['form-group']}>
                                    <input
                                        className={styles['input']}
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <label htmlFor="title" className={styles['floating-label']}>Title</label>
                                </div>

                                <div className={styles['form-group']}>
                                    <input
                                        className={styles['input']}
                                        type="text"
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <label htmlFor="description" className={styles['floating-label']}>Description</label>
                                </div>

                                <div className={styles['form-group']}>
                                    <input
                                        className={styles['file-input']}
                                        type="file"
                                        id="photo"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        required
                                    />
                                    <label htmlFor="photo" className={styles['floating-label']}>Upload Photo</label>
                                    {formData.photo && (
                                        <div className={styles['photo-preview-container']}>
                                            <img
                                                className={styles['photo-preview']}
                                                src={URL.createObjectURL(formData.photo)}
                                                alt="Preview"
                                                onClick={handleImageClick}
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className={styles['btn-next']}
                                    onClick={() => showStep(2)}
                                >
                                    Next
                                </button>
                            </div>
                            <div className={`${styles['form-step']} ${currentStep === 2 ? styles.active : ''}`}>
                                <label htmlFor="content" className={styles['floating-label1']}>Content</label>
                                <div className={styles['form-group']}>
                                    <textarea
                                        className={styles['textarea']}
                                        id="content"
                                        name="content"
                                        value={formData.content}
                                        onChange={handleInputChange}
                                        placeholder="Write your content here..."
                                        rows="6"
                                        required
                                    />
                                </div>

                                <button
                                    type="button"
                                    className={styles['btn-prev']}
                                    onClick={() => showStep(1)}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className={styles['btn-next']}
                                    onClick={() => showStep(3)}
                                >
                                    Next
                                </button>
                            </div>

                            <div className={`${styles['form-step']} ${currentStep === 3 ? styles.active : ''}`}>
                                <div className={styles['review-section']}>
                                    <h2>Review Your Post</h2>
                                    <div className={styles['review-item']}>
                                        <strong>Title:</strong> <span>{formData.title || 'No title entered yet'}</span>
                                    </div>
                                    <div className={styles['review-item']}>
                                        <strong>Description:</strong> <span>{formData.description || 'No description entered yet'}</span>
                                    </div>
                                    <div className={styles['review-item']}>
                                        <strong>Content:</strong>
                                        <div className={styles['content-preview']}>
                                            <p>{formData.content || 'No content entered yet'}</p>
                                        </div>
                                    </div>
                                    <div className={styles['review-item']}>
                                        <strong>Photo:</strong>
                                        {formData.photo ? (
                                            <div id="review-photo">
                                                <img
                                                    src={URL.createObjectURL(formData.photo)}
                                                    alt="Uploaded Photo"
                                                    className={styles['review-photo-img']}
                                                />
                                            </div>
                                        ) : (
                                            <span>No photo uploaded yet</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={styles['btn-prev']}
                                    onClick={() => showStep(2)}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles['btn-submit']}
                                >
                                    Submit Post
                                </button>
                            </div>
                        </form>
                    </div>

                    {isImageModalOpen && (
                        <div className={styles['image-modal']} onClick={closeImageModal}>
                            <img
                                src={URL.createObjectURL(formData.photo)}
                                alt="Large Preview"
                                className={styles['modal-image']}
                            />
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ArticlePosting;
