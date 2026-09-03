import admin from "firebase-admin";
if(!admin.apps.length){const key=process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g,"\n");const ready=process.env.FIREBASE_ADMIN_PROJECT_ID&&process.env.FIREBASE_ADMIN_CLIENT_EMAIL&&key;admin.initializeApp(ready?{credential:admin.credential.cert({projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL,privateKey:key})}:undefined);}
export const adminDb=admin.firestore(); export const Timestamp=admin.firestore.Timestamp;
