import React, { useEffect, useState } from 'react';
import styles from "../../styles/PostsPages/articleDetail.module.css";
import {useNavigate, useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loading from "../../components/Loading";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp, faThumbsDown } from "@fortawesome/free-solid-svg-icons";

const ArticleDetail = () => {
    const [newComment, setNewComment] = useState('');
    const { id } = useParams();  // Extract the article id from the URL parameters
    const [user, setUser] = useState(null);
    const [article, setArticle] = useState(null);
    const backendUrl = "http://localhost:8000"; // Your backend base URL
    const [comments, setComments] = useState([]);  // Store comments
    const [randomArticles, setRandomArticles] = useState([]);
    const navigate = useNavigate();
    const [userLiked, setUserLiked] = useState(false);
    const [userDisliked, setUserDisliked] = useState(false);

    useEffect(() => {
        fetch(`${backendUrl}/api/user/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                console.log("User Data:", data); // Debugging
                setUser(data);
            })
            .catch(error => console.error("Error fetching user data:", error));

        fetch(`${backendUrl}/api/random_articles/`)
            .then(response => response.json())
            .then(data => setRandomArticles(data))
            .catch(error => console.error("Error fetching random articles:", error));
    }, []);


    const formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("en-US", options);
    };


    useEffect(() => {
        fetch(`${backendUrl}/api/article/${id}/`)
            .then((response) => response.json())
            .then((data) => setArticle(data))
            .catch((error) => console.error("Error fetching article details:", error));

        fetchComments();  // ✅ Fetch comments when the page loads
    }, [id]);

    const fetchComments = () => {
        fetch(`${backendUrl}/api/article/comments/${id}/`)
            .then((response) => response.json())
            .then((data) => {
                console.log("Fixed comments data:", data.comments); // Debugging
                setComments(data.comments); // ✅ Extract the array from the object
            })
            .catch((error) => console.error("Error fetching comments:", error));
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await fetch(`${backendUrl}/api/submit_comment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),  // Include CSRF token if needed
                },
                body: JSON.stringify({
                    articleId: id,  // Send only the article ID
                    content: newComment,
                }),
                credentials: 'include',  // Ensures cookies (session authentication) are sent
            });

            if (!response.ok) throw new Error('Failed to submit comment');

            setNewComment('');  // Clear input field
            fetchComments();  // Refresh comments
        } catch (error) {
            console.error("Error submitting comment:", error);
        }
    };


    const getCsrfToken = () => {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    };

    const [commentToDelete, setCommentToDelete] = useState(null);

    const confirmDeleteComment = (commentId) => {
        setCommentToDelete(commentId);
    };

    const cancelDelete = () => {
        setCommentToDelete(null);
    };

    const handleDeleteComment = async () => {
        if (!commentToDelete) return;

        try {
            const response = await fetch(`${backendUrl}/api/delete_comment/${commentToDelete}/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(), // Include CSRF token if needed
                },
                credentials: 'include', // Send session cookies for authentication
            });

            if (!response.ok) {

                const errorData = await response.json();
                console.error("Error deleting comment:", errorData.error);
                return;
            }

            const data = await response.json();
            console.log(data.message); // Success message


            setComments((prevComments) => prevComments.filter((c) => c.id !== commentToDelete));
        } catch (error) {
            console.error("Error deleting comment:", error);
        } finally {
            setCommentToDelete(null); // Reset the state
        }
    };
    useEffect(() => {
        const handleScroll = () => {

            const threshold = 90; // initial offset (e.g., navbar height)
            const newOffset = 35;
            const sidebars = document.querySelectorAll(`.${styles.sidebar}`);
            sidebars.forEach((sidebar) => {
                if (window.scrollY > threshold) {
                    sidebar.style.top = `${newOffset}px`;
                } else {
                    sidebar.style.top = `${threshold}px`;
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [styles.sidebar]);

    const handleImageError = (e) => {
        e.target.src = "/logo.jpg"; // Fallback image if error occurs
    };

    const getImageUrl = (imagePath) => {
        return imagePath ? `${backendUrl}${imagePath}` : "logo.jpg"; // Prepend the backend URL
    };


    const splitContent = (content) => {

        const paragraphs = content.split("\n\n");
        return paragraphs.map((para, index) => (
            <p key={index}>
                {para.split("\n").map((line, i) => (
                    <React.Fragment key={i}>
                        {line}
                        {i !== para.split("\n").length - 1 && <br />}
                    </React.Fragment>
                ))}
            </p>
        ));
    };
    const handleArticleClick = (id) => {
        if (id) {
            navigate(`/article/${id}`); // Navigate to article detail page
        } else {
            console.error("Article ID is missing");
        }
    };
    const handleLikeDislike = async (action) => {
        try {
            const response = await fetch(`${backendUrl}/api/update_popularity/${id}/${action}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),  // CSRF protection
                },
                credentials: "include",  // Include cookies for authentication
            });

            if (!response.ok) throw new Error("Failed to update popularity");

            const data = await response.json();
            setArticle((prev) => ({ ...prev, popularity: data.popularity })); // Update UI
        } catch (error) {
            console.error("Error updating popularity:", error);
        }
    };

    const [bestUser, setBestUser] = useState(null);

    useEffect(() => {
        fetch(`${backendUrl}/api/most_popular_user/`)
            .then(response => response.json())
            .then(data => {
                if (data.username) {
                    setBestUser(data);
                    console.log('Best user fetched:', data);
                } else {
                    console.error('No best user found');
                }
            })
            .catch(error => console.error("Error fetching most popular user:", error));
    }, []);

    if (!article) {
        return <Loading />
    }

    return (
        <div className={styles['bodyContainer']}>
            {commentToDelete && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>Are you sure you want to delete this comment?</h3>
                        <div className={styles.modalButtons}>
                            <button onClick={handleDeleteComment} className={styles.confirmBtn}>Delete</button>
                            <button onClick={cancelDelete} className={styles.cancelBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>
        <div className={styles.container}>
            {/* Left Sidebar: Other Articles with Images */}
            <div className={`${styles.sidebar} ${styles.left}`}>
                <div className={styles['sidebar-title']}>Other Articles</div>
                {randomArticles.slice(0, 2).map((randArt, index) => (
                <div className={styles['sidebar-content']} onClick={() => handleArticleClick(randArt.id)}>
                    <div className={styles.article}>
                        <img
                            src={getImageUrl(randArt.image)} // Use backend URL for images
                            alt="News"
                            className={styles['article-img']}
                            onError={handleImageError}  // Handle image error for fallback
                        />
                        <p>{randArt.title}</p>
                    </div>
                </div>
                ))}
                {/* Featured Section */}
                <div className={styles['sidebar-featured']}>
                    <h3>Featured Author of the Month</h3>
                    {bestUser ? (
                        <>
                            <img src={getImageUrl(bestUser.profile_image)} alt={bestUser.username} className={styles["featured-img"]} />
                            <p className={styles.nume}>{bestUser.username}</p>
                        </>
                    ) : (
                        <p>No featured photographer available.</p>
                    )}
                </div>
            </div>


            {/* Middle Content */}
            <div className={styles.middle}>
                <img
                    src={getImageUrl(article.image)} // Use backend URL for images
                    alt="News"
                    className={styles.ziar}
                    onError={handleImageError}  // Handle image error for fallback
                />
                <div className={styles.overlay}>
                    <h1 className={styles.titlu}>{article.title}</h1>
                    <p>Author: {article.author.username || "Unknown"}</p>
                    <div className={styles.timing}>{formatDate(article.created_at)}</div>

                    {/* Like & Dislike Buttons */}
                    <div className={styles.likeDislikeContainer}>
                        <button
                            className={`${styles.likeBtn} ${userLiked ? styles.active : ""}`}
                            onClick={() => handleLikeDislike("like")}
                        >
                            <FontAwesomeIcon icon={faThumbsUp} />
                        </button>
                        <span>{article.popularity}</span> {/* Show popularity count */}
                        <button
                            className={`${styles.dislikeBtn} ${userDisliked ? styles.active : ""}`}
                            onClick={() => handleLikeDislike("dislike")}
                        >
                            <FontAwesomeIcon icon={faThumbsDown} />
                        </button>
                    </div>
                </div>

                <div className={styles.contentWrapper}> {/* Added wrapper */}
                    <div className={styles.description}>
                        <h5>{article.description}</h5>
                    </div>
                    <div className={styles.content}>
                        {/* Dynamically render content */}
                        {splitContent(article.content)}
                    </div>
                </div>
            </div>


            {/* Right Sidebar: Comments Section */}
            <div className={`${styles.sidebar} ${styles.right}`}>
                <div className={styles['comments-title']}>User Comments</div>
                <div className={styles['comments-list']}>
                    {comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className={styles.comment}>
                                <p><strong>{comment.author}:</strong> {comment.content}</p>
                                <small>{comment.comment}</small>
                                {/* Delete button only if the user is the author or a superuser */}
                                {user && (user.id === comment.user_id || user.is_superuser) && (
                                    <button className={styles.deleteBtn} onClick={() => confirmDeleteComment(comment.id)} >🗑️</button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className={styles.nimic}>No comments yet.</p>
                    )}
                </div>
                <form onSubmit={handleCommentSubmit}>
                        <textarea
                            placeholder="Write a comment..."
                            rows="3"
                            required
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        ></textarea>
                    <button className={styles.button} type="submit">Submit Comment</button>
                </form>
            </div>
        </div>
        </div>
    );
};

export default ArticleDetail;
