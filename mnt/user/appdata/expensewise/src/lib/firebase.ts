
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { firebaseConfig } from "./firebase-config";

// Initialize Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators if in development
if (process.env.NODE_ENV === 'development') {
    const host = process.env.DOCKER_ENV === 'true' ? 'firebase-emulators' : 'localhost';
    
    // Check if we're on the client-side before connecting
    if (typeof window !== 'undefined') {
        connectAuthEmulator(auth, `http://localhost:9099`, { disableWarnings: true });
        connectFirestoreEmulator(firestore, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
    } else {
        // This code runs on the server-side
        connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
        connectFirestoreEmulator(firestore, host, 8080);
        connectStorageEmulator(storage, host, 9199);
    }
}

export { app, auth, firestore, storage };
