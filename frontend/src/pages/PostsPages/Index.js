import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/PostsPages/index.module.css";
import Navbar from "../../components/Navbar";
import harta from "../../assets/harta.jpg";
import telefon from "../../assets/telefon.jpg";
import Footer from "../../components/Footer";
const Index = () => {
    const [dropdownVisibility, setDropdownVisibility] = useState({
        tram: false,
        bus: false,
    });
    const navigate = useNavigate();
    const [latestArticles, setLatestArticles] = useState([]);
    useEffect(() => {
        // Fetch latest articles
        fetch("http://localhost:8000/api/latest_articles/")
            .then((response) => response.json())
            .then((data) => {
                console.log("Latest Articles:", data);  // Debug: log data
                setLatestArticles(data);
            })
            .catch((error) => {
                console.error("Error fetching latest articles:", error);
                alert("Failed to fetch latest articles. Please try again later.");
            });
    }, []);
    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "preload";
        link.href = "../assets/harta.jpg";
        link.as = "image";
        document.head.appendChild(link);
    }, []);

    const toggleDropdown = (type) => {
        setDropdownVisibility((prevState) => ({
            ...prevState,
            [type]: !prevState[type],
            ...(type === "tram" && { bus: false }),
            ...(type === "bus" && { tram: false }),
        }));
    };

    const handleTransportSelection = (transport) => {
        const selectedCity = document.getElementById(`${transport}Select`).value;
        const city = selectedCity === "Bucuresti" ? "bucharest" : selectedCity.toLowerCase();
        navigate(`/${city}/${transport}`);
    };

    const handleNavigation = (path) => {
        navigate(path);  // Navigate to the given path
    };
    const formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("en-US", options);
    };

    const truncateContent = (content, wordLimit = 20) => {
        if (!content) return "";
        const words = content.split(" ");
        return words.length > wordLimit ? words.slice(0, wordLimit).join(" ") + "..." : content;
    };

    const transportTypes = ["tram", "bus"];
    const cities = {
        tram: ["Iasi", "Cluj", "Timisoara", "Bucuresti"],
        bus: ["Iasi", "Cluj", "Timisoara", "Botosani", "Bucuresti"],
    };
    const handleArticleClick = (id) => {
        if (id) {
            navigate(`/article/${id}`); // Navigate to article detail page
        } else {
            console.error("Article ID is missing");
        }
    };
    return (
        <div className={styles["body"]}>
        <div className={styles["main-container"]}>
            <Navbar />
            <div className={styles.middle}>
                <img src={harta} alt="Map" className={styles.harta} />
            </div>

            <div className={styles["buttons-container"]}>
                {["Articles", "Reports"].map((btn, index) => (
                    <button
                        key={index}
                        className={styles.buton}
                        onClick={() => handleNavigation(`/${btn.toLowerCase()}`)}
                    >
                        {btn}
                    </button>
                ))}
            </div>

            <div className={styles.separator}></div>

            <div className={styles["butoane-masini"]}>
                <p>Choose Transport</p>
                <button className={styles.transport} onClick={() => handleNavigation("/Cars")}>
                    <i className="fa-solid fa-car"></i> Car
                </button>

                {transportTypes.map((type) => (
                    <React.Fragment key={type}>
                        <button
                            className={styles.transport}
                            onClick={() => toggleDropdown(type)}
                        >
                            <i className={`fa-solid fa-${type === "tram" ? "train-tram" : "bus"}`}></i> {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                        <div
                            className={`${styles.dropdownContent} ${dropdownVisibility[type] ? styles.showDropdown : ""}`}
                        >
                            <select
                                id={`${type}Select`}
                                className={styles["city-select"]}
                                onChange={() => handleTransportSelection(type)}
                            >
                                <option value="none">Select a city</option>
                                {cities[type].map((city) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            <div className={styles.articole}>
                <div className={styles["img-telefon"]}>
                    <img src={telefon} alt="Phone" className={styles.telefon} />
                </div>
                <div className={styles["articole-inner"]}>
                    {latestArticles.slice(0, 1).map((article, index) => (
                    <div className={styles.combinatie} onClick={() => handleArticleClick(article.id)}>
                        <p className={styles.lc}>Latest Article</p>
                        <p className={styles.tc}>{article.title}</p>
                        <p className={styles.rc}>
                            {truncateContent(article.description)}
                        </p>
                        <p className={styles.rc}>Author: {article.author?.username}</p>
                        <p>{formatDate(article.created_at)}</p>
                    </div>
                    ))}
                    <div className={styles.combinatie}>
                        <p className={styles.lc}>Latest Report</p>
                        <p className={styles.tc}></p>
                        <p className={styles.rc}>
                            Lorem ipsum dolor sit amet consectetur adipisicing elit...
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.bottom}>
                <p>Plan your trip with ease and explore Romania like never before!</p>
            </div>
            <Footer />
        </div>
        </div>
    );
};

export default Index;
