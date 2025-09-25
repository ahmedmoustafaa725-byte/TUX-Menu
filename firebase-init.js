import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqjdI3ZqFSVY_5Kmowak1DCOL5bZaCYoo",
  authDomain: "tux-menu.firebaseapp.com",
  projectId: "tux-menu",
  storageBucket: "tux-menu.firebasestorage.app",
  messagingSenderId: "326432857137",
  appId: "1:326432857137:web:926cc2ffb364b2f5d44910",
  measurementId: "G-1T1RRHCCDQ",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
