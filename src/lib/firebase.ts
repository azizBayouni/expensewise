
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { firebaseConfig } from "./firebase-config";

// This file is intended for server-side Firebase admin SDK initialization in the future.
// For now, it will just export the config.
// All client-side firebase logic should use firebase-client.ts

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);


if (process.env.NODE_ENV === 'development') {
    // Check if we are on the client side before connecting to emulators
    if (typeof window !== 'undefined') {
        connectAuthEmulator(auth, `http://localhost:9099`, { disableWarnings: true });
        connectFirestoreEmulator(firestore, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
    }
}


export { app, auth, firestore, storage };
