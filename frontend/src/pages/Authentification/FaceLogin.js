import React, { useEffect, useRef, useState } from 'react';
import styles from '../../styles/Authentification/FaceLogin.module.css';

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const FaceLogin = () => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [faceImage, setFaceImage] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const csrfFetched = useRef(false);

    const captureImage = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFaceImage(dataUrl);
    };

    useEffect(() => {
        if (csrfFetched.current) return;
        csrfFetched.current = true;

        fetch('http://localhost:8000/api/csrf-token/', {
            method: 'GET',
            credentials: 'include',
        })
            .then((response) => {
                if (response.ok) return response.json();
                throw new Error('Failed to fetch CSRF token');
            })
            .then((data) => {
                console.log('Fetched CSRF token (response):', data.csrf_token);
            })
            .catch((error) => console.error('Error fetching CSRF token:', error));

        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                videoRef.current.srcObject = stream;
            })
            .catch((error) => console.error('Error accessing webcam:', error));
    }, []);

    const handleLogin = async () => {
        if (!faceImage) {
            setMessage('Please capture a face image');
            return;
        }

        setLoading(true);
        setMessage('');
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            alert('CSRF token is missing!');
            return;
        }
        const pendingSuperuser = localStorage.getItem('pending-superuser');
        if (!pendingSuperuser) {
            setMessage('No pending superuser found');
            setLoading(false);
            return;
        }
        const userData = JSON.parse(pendingSuperuser);

        try {
            const response = await fetch('http://localhost:8000/api/face-login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ face_image: faceImage, user_id: userData.id }),
                credentials: 'include',
            });

            const data = await response.json();

            if (response.ok) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                const expirationTime = new Date();
                expirationTime.setHours(expirationTime.getHours() + 6);
                localStorage.setItem('auth-token', 'true');
                localStorage.setItem('token-expiration', expirationTime.toString());
                localStorage.removeItem('pending-superuser');
                setMessage('Login successful! Redirecting...');

                setTimeout(() => {
                    window.location.href = '/'; // Redirect to home page
                }, 1000); // Wait 1.5 seconds to show message before redirect
            } else {
                setMessage(data.message || 'An error occurred');
            }
        } catch (error) {
            setMessage('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Face Recognition Login</h2>
            <div className={styles.videoContainer}>
                <video ref={videoRef} autoPlay playsInline className={styles.video}></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
            <button onClick={captureImage} className={styles.captureButton}>Capture Face</button>
            <button onClick={handleLogin} className={styles.loginButton} disabled={loading}>
                {loading ? 'Logging in...' : 'Login with Face'}
            </button>
            {message && <p className={styles.message}>{message}</p>}
        </div>
    );
};

export default FaceLogin;
