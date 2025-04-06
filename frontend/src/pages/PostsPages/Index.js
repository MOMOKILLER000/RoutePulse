import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/PostsPages/index.module.css";
import Navbar from "../../components/Navbar";
import harta from "../../assets/harta.jpg";
import Footer from "../../components/Footer";
import Loading from "../../components/Loading";
const Index = () => {
    const [dropdownVisibility, setDropdownVisibility] = useState({
        tram: false,
        bus: false,
    });
    const navigate = useNavigate();
    const [latestArticles, setLatestArticles] = useState([]);
    const [latestReport, setLatestReport] = useState([]);
    const [user, setUser] = useState({});
    const [loading, setLoading] = useState(true); // New loading state

    useEffect(() => {
        fetch(`http://localhost:8000/api/user/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                console.log("User Data:", data); // Debugging
                setUser(data);
                setLoading(false); // Set loading to false after data is fetched
            })
            .catch(error => {
                console.error("Error fetching user data:", error);
                setLoading(false); // Set loading to false in case of error
            });
    }, []);

    useEffect(() => {
        fetch("http://localhost:8000/api/latest_articles/")
            .then((response) => response.json())
            .then((data) => {
                setLatestArticles(data);
            })
            .catch((error) => {
                console.error("Error fetching latest articles:", error);
                alert("Failed to fetch latest articles. Please try again later.");
            });

        fetch(`http://localhost:8000/api/reports/${1}`)
            .then((response) => response.json())
            .then((data) => {
                setLatestReport(data);
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
        const city = selectedCity.toLowerCase();
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
        tram: ["Iasi", "Cluj", "Timisoara"],
        bus: ["Iasi", "Cluj", "Timisoara", "Botosani"],
    };

    const handleArticleClick = (id) => {
        if (id) {
            navigate(`/article/${id}`); // Navigate to article detail page
        } else {
            console.error("Article ID is missing");
        }
    };

    const handleReportClick = (id) => {
        if (id) {
            navigate(`/report/${id}`); // Navigate to article detail page
        } else {
            console.error("Article ID is missing");
        }
    };

    const handleAdmin = () => {
        navigate(`/admin`);
    };

    // Show loading message while data is being fetched
    if (loading) {
        return <Loading />
    }

    return (
        <div className={styles["body"]}>
            <div className={styles["main-container"]}>
                <Navbar />
                <div className={styles.middle}>
                    {user && user.is_superuser && (
                        <div className={styles.two}>
                            <button className={styles.one} onClick={handleAdmin}>Go to Admin Dashboard</button>
                        </div>
                    )}
                    <img src={harta} alt="Map" className={styles.harta} />
                    <div className={styles["butoane-masini"]}>
                        <p>Choose Transport</p>
                        <button className={styles.transport} onClick={() => handleNavigation("/Cars")}>
                            <i className="fa-solid fa-car"></i> Car
                        </button>
                        <div className={styles['separator1']}></div>
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

                <div className={styles.articole}>
                    <div className={styles["img-telefon"]}>
                        <img src='./telefon.jpg' alt="Phone" className={styles.telefon} />
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
                                <p className={styles.rc}>{formatDate(article.created_at)}</p>
                            </div>
                        ))}
                        {latestReport.map((report, index) => (
                            <div className={styles.combinatie} onClick={() => handleReportClick(report.id)}>
                                <p className={styles.lc}>Latest Report</p>
                                <p className={styles.tc}>City:{report.city}</p>
                                <p className={styles.tc}>Street:{report.street}</p>
                                <p className={styles.rc}>
                                    {formatDate(report.date)}-{report.time}
                                </p>
                                <p className={styles.rc}> Problem Type: {report.problem_type}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Index;
