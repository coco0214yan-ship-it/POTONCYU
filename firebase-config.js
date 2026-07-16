// Firebaseを使って本当に友達の端末と同期する場合は、
// Firebaseコンソールで表示されるWebアプリ設定をここに貼ります。
// 空のままなら、同じPCの別タブだけで試せるデモ同期になります。
const POTONCHU_FIREBASE_CONFIG_VALUE = {
  apiKey: "AIzaSyDAm4g9-zTrAFqXvUY9Pi_AWCmzNZR-tPM",
  authDomain: "potonchu.firebaseapp.com",
  projectId: "potonchu",
  storageBucket: "potonchu.firebasestorage.app",
  messagingSenderId: "639859878416",
  appId: "1:639859878416:web:962a289acb8742bb567895",
};

// スマホ通知を使う場合は、Firebase Console > Cloud Messaging で作った
// Web Push certificates の「公開鍵」をここに貼ります。
const POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE = "";

if (typeof window !== "undefined") {
  window.POTONCHU_FIREBASE_CONFIG = POTONCHU_FIREBASE_CONFIG_VALUE;
  window.POTONCHU_FIREBASE_MESSAGING_VAPID_KEY = POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE;
}

if (typeof self !== "undefined") {
  self.POTONCHU_FIREBASE_CONFIG = POTONCHU_FIREBASE_CONFIG_VALUE;
  self.POTONCHU_FIREBASE_MESSAGING_VAPID_KEY = POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE;
}
