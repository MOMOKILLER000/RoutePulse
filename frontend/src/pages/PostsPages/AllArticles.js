import React, { useState, useEffect } from 'react';
import styles from "../../styles/PostsPages/AllArticles.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useNavigate } from "react-router-dom";

const AllArticles = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;
    const [articles, setArticles] = useState([]);
    const totalPages = Math.ceil(articles.length / itemsPerPage);
    const backendUrl = "http://localhost:8000";
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("en-US", options);
    };

    const renderArticles = () => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return articles.slice(start, end).map((article, index) => (
            <div className={styles.articleItem} key={article.id} onClick={() => handleArticleClick(article.id)}>
                <img src={getImageUrl(article.image)} alt={article.title} className={styles.articleImage} onError={handleImageError}/>
                <div className={styles.articleContent}>
                    <h2 className={styles.articleTitle}>{article.title}</h2>
                    <p className={styles.articleDescription}>{truncateContent(article.description)}</p>
                    <a className={styles.readMore} >Read more...</a>
                    <div className={styles.articleAuthor}>
                        {article.author.image && <img src={article.author?.image ? getImageUrl(article.author.image) : "starbucks.jpg"}
                                                      alt={article.author.username} className={styles.cafea} />}
                        <span className={styles.authorName}>{article.author.username}</span>
                    </div>
                    <div className={styles.articleDate}>{formatDate(article.created_at)}</div>
                </div>
            </div>
        ));
    };

    useEffect(() => {
        fetch("http://localhost:8000/api/all_articles/")
            .then((response) => response.json())
            .then((data) => {
                console.log("Random Articles:", data); // Debug: log data
                setArticles(data);
            })
            .catch((error) => {
                console.error("Error fetching random articles:", error);
                alert("Failed to fetch random articles. Please try again later.");
            });
    }, []);
    const handleImageError = (e) => {
        e.target.src = "logo.jpg"; // Fallback image if error occurs
    };

    const getImageUrl = (imagePath) => {
        return imagePath ? `${backendUrl}${imagePath}` : "logo.jpg"; // Prepend the backend URL
    };
    const truncateContent = (content, wordLimit = 10) => {
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

    const updatePageNumbers = () => {
        const pageNumbers = [];
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(
                <button
                    className={`${styles.pageNumber} ${currentPage === i ? styles.active : ''}`}
                    key={i}
                    onClick={() => setCurrentPage(i)}
                >
                    {i}
                </button>
            );
        }
        return pageNumbers;
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <main className={styles.main}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>All Articles</h2>
                    <div className={styles.articleGrid}>
                        {renderArticles()}
                    </div>
                    <div className={styles.pagination}>
                        <button
                            className={styles.paginationBtn}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Previous Page
                        </button>
                        <div className={styles.pageNumbers}>
                            {updatePageNumbers()}
                        </div>
                        <button
                            className={styles.paginationBtn}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Next Page
                        </button>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default AllArticles;
