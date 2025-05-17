import { useState, useEffect } from "react";
import styles from "../../styles/UsersPages/VirtualAssistant.module.css";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const SANDBOX_NUMBER = "+14155238886"; // Twilio sandbox number
const JOIN_CODE = "join tent-air"; // Twilio join code

export default function WhatsAppMessageSender() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [message, setMessage] = useState("Hello from RoutePulse!");
    const [error, setError] = useState(null);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        setJoined(localStorage.getItem("whatsappSandboxJoined") === "true");
    }, []);
    const handleJoin = () => {
        const url = `https://wa.me/${SANDBOX_NUMBER.replace("+", "")}?text=${encodeURIComponent(JOIN_CODE)}`;
        window.open(url, "_blank");
        localStorage.setItem("whatsappSandboxJoined", "true");
        setJoined(true);
    };

    const sendMessage = async () => {
        setError(null);

        if (!joined) {
            setError("🚨 You must join the WhatsApp sandbox first!");
            return;
        }

        if (!phoneNumber.trim()) {
            setError("🚨 Please enter a phone number.");
            return;
        }

        const normalized = phoneNumber.startsWith("0")
            ? "+40" + phoneNumber.slice(1)
            : phoneNumber;

        try {
            const res = await fetch("http://localhost:8000/api/send-whatsapp/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: `whatsapp:${normalized}`,
                    message,
                }),
            });

            if (!res.ok) {
                const { error: msg } = await res.json();
                throw new Error(msg || "Unknown error");
            }

            alert("✅ Message sent!");
            setMessage("");
        } catch (err) {
            const txt = err.message || String(err);
            if (txt.includes("not a valid phone number")) {
                setError("⚠️ That number hasn’t joined the sandbox yet.");
            } else {
                setError("⚠️ " + txt);
            }
        }
    };

    return (
        <div>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>

            <div className={styles.container}>
                <h2 className={styles.title}>WhatsApp Sandbox Sender</h2>

                {!joined && (
                    <div className={styles.joinNotice}>
                        <p>To receive messages, you must first join our WhatsApp sandbox:</p>
                        <button onClick={handleJoin} className={styles.joinButton}>
                            Join WhatsApp Sandbox
                        </button>
                    </div>
                )}
                <div className={styles.history}>
                    Your history is always saved on your phone.
                </div>
                <input
                    type="text"
                    placeholder="e.g. 0756456345"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!joined}
                    className={styles.input}
                />

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={!joined}
                    className={styles.textarea}
                />

                <button
                    onClick={sendMessage}
                    disabled={!joined || !phoneNumber.trim()}
                    className={styles.sendButton}
                >
                    {joined ? "Send Message" : "Join Sandbox First"}
                </button>

                {error && (
                    <div className={styles.error}>
                        <p>{error}</p>
                    </div>
                )}
            </div>

            <div className={styles.footerWrap}>
                <Footer />
            </div>
        </div>
    );
}