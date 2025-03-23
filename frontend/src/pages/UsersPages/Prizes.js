import React, { useState, useEffect } from 'react';
import styles from '../../styles/UsersPages/prizes.module.css';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
const Prizes = () => {
    const [user, setUser] = useState({
        points: 1500,
        tier: 'Silver',
        nextPrize: 'Exclusive Webinar',
    });

    const [leaderboard, setLeaderboard] = useState([
        { rank: 1, user: 'JohnDoe', points: 5000 },
        { rank: 2, user: 'JaneSmith', points: 4500 },
        { rank: 3, user: 'MarkZ', points: 4200 },
    ]);

    const [currentXP, setCurrentXP] = useState(1200);
    const [nextXP] = useState(2000); // XP required for next level
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Update Progress Bar
        const progressBar = document.getElementById("progress-bar");
        progressBar.style.width = `${(user.points / 5000) * 100}%`; // Example: Max 5000 points

        // Update XP Progress Bar
        updateXPBar();

    }, [user.points, currentXP]);

    const updateXPBar = () => {
        const progressPercent = (currentXP / nextXP) * 100;
        document.getElementById('xpProgress').style.width = `${progressPercent}%`;
        document.getElementById('currentXP').textContent = currentXP;
        document.getElementById('nextXP').textContent = nextXP;
    };

    const toggleTierList = () => {
        const tierList = document.getElementById("tierList");
        tierList.style.display = (tierList.style.display === "none" || tierList.style.display === "") ? "block" : "none";
    };

    const handleUnlockPrize = (pointsRequired, prize) => {
        if (user.points >= pointsRequired) {
            showModal(`You've unlocked: ${prize}`);
            setUser(prevState => ({
                ...prevState,
                points: prevState.points - pointsRequired,
            }));
        } else {
            showModal("You don't have enough points!");
        }
    };

    const showModal = (message) => {
        let modal = document.getElementById("reward-details-modal");
        let rewardDetails = document.getElementById("reward-details");
        rewardDetails.innerText = message;
        modal.style.display = "flex"; // Ensure modal is visible
    };

    const closeModal = () => {
        document.getElementById("reward-details-modal").style.display = "none";
    };

    return (
        <div>
            {/* Main Header */}
            <div class={styles['navbarAdjust']}>
                <Navbar />
            </div>
            <div className={styles.header}>
                <h1>Epic Points & Rewards</h1>
            </div>

            {/* Main Content */}
            <div className={styles['main']}>
                {/* User Stats Section */}
                <section id="user-stats" className={`${styles["section"]} ${styles["dark-mode"]}`}>
                    <div className={styles["stats-container"]}>
                        {/* Total Points */}
                        <div className={styles["stat"]}>
                            <h2>Total Points</h2>
                            <p id="user-points">{user.points}</p>
                            <div className={styles["progress-bar"]}>
                                <div id="progress-bar" className={styles["progress"]}></div>
                            </div>
                        </div>

                        {/* Current Tier */}
                        <div className={styles["stat"]}>
                            <h2>Current Tier</h2>
                            <p id="user-tier">{user.tier}</p>

                            {/* XP Progress Box */}
                            <div className={styles["xp-tier-container"]}>
                                <div className={styles["xp-display"]}>
                                    <p>XP: <span id="currentXP">{currentXP}</span> / <span id="nextXP">{nextXP}</span></p>
                                    <div className={styles["xp-progress-container"]}>
                                        <div className={styles["xp-progress"]} id="xpProgress"></div>
                                    </div>
                                    <button className={styles["tier-btn"]} onClick={toggleTierList}>View Tiers</button>
                                </div>

                                <div className={styles["tier-list"]} id="tierList">
                                    <h3>Tier Levels</h3>
                                    <ul>
                                        <li>Bronze - 0 XP</li>
                                        <li>Silver - 1000 XP</li>
                                        <li>Gold - 2000 XP</li>
                                        <li>Platinum - 3500 XP</li>
                                        <li>Diamond - 5500 XP</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Next Prize */}
                        <div className={styles["stat"]}>
                            <h2>Next Prize</h2>
                            <p id="next-prize">{user.nextPrize}</p>
                        </div>
                    </div>
                </section>

                {/* Rewards Section */}
                <section id="rewards" className={styles["section"]}>
                    <button id="claim-prize" className={styles["cta-btn"]}>Claim Prize</button>
                    <div className={styles["rewards-container"]}>
                        {/* Rewards dynamically loaded */}
                        <div className={styles["reward"]} data-points="100">
                            <h3>Stickers & Emojis</h3>
                            <p className={styles["eu"]}>Unlock fun digital stickers for your profile.</p>
                            <button className={styles["unlock-btn"]} onClick={() => handleUnlockPrize(100, 'Stickers & Emojis')}>Unlock (100 points)</button>
                        </div>
                        <div className={styles["reward"]} data-points="500">
                            <h3>5% Discount</h3>
                            <p className={styles["eu"]}>Get 5% off your next purchase.</p>
                            <button className={styles["unlock-btn"]} onClick={() => handleUnlockPrize(500, '5% Discount')}>Unlock (500 points)</button>
                        </div>
                        <div className={styles["reward"]} data-points="1500">
                            <h3>Exclusive Webinar</h3>
                            <p className={styles["eu"]}>Access an exclusive webinar with industry experts.</p>
                            <button className={styles["unlock-btn"]} onClick={() => handleUnlockPrize(1500, 'Exclusive Webinar')}>Unlock (1500 points)</button>
                        </div>
                    </div>
                </section>

                {/* Leaderboard Section */}
                <div id="leaderboard" className={styles["leaderboard"]}>
                    <h2>🏆 <b>Leaderboard</b></h2>
                    <div className={styles["leaderboard-container"]}>
                        <table>
                            <thead>
                            <tr>
                                <th>RANK</th>
                                <th>PLAYER</th>
                                <th>AVATAR</th>
                                <th>POINTS</th>
                                <th>LAST ACTIVITY</th>
                            </tr>
                            </thead>
                            <tbody>
                            {leaderboard.map((entry, index) => (
                                <tr key={index} className={entry.rank === 1 ? styles["top-player"] : ""}>
                                    <td>{entry.rank}</td>
                                    <td>{entry.user}</td>
                                    <td><img src="/logo.jpg" alt="Avatar" /></td>
                                    <td>{entry.points}</td>
                                    <td>10 min ago</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Dialog for Prize Details */}
            <div id="reward-details-modal" className={styles["modal"]}>
                <div className={styles["modal-content"]}>
                    <h3>Reward Details</h3>
                    <p id="reward-details"></p>
                    <button id="close-modal" className={styles["cta-btn"]} onClick={closeModal}>Close</button>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Prizes;
