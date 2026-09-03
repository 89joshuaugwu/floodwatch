import {getApp,getApps,initializeApp} from "firebase/app"; import {getAuth} from "firebase/auth"; import {getFirestore} from "firebase/firestore";
const config={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID};
export const firebaseApp=getApps().length?getApp():initializeApp(config);
export function getAuthClient(){if(!config.apiKey)throw new Error("Firebase is not configured. Add values to .env.local.");return getAuth(firebaseApp)}
export function getDbClient(){if(!config.apiKey)throw new Error("Firebase is not configured. Add values to .env.local.");return getFirestore(firebaseApp)}
