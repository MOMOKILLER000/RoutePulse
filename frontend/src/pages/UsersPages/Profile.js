import React, { useState, useEffect, useRef } from "react";
import styles from "../../styles/UsersPages/profile.module.css";
import {useNavigate} from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram, faFacebook, faTiktok, faGithub } from "@fortawesome/free-brands-svg-icons";
import { faPen, faTrash  } from "@fortawesome/free-solid-svg-icons";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { getMessagingToken, messaging } from "../../firebase";

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

const Profile = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [preferredTransport, setPreferredTransport] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [points, setPoints] = useState(0);
  const [image, setImage] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [Instagram, setInstagram] = useState("");
  const [Facebook, setFacebook] = useState("");
  const [Tiktok, setTiktok] = useState("");
  const [Github, setGithub] = useState("");
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const csrfFetched = useRef(false);
  const [prize1 , setPrize1] = useState(false);
  const [prize2 , setPrize2] = useState(false);
  const [prize3 , setPrize3] = useState(false);
  const [routes, setRoutes] = useState(null);
  const navigate = useNavigate();
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
  }, []);

  const togglePasswordVisibility = (passwordId) => {
    if (passwordId === "password1") {
      setShowPassword1(!showPassword1);
    } else {
      setShowPassword2(!showPassword2);
    }
  };

  const fetchToken = async () => {
    try {
      const swRegistration = await navigator.serviceWorker.ready;
      const currentToken = await getMessagingToken(messaging, {
        vapidKey: 'BM3006r6JiFC4ey0qrIBno0iubQHEeUmmRzW4P2udg7rC93PY_lDVT2UqSBqf5SZHJkmMtoI6DALZdd1utUjsSE',
        serviceWorkerRegistration: swRegistration,
      });
      if (currentToken) {
        console.log('Firebase Token:', currentToken);
        return currentToken;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
        return null;
      }
    } catch (err) {
      console.error('Error retrieving token', err);
      return null;
    }
  };

  useEffect(() => {
    const csrfToken = getCookie('csrftoken');
    fetch("http://localhost:8000/api/profile/", {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
    })
        .then((response) => response.json())
        .then((data) => {
          const user = data.user;
          setFirstName(user.first_name);
          setLastName(user.last_name);
          setEmail(user.email);
          setUsername(user.username);
          setPreferredTransport(user.preferred_transport);
          setNotifications(user.notifications);
          setPoints(user.points);
          setImage(user.image || "/default.jpg");
          setPrize1(user.prize1);
          setPrize2(user.prize2);
          setPrize3(user.prize3);
          setInstagram(user.instagram || "https://www.instagram.com");
          setFacebook(user.facebook || "https://www.facebook.com");
          setTiktok(user.tiktok || "https://www.tiktok.com");
          setGithub(user.github || "https://github.com");
          setTotalRoutes(user.total_routes || 0);
          setRoutes(user.routes);
        })
        .catch((error) => console.error("Error fetching profile:", error));
  }, []);

  const toggleNotif = async () => {
    let newStatus = !notifications;
    let firebaseToken = null;

    if (newStatus) {
      firebaseToken = await fetchToken();
    }

    const requestBody = {
      notifications: newStatus,
    };

    if (firebaseToken) {
      requestBody.firebase_token = firebaseToken;
    }

    try {
      const res = await fetch("http://localhost:8000/api/profile/update/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        setNotifications(newStatus);
      } else {
        const errorData = await res.json();
        console.error("Error response:", errorData);
        alert("Eroare la actualizarea notificărilor!");
      }
    } catch (err) {
      console.error("Error updating notifications:", err);
      alert("Eroare la actualizarea notificărilor!");
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  // New function to remove the profile image
  const handleRemoveImage = async () => {
    const formData = new FormData();
    formData.append("remove_image", "true");

    try {
      const res = await fetch("http://localhost:8000/api/profile/update/", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (res.ok) {
        setImage("/default.jpg");
        setSelectedFile(null);
      } else {
        const errorData = await res.json();
        console.error("Error removing image:", errorData);
        alert("Failed to remove image. Please try again.");
      }
    } catch (err) {
      console.error("Error removing image:", err);
      alert("Error removing image. Please try again later.");
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (newPassword) {
      if (newPassword !== confirmNewPassword) {
        alert("New password and confirmation do not match!");
        return;
      }
    }
    const formData = new FormData();

    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("username", username);
    formData.append("preferred_transport", preferredTransport);
    formData.append("notifications", notifications);
    formData.append("instagram", Instagram);
    formData.append("facebook", Facebook);
    formData.append("tiktok", Tiktok);
    formData.append("github", Github);
    if (newPassword) {
      formData.append("password", newPassword);
    }
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    try {
      const res = await fetch("http://localhost:8000/api/profile/update/", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        setFirstName(user.first_name);
        setLastName(user.last_name);
        setUsername(user.username);
        setPreferredTransport(user.preferred_transport);
        setNotifications(user.notifications);
        setPoints(user.points);
        setImage(user.image || "/default.jpg");
        setIsEditing(false);
        setNewPassword("");
        setConfirmNewPassword("");
        setSelectedFile(null);
      } else {
        const errorData = await res.json();
        console.error("Error updating profile:", errorData);
        alert("Failed to update profile. Please check the details you entered.");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error updating profile. Please try again later.");
    }
  };

  const handleMyRoutes = () => {
    navigate('/UserRoutes');
  }
  return (
      <div className={styles.profile_firstContainer}>
        <div className={styles.navbarAdjust}>
          <Navbar />
        </div>
        <div className={styles.profile_bodyContainer}>
          <div className={styles.profile_mainContainer}>
            <div className={styles.profile_stanga}>
              <div className={styles.profile_poza}>
                <img
                    src={
                      image && image !== "/default.jpg"
                          ? image
                          : prize1
                              ? "/premium.jpg"
                              : "/default.jpg"
                    }
                    alt="Profil"
                    onError={(e) => (e.target.src = "/default.jpg")}
                />
                {isEditing && (
                    <div className={styles.imageControls}>
                      <button onClick={handleRemoveImage} className={styles.removeImageButton}>
                        <FontAwesomeIcon icon={faTrash} size="lg" />
                        <p className={styles.delete}>Delete Image</p>
                      </button>
                      <label className={styles.editIcon}>
                        <FontAwesomeIcon icon={faPen} className={styles.penIcon} />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className={styles.fileInput}
                        />
                      </label>
                    </div>
                )}
                <h2>
                  {firstName} {lastName}
                </h2>
                <p className={styles.profile_rute}>Total routes: {totalRoutes}</p>
                <p className={styles.profile_puncte}>Points: {points}</p>
                <button className={styles.profileStangaButton}
                    onClick={toggleNotif}
                    style={{ background: notifications ? "#ff8a65" : "#20876e" }}
                >
                  {notifications ? "Notificări On" : "Notificări Off"}
                </button>
              </div>
              <div className={styles.profile_socialMedia}>
                {[
                  {
                    icon: faInstagram,
                    link: Instagram,
                    name: "Instagram",
                    stateSetter: setInstagram,
                    value: Instagram,
                  },
                  {
                    icon: faFacebook,
                    link: Facebook,
                    name: "Facebook",
                    stateSetter: setFacebook,
                    value: Facebook,
                  },
                  {
                    icon: faTiktok,
                    link: Tiktok,
                    name: "TikTok",
                    stateSetter: setTiktok,
                    value: Tiktok,
                  },
                  {
                    icon: faGithub,
                    link: Github,
                    name: "GitHub",
                    stateSetter: setGithub,
                    value: Github,
                  },
                ].map((item, index) => (
                    <div key={index} className={styles.profile_comun}>
                      {isEditing ? (
                          <div>
                            <FontAwesomeIcon
                                icon={item.icon}
                                className={styles.profile_icon}
                            />
                            <input
                                className={styles.profile_inputField}
                                type="text"
                                value={item.value}
                                onChange={(e) => item.stateSetter(e.target.value)}
                                placeholder={`Edit ${item.name} link`}
                            />
                          </div>
                      ) : (
                          <a href={item.link} target="_blank" rel="noopener noreferrer">
                            <FontAwesomeIcon
                                icon={item.icon}
                                className={styles.profile_icon}
                            />
                            <p className={styles.profile_text}>{item.name}</p>
                          </a>
                      )}
                    </div>
                ))}
              </div>
            </div>

            <div className={styles.profile_dreapta}>
              <div className={styles.profile_main}>
                <h2>Profile details</h2>
                <form className={styles.profile_form} onSubmit={handleSave}>
                  <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditing}
                  />
                  <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditing}
                  />
                  <input type="email" value={email} disabled />
                  <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!isEditing}
                  />
                  {isEditing && (
                      <>
                        <div className={styles["password-field"]}>
                          <input
                              type={showPassword1 ? "text" : "password"}
                              placeholder="New Password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <span
                              className={styles["toggle-password"]}
                              onClick={() => togglePasswordVisibility("password1")}
                          >
                        {showPassword1 ? "👁️" : "🙈"}
                      </span>
                        </div>
                        <div className={styles["password-field"]}>
                          <input
                              type={showPassword2 ? "text" : "password"}
                              placeholder="Confirm New Password"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                          />
                          <span
                              className={styles["toggle-password"]}
                              onClick={() => togglePasswordVisibility("password2")}
                          >
                        {showPassword2 ? "👁️" : "🙈"}
                      </span>
                        </div>
                      </>
                  )}
                  <select
                      value={preferredTransport}
                      onChange={(e) => setPreferredTransport(e.target.value)}
                      disabled={!isEditing}
                  >
                    <option value="None">None</option>
                    <option value="Bus">Bus</option>
                    <option value="Tram">Tram</option>
                    <option value="Car">Car</option>
                  </select>

                  <div className={styles.profile_buttons}>
                    <button type="button" onClick={handleEdit}>
                      Edit
                    </button>
                    <button type="submit">Salvează</button>
                  </div>
                </form>
              </div>
              <div className={styles.profile_bottom}>
                <div className={styles.profile_left}>
                  <h3>Saved Routes</h3>
                  <ul className={styles.profile_ruta}>
                    {routes && routes.map((item, index) =>
                        item.route_type === 'Normal_Transport' ? ( // Use triple `===` for comparison
                            <li className={styles.userRoutes} onClick={handleMyRoutes} key={index}>{item.origin}</li>
                        ) : (<li className={styles.userRoutes} onClick={handleMyRoutes} key={index}>{item.route_short_name}-{item.route_long_name}</li>) // Return `null` if the condition isn't met
                    )}
                  </ul>
                </div>
                <div className={styles.profile_right}>
                  <h3>Claimed Prizes</h3>
                  <ul>
                    {prize1 && (<li>Premium Profile Image</li>)}
                    {prize2 && (<li>Personalized Footer</li>)}
                    {prize3 && (<li>Personal AI Assistant</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
  );
};

export default Profile;
