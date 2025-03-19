import React from "react";
import styles from "../../styles/PostsPages/articles.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
const Article = () => {
    return (
        <div className={styles.bodyContainer}>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <div className={styles["main-container"]}>
                <div className={styles.another}>
                    <header className={styles["news-bar"]}>
                        <span className={styles["news-update"]}>News Update:</span>
                        <div className={styles["marquee-container"]}>
                            <div className={styles.marquee}>This is a scrolling textThis is a scrolling textThis is a scrolling textThis is a scrolling textThis is a scrolling text</div>
                        </div>
                    </header>
                </div>

                <div className={styles.wholeContaining}>
                <div className={styles.main}>
                    <div className={styles.stanga}>
                        <img src="logo.jpg" alt="Logo" className={styles.mare} />
                    </div>

                    <div className={styles.dreapta}>
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className={`${styles.stire} ${styles.unu}`}>
                                <div className={styles.smallimg}>
                                    <img src="logo.jpg" alt="News" className={styles.ferrari} />
                                </div>
                                <div className={styles.content}>
                                    <div className={styles.sus}>
                                        <div className={styles.profil}>
                                            <img src="sturbucks.jpg" alt="Profile" className={styles.cafea} />
                                        </div>
                                        <div className={styles.titlu}>CNN News</div>
                                        <div className={styles.timing}>• 1 hour ago</div>
                                    </div>
                                    <div className={styles.mijloc}>
                                        <div className={styles.context}>Sample News Content</div>
                                    </div>
                                    <div className={styles.jos}>
                                        <div className={styles.category}>Category</div>
                                        <div className={styles.timing}>• 2 min ago</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.ceva}>
                    <div className={styles.top}>
                        <div className={styles.logo}>
                            <img src="sturbucks.jpg" alt="Logo" className={styles.stur} />
                        </div>
                        <div className={styles.name}>BBC News</div>
                        <div className={styles.time}>• 10 mins ago</div>
                    </div>

                    <div className={styles.middle}>
                        <div className={styles.title}>
                            People spend night on roofs in trees after Ukraine dam breach
                        </div>
                    </div>

                    <div className={styles.bottom}>
                        <div className={styles.description}>
                            Hundreds of thousands of people have been left without access to normal drinking water since the breach of the Kakhovka dam, Ukraine's President Volodymyr Zelensky has said.
                            <span className={styles["citeste-ma"]}>Read More</span>
                        </div>

                        <div className={styles.data}>
                            <div className={styles.date}>Aug 03, 2023</div>
                            <div className={styles.nothing}>&lt; &gt;</div>
                        </div>
                    </div>
                </div>
                </div>
                <div className={styles["lastest-news"]}>
                    <h1>Latest News</h1>
                    <div className={styles.aia}>
                        {[...Array(3)].map((_, index) => (
                            <div key={index} className={styles.one}>
                                <div className={styles.img}>
                                    <img src="logo.jpg" alt="News" className={styles.aoleu} />
                                </div>
                                <div className={styles.sus1}>
                                    <div className={styles.profil}>
                                        <img src="sturbucks.jpg" alt="Profile" className={styles.cafea} />
                                    </div>
                                    <div className={styles.titlu}>CNN News</div>
                                    <div className={styles.timing}>• 1 hour ago</div>
                                </div>
                                <div className={styles.scris}>Sample Latest News</div>
                                <div className={styles["maimult-scris"]}>Detailed news content...</div>
                                <div className={styles.jos1}>
                                    <div className={styles.category}>Category</div>
                                    <div className={styles.timing}>• 2 min ago</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles["hot-news"]}>
                    <div className={styles.acolo}>
                        <h1>Hot News</h1>
                    </div>

                    <div className={styles.aia}>
                        {[...Array(3)].map((_, index) => (
                            <div
                                key={index}
                                className={
                                    index === 0
                                        ? styles.one
                                        : index === 1
                                            ? styles.two
                                            : styles.three
                                }
                            >
                                <div className={styles.img}>
                                    <img src="logo.jpg" alt="News" className={styles.aoleu} />
                                </div>
                                <div className={styles.sus1}>
                                    <div className={styles.profil}>
                                        <img src="sturbucks.jpg" alt="Profile" className={styles.cafea} />
                                    </div>
                                    <div className={styles.titlu}>CNN News</div>
                                    <div className={styles.timing}>• 1 hour ago</div>
                                </div>
                                <div className={styles.scris}>Hot news content...</div>
                                <div className={styles["maimult-scris"]}>
                                    Detailed hot news content...
                                </div>
                                <div className={styles.jos1}>
                                    <div className={styles.category}>Category</div>
                                    <div className={styles.timing}>• 2 min ago</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Footer />
            </div>
        </div>
    );
};

export default Article;
