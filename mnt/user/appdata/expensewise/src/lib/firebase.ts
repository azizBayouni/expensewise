
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
    // When running inside a Docker container, the server-side code needs to use the service name.
    // The client-side code (in the browser) still needs to use localhost.
    const isServer = typeof window === 'undefined';
    const host = isServer && process.env.DOCKER_ENV ? 'firebase-emulators' : 'localhost';
    
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, host, 8080);
    connectStorageEmulator(storage, host, 9199);
}

export { app, auth, firestore, storage };

    