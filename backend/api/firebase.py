import firebase_admin
from firebase_admin import credentials, messaging

# Initialize Firebase Admin SDK with your service account credentials
try:
    cred = credentials.Certificate('C:/Proiect/backend/firebase-private-key.json')
    firebase_admin.initialize_app(cred)
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")


def send_push_notification(token, title, body):
    """
    Send a push notification to a specific device using its token.
    """
    try:
        # Prepare the message
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=token,
        )

        # Send the message to Firebase
        response = messaging.send(message)
        print(f'Successfully sent message: {response}')
    except messaging.FirebaseError as e:
        print(f'Firebase error occurred while sending message: {e}')
    except Exception as e:
        print(f'Unexpected error occurred while sending message: {e}')


def subscribe_token_to_topic(token, topic="allUsers"):
    """
    Subscribe a user's token to a topic to allow sending notifications to all subscribers.
    """
    try:
        # Subscribe the token to the specified topic
        response = messaging.subscribe_to_topic([token], topic)
        print(f'Successfully subscribed token to topic: {response}')
        return response
    except messaging.FirebaseError as e:
        print(f'Firebase error occurred while subscribing token: {e}')
    except Exception as e:
        print(f'Unexpected error occurred while subscribing token: {e}')
    return None
