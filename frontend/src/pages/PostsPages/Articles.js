import React, { useState, useEffect } from "react";
import styles from "../../styles/PostsPages/articles.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loading from "../../components/Loading";
import { useNavigate } from "react-router-dom";
const Article = () => {
    const [randomArticles, setRandomArticles] = useState([]);
    const [latestArticles, setLatestArticles] = useState([]);
    const [hotArticles, setHotArticles] = useState([]);
    const navigate = useNavigate();
    const backendUrl = "http://localhost:8000"; // Your backend base URL
    const [loading, setLoading] = useState(true); // Loading state
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:8000/api/user/`, {credentials: 'include'})
            .then(response => response.json())
            .then(data => {
                console.log("User Data:", data); // Debugging
                setUser(data);
            })
            .catch(error => console.error("Error fetching user data:", error));
    }, []);

    useEffect(() => {

        const fetchArticles = async () => {
            try {
                const randomResponse = await fetch("http://localhost:8000/api/random_articles/");
                const randomData = await randomResponse.json();
                setRandomArticles(randomData);

                const latestResponse = await fetch("http://localhost:8000/api/latest_articles/");
                const latestData = await latestResponse.json();
                setLatestArticles(latestData);

                const hotResponse = await fetch("http://localhost:8000/api/hot_articles/");
                const hotData = await hotResponse.json();
                setHotArticles(hotData);

                setLoading(false); // Set loading to false once all data is fetched
            } catch (error) {
                console.error("Error fetching articles:", error);
                alert("Failed to fetch articles. Please try again later.");
                setLoading(false); // Set loading to false even if there's an error
            }
        };

        fetchArticles();
    }, []);


    const handleImageError = (e) => {
        e.target.src = "logo.jpg"; // Fallback image if error occurs
    };

    const getImageUrl = (imagePath) => {
        return imagePath ? `${backendUrl}${imagePath}` : "logo.jpg"; // Prepend the backend URL
    };


    const formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("en-US", options);
    };


    const truncateContent = (content, wordLimit = 25) => {
        if (!content) return "";
        const words = content.split(" ");
        return words.length > wordLimit ? words.slice(0, wordLimit).join(" ") + "..." : content;
    };
    const handleArticleClick = (id) => {
        if (id) {
            navigate(`/article/${id}`); // Navigate to article detail page
        } else {
            console.error("Article ID is missing");
        }
    };
    const WriteArticle = () => {
        navigate('/ArticlePosting');
    }
    const AllArticles = () => {
        navigate('/AllArticles');
    }
    return (
        loading ? (
                <Loading /> // Add a loading message or spinner
            ) : (
        <div className={styles.bodyContainer}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <div className={styles["main-container"]}>
                <div className={styles.another}>
                    <header className={styles["news-bar"]}>
                        <span className={styles["news-update"]}>News Update:</span>
                        <div className={styles["marquee-container"]}>
                            <div className={styles.marquee}>
                            {randomArticles[0].description}
                            </div>
                        </div>
                    </header>
                </div>

                <div className={styles.wholeContaining}>
                    <div className={styles.main}>
                        <div className={styles.test}>
                        <div className={styles.stanga}>
                            {randomArticles.length > 0 ? (
                                <img
                                    src={getImageUrl(randomArticles[0].image)}
                                    alt="Article Image"
                                    className={styles.mare}
                                    onError={handleImageError}
                                />
                            ) : (
                                <img src="logo.jpg" alt="Fallback Image" className={styles.mare} />
                            )}
                        </div>

                        <div className={styles.ceva}>
                            {randomArticles.length > 0 ? (
                                <div onClick={() => handleArticleClick(randomArticles[0].id)}>
                                    <div className={styles.top}>
                                        <div className={styles.logo}>
                                            <img
                                                src={getImageUrl(randomArticles[0].author.image)} // Use backend URL for images
                                                alt="News"
                                                className={styles.stur}
                                                onError={handleImageError}  // Handle image error for fallback
                                            />
                                        </div>
                                        <div className={styles.name}>{randomArticles[0].author?.username}</div>
                                        <div className={styles.time}>• {formatDate(randomArticles[0].created_at)}</div>
                                    </div>

                                    <div className={styles.middle}>
                                        <div className={styles.title}>{randomArticles[0].title}</div>
                                    </div>

                                    <div className={styles.bottom}>
                                        <div className={styles.description}>
                                            {truncateContent(randomArticles[0].description, 30)}
                                            <span className={styles["citeste-ma"]}> Read More</span>
                                        </div>

                                        <div className={styles.data}>
                                            <div className={styles.date}>{formatDate(randomArticles[0].created_at)}</div>
                                            <div className={styles.nothing}>&lt; &gt;</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p>Loading featured article...</p>
                            )}
                        </div>
                        </div>
                        <div className={styles.dreapta}>
                            {randomArticles.length === 0 ? (
                                <p>Loading random articles...</p>
                            ) : (
                                randomArticles.map((article, index) => (
                                    <div
                                        key={index}
                                        className={`${styles.stire} ${styles.unu}`}
                                        onClick={() => handleArticleClick(article.id)} // Click handler for entire article
                                    >
                                        <div className={styles.smallimg}>
                                            <img
                                                src={getImageUrl(article.image)} // Use backend URL for images
                                                alt="News"
                                                className={styles.ferrari}
                                                onError={handleImageError} // Handle image error for fallback
                                            />
                                        </div>
                                        <div className={styles.content}>
                                            <div className={styles.sus}>
                                                <div className={styles.profil}>
                                                    <img
                                                        src={article.author?.image ? getImageUrl(article.author.image) : "starbucks.jpg"}
                                                        alt="Author Profile"
                                                        className={styles.cafea}
                                                        onError={handleImageError}
                                                    />
                                                </div>
                                                <div className={styles.titlu}>
                                                    {article.author?.username} {/* Access the username property */}
                                                </div>
                                                <div className={styles.timing}>• {formatDate(article.created_at)}</div>
                                            </div>
                                            <div className={styles.mijloc}>
                                                <div className={styles.context}>{article.title}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles["lastest-news"]}>
                    <h1>Latest News</h1>
                    <div className={styles.aia}>
                        {latestArticles.length === 0 ? (
                            <p>Loading latest articles...</p>
                        ) : (
                            latestArticles.map((article, index) => (
                                <div key={index} className={styles.one} onClick={() => handleArticleClick(article.id)}>
                                    <div className={styles.img}>
                                        <img
                                            src={getImageUrl(article.image)} // Use backend URL for images
                                            alt="News"
                                            className={styles.aoleu}
                                            onError={handleImageError}  // Handle image error for fallback
                                        />
                                    </div>
                                    <div className={styles.sus1}>
                                        <div className={styles.profil}>
                                            <img
                                                src={article.author?.image ? getImageUrl(article.author.image) : "starbucks.jpg"}
                                                alt="Author Profile"
                                                className={styles.cafea}
                                                onError={handleImageError}
                                            />
                                        </div>
                                        <div className={styles.titlu}>{article.author?.username}</div>
                                        <div className={styles.timing}>• {formatDate(article.created_at)}</div>
                                    </div>
                                    <div className={styles.scris}>{article.title}</div>
                                    <div className={styles["maimult-scris"]}>{truncateContent(article.description)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className={styles["hot-news"]}>
                    <div className={styles.acolo}>
                        <h1>Hot News</h1>
                    </div>

                    <div className={styles.aia}>
                        {hotArticles.length === 0 ? (
                            <p>Loading hot articles...</p>
                        ) : (
                            hotArticles.map((article, index) => (
                                <div
                                    key={index}
                                    className={
                                        index === 0 ? `${styles.one} ${styles.first}` : styles.one
                                    }
                                    onClick={() => handleArticleClick(article.id)} // Click handler for entire article
                                >
                                    <div className={styles.img}>
                                        <img
                                            src={getImageUrl(article.image)} // Use backend URL for images
                                            alt="News"
                                            className={styles.aoleu}
                                            onError={handleImageError}  // Handle image error for fallback
                                        />
                                    </div>
                                    <div className={styles.sus1}>
                                        <div className={styles.profil}>
                                            <img
                                                src={article.author?.image ? getImageUrl(article.author.image) : "starbucks.jpg"}
                                                alt="Author Profile"
                                                className={styles.cafea}
                                                onError={handleImageError}
                                            />
                                        </div>
                                        <div className={styles.titlu}>{article.author?.username}</div>
                                        <div className={styles.timing}>• {formatDate(article.created_at)}</div>
                                    </div>
                                    <div className={styles.scris}>{article.title}</div>
                                    <div className={styles["maimult-scris"]}>{truncateContent(article.description)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className={styles.nush}>
                    {user && user.is_superuser && (
                        <div>
                            <button className={styles.scrie} onClick={() => WriteArticle()}>Write Articles</button>
                        </div>
                    )}
                    <div>
                        <button className={styles.vezi} onClick={() => AllArticles()}>See all articles</button>
                    </div>
                </div>
            </div>
            <div className={styles.footerContainer}>
                <Footer />
            </div>
        </div>
            )
    );
};

export default Article;
