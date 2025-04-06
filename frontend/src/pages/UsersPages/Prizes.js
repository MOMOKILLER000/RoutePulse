import React, { useState, useEffect } from 'react';
import styles from '../../styles/UsersPages/prizes.module.css';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loading from "../../components/Loading";
const Prizes = () => {
    const [user, setUser] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentXP, setCurrentXP] = useState(1200);
    const [nextXP, setNextXP] = useState(0); // XP required for next level


    const getTierFromPoints = (points) => {
        if (points >= 5500) return 'Diamond';
        if (points >= 3500) return 'Platinum';
        if (points >= 2000) return 'Gold';
        if (points >= 1000) return 'Silver';
        return 'Bronze';
    };

    const getNextXP = (tier) => {
        switch (tier) {
            case 'Bronze': return 1000;
            case 'Silver': return 2000;
            case 'Gold': return 3500;
            case 'Platinum': return 5500;
            case 'Diamond': return 10000; // Max level
            default: return 0;
        }
    };

    useEffect(() => {
        fetch(`http://localhost:8000/api/user/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                console.log("User Data:", data); // Debugging

                const tier = getTierFromPoints(data.total_points);
                setUser({
                    ...data,
                    tier, // Update user with the calculated tier
                });
            })
            .catch(error => console.error("Error fetching user data:", error));
    }, []);

    useEffect(() => {
        fetch(`http://localhost:8000/api/leaderboard/`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                console.log("Leaderboard:", data); // Debugging

                setLeaderboard(data);
            })
            .catch(error => console.error("Error fetching user data:", error));
    }, []);

    useEffect(() => {
        if (user) {

            const progressBar = document.getElementById("progress-bar");
            progressBar.style.width = `${(user.points / 10000) * 100}%`; // Example: Max 5000 points


            updateXPBar();
        }
    }, [user]);

    const updateXPBar = () => {
        setCurrentXP(user.total_points);
        setNextXP(getNextXP(user.tier));
        const progressPercent = (currentXP / nextXP) * 100;
        document.getElementById('xpProgress').style.width = `${progressPercent}%`;
        document.getElementById('currentXP').textContent = currentXP;
        document.getElementById('nextXP').textContent = nextXP;
    };

    const toggleTierList = () => {
        const tierList = document.getElementById("tierList");
        tierList.style.display = (tierList.style.display === "none" || tierList.style.display === "") ? "block" : "none";
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

    function getTierClass(tier) {
        switch(tier) {
            case 'Bronze':
                return { backgroundColor: '#cd7f32' }; // Bronze background
            case 'Silver':
                return { backgroundColor: '#9a9494' }; // Silver background
            case 'Gold':
                return { backgroundColor: 'gold' }; // Gold background
            case 'Platinum':
                return { backgroundColor: '#a58dcf' }; // Platinum background
            case 'Diamond':
                return { backgroundColor: '#b9f2ff' }; // Diamond background
            default:
                return {};
        }
    }

    const handleUnlockPrize = (pointsRequired, prizeNumber) => {
        if (user && user.points >= pointsRequired) {
            // Call the backend to claim the prize
            fetch(`http://localhost:8000/api/claim_reward/${user.id}/${prizeNumber}/`, {
                method: 'POST',
                credentials: 'include',
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        showModal(data.message);
                        // Update the user state to reflect the claimed prize
                        setUser(prevState => {
                            const updatedUser = { ...prevState };
                            if (prizeNumber === 1) updatedUser.prize1 = true;
                            if (prizeNumber === 2) updatedUser.prize2 = true;
                            if (prizeNumber === 3) updatedUser.prize3 = true;
                            return updatedUser;
                        });
                    }
                })
                .catch(error => {
                    console.error('Error claiming prize:', error);
                    showModal("There was an error claiming your reward. Please try again.");
                });
        } else {
            showModal("You don't have enough points!");
        }
    };

    if (!user) {
        return <Loading />
    }

    return (
        <div>
            {/* Main Header */}
            <div className={styles['navbarAdjust']}>
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
                            <h2>Available points</h2>
                            <p id="user-points">{user.points}</p>
                            <div className={styles["progress-bar"]}>
                                <div id="progress-bar" className={styles["progress"]}></div>
                            </div>
                        </div>

                        {/* Current Tier */}
                        <div className={styles["stat"]}>
                            <h2 className={styles.total}>Total XP</h2>
                            <p id="user-tier"></p>
                            {/* XP Progress Box */}
                            <div className={styles["xp-tier-container"]}>
                                <div className={styles["xp-display"]}>
                                    <p>XP: <span id="currentXP">{currentXP}</span> / <span id="nextXP">{nextXP}</span></p>
                                    <div className={styles["xp-progress-container"]}>
                                        <div className={styles["xp-progress"]} id="xpProgress"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className={`${styles["stat"]}`}
                            style={getTierClass(user.tier)} // Apply inline style based on tier
                        >
                            <h2 className={styles.curent}>Current Tier</h2>
                            <p>{user.tier}</p>
                            <button className={styles["tier-btn"]} onClick={toggleTierList}>View Tiers</button>
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
                </section>

                {/* Rewards Section */}
                <section id="rewards" className={styles["section"]}>
                    <div className={styles["rewards-container"]}>
                        {/* Rewards dynamically loaded */}
                        <div className={styles["reward"]} data-points="100">
                            <h3>Premium Profile Image</h3>
                            <p className={styles["eu"]}>Unlock a premium default image for your profile.</p>
                            {user && !user.prize1 ? (
                                <button
                                    className={styles["unlock-btn"]}
                                    onClick={() => handleUnlockPrize(1000, 1)} // Pass prize number 1
                                >
                                    Unlock (1000 points)
                                </button>
                            ) : (
                                <button className={styles["unlock-btn"]}>Reward already claimed</button> // Show this message if the prize has been claimed
                            )}
                        </div>

                        <div className={styles["reward"]} data-points="500">
                            <h3>Personalized Footer</h3>
                            <p className={styles["eu"]}>Unlock a personalized footer just for you.</p>
                            {user && !user.prize2 ? (
                                <button
                                    className={styles["unlock-btn"]}
                                    onClick={() => handleUnlockPrize(2500, 2)} // Pass prize number 2
                                >
                                    Unlock (2500 points)
                                </button>
                            ) : (
                                <button className={styles["unlock-btn"]}>Reward already claimed</button> // Show this message if the prize has been claimed
                            )}
                        </div>

                        <div className={styles["reward"]} data-points="1500">
                            <h3>Personal AI Assistant</h3>
                            <p className={styles["eu"]}>Unlock access to a personal AI assistant tailored to your needs.</p>
                            {user && !user.prize3 ? (
                                <button
                                    className={styles["unlock-btn"]}
                                    onClick={() => handleUnlockPrize(5000, 3)} // Pass prize number 3
                                >
                                    Unlock (5000 points)
                                </button>
                            ) : (
                                <button className={styles["unlock-btn"]}>Reward already claimed</button> // Show this message if the prize has been claimed
                            )}
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
                                <th className={styles.rank}>RANK</th>
                                <th className={styles.player}>PLAYER</th>
                                <th className={styles.avatar}>AVATAR</th>
                                <th className={styles.points}>POINTS</th>
                                <th className={styles.routes}>TOTAL ROUTES</th>
                            </tr>
                            </thead>
                            <tbody>
                            {leaderboard.map((entry, index) => (
                                <tr key={index} className={entry.rank === 1 ? styles["top-player"] : ""}>
                                    <td className={styles.rank}>{entry.rank}</td>
                                    <td className={styles.player}>{entry.username}</td>
                                    <td className={styles.avatar}>
                                        <img
                                            src={entry.image && entry.image !== "./default.jpg" ? entry.image : (entry.prize1 ? "./premium.jpg" : "./default.jpg")}
                                            alt="Avatar"
                                            className={styles.avatarImg}
                                        />
                                    </td>
                                    <td className={styles.points}>{entry.total_points}</td>
                                    <td className={styles.routes}>{entry.total_routes}</td>
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
