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
const POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE = "BINpoX_uGbCU8Qa-dMSQKgrMU1dN8afMgX7J0uyhAD23WnPZZSYEdbHW8Xa3n81CdoLm3vxtOQkMVwjGiPDxLyM";

if (typeof window !== "undefined") {
  window.POTONCHU_FIREBASE_CONFIG = POTONCHU_FIREBASE_CONFIG_VALUE;
  window.POTONCHU_FIREBASE_MESSAGING_VAPID_KEY = POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE;
  window.POTONCHU_NOTIFICATION_CONFIG = { region: "asia-northeast1" };
  // Enable after deploying generatePoems and registering its server-side secret.
  window.POTONCHU_GENERATION_CONFIG = { enabled: false, region: "asia-northeast1" };
  // Firebase AI Logic（Gemini Developer API）で「生成する」から一首を作ります。
  // appCheckSiteKey は reCAPTCHA Enterprise の公開サイトキーです。GeminiのAPIキーや秘密鍵は書かないでください。
  window.POTONCHU_AI_LOGIC_CONFIG = {
    enabled: true,
    model: "gemini-3.8-flash",
    thinkingLevel: "LOW",
    sdkVersion: "12.15.0",
    appCheckSiteKey: "6LcR1CcuAAAAAES7m8SNblwPQRpgItJcsivtwXHw",
    timeoutMs: 30000,
  };
}

if (typeof self !== "undefined") {
  self.POTONCHU_FIREBASE_CONFIG = POTONCHU_FIREBASE_CONFIG_VALUE;
  self.POTONCHU_FIREBASE_MESSAGING_VAPID_KEY = POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE;
}
