import React, { useState } from 'react';
import axios from 'axios';
import styles from '../../styles/UsersPages/AiChat.module.css';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const AiChat = () => {
    const [userMessage, setUserMessage] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handle sending message to the AI
    const sendMessage = async () => {
        if (!userMessage.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:8000/api/ai-chat/', {
                message: userMessage,
            });
            setAiResponse(response.data.response);
        } catch (err) {
            if (err.response && err.response.data.error) {
                setError(err.response.data.error); // Show the correct error message
            } else {
                setError('Failed to connect to the AI service.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Function to format the AI response into HTML
    const formatResponse = (response) => {
        // This function replaces newlines with <br /> for proper line breaks and formats some key content with HTML tags
        return response
            .replace(/###/g, '<h3>')
            .replace(/####/g, '<h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // bold text
            .replace(/`(.*?)`/g, '<code>$1</code>')  // code format
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>') // links
            .replace(/\n/g, '<br />'); // newlines as breaks
    };

    return (
        <div>
            <div className={styles.navbarAdjust}>
                <Navbar />
            </div>
        <div className={styles.container}>
            <h1 className={styles.header}>AI Chat</h1>

            <div className={styles.chatBox}>
                <div className={styles.messages}>
                    {!aiResponse && (
                        <div className={styles.aiMessage}>
                            🤖 You can ask me about traffic routes, best travel options, and more!
                        </div>
                    )}
                    {aiResponse && (
                        <div
                            className={styles.aiMessage}
                            dangerouslySetInnerHTML={{ __html: formatResponse(aiResponse) }}
                        />
                    )}
                </div>


                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        placeholder="Ask me anything..."
                        className={styles.input}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading}
                        className={styles.sendButton}
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}
            </div>
        </div>
            <Footer />
        </div>
    );
};

export default AiChat;
