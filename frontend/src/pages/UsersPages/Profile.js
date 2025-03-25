import React, {useState, useEffect, useRef} from "react";
import styles from "../../styles/UsersPages/profile.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram, faFacebook, faTiktok, faGithub} from "@fortawesome/free-brands-svg-icons";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
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
  const [image, setImage] = useState("/default.jpg");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [Instagram, setInstagram] = useState("")
  const [Facebook, setFacebook] = useState("")
  const [Tiktok, setTiktok] = useState("")
  const [Github, setGithub] = useState("")

  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const csrfFetched = useRef(false);
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
        setInstagram(user.instagram || "https://www.instagram.com");
        setFacebook(user.facebook || "https://www.facebook.com");
        setTiktok(user.tiktok || "https://www.tiktok.com");
        setGithub(user.github || "https://github.com");
      })
      .catch((error) => console.error("Error fetching profile:", error));
  }, []);
  const toggleNotif = async () => {
    const newStatus = !notifications;

    try {
      let firebaseToken = null;
      const res = await fetch("http://localhost:8000/api/profile/update/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ notifications: newStatus, }),
      });

      if (res.ok) {
        setNotifications(newStatus);
      } else {
        console.error("Failed to update notifications.");
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
  const handleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
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
                  src={image}
                  alt="Profil"
                  onError={(e) => (e.target.src = "/default.jpg")}
              />
              {isEditing && (
                  <label className={styles.editIcon}>
                    <FontAwesomeIcon
                        icon={faPen}
                        className={styles.penIcon}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className={styles.fileInput}
                    />
                  </label>
              )}
              <h2>{firstName} {lastName}</h2>
              <p className={styles.profile_rute}>Total rute: 120</p>
              <p className={styles.profile_puncte}>Puncte: {points}</p>
              <button
                onClick={toggleNotif}
                style={{ background: notifications ? "#28a745" : "#800080" }}
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
                  value: Instagram
                },
                {
                  icon: faFacebook,
                  link: Facebook,
                  name: "Facebook",
                  stateSetter: setFacebook,
                  value: Facebook
                },
                {
                  icon: faTiktok,
                  link: Tiktok,
                  name: "TikTok",
                  stateSetter: setTiktok,
                  value: Tiktok
                },
                {
                  icon: faGithub,
                  link: Github,
                  name: "GitHub",
                  stateSetter: setGithub,
                  value: Github
                },
              ].map((item, index) => (
                  <div key={index} className={styles.profile_comun}>
                    {isEditing ? (
                        <div>
                          <FontAwesomeIcon
                              icon={item.icon}
                              className={styles.profile_icon}
                          />
                          <input className={styles.profile_inputField}
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
              <h2>Detalii Profil</h2>
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
                <h3>Rutele Preferate</h3>
                <ul className={styles.profile_ruta}>
                  <li>Ruta 1: Gara - Centru</li>
                  <li>Ruta 2: Aeroport - Universitate</li>
                  <li>Ruta 3: Parcul Mare - Mall</li>
                </ul>
              </div>
              <div className={styles.profile_right}>
                <h3>Ultimele Rute</h3>
                <ul>
                  <li>06 Martie: Gara - Piața Mare</li>
                  <li>05 Martie: Universitate - Stadion</li>
                  <li>04 Martie: Aeroport - Centru</li>
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
