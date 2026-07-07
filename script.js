const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

const LEGACY_STORAGE_KEY = "potonchu.prototype.v1";
const SHARED_STORAGE_KEY = "potonchu.shared.v2";
const SESSION_USER_KEY = "potonchu.sessionUser.v1";
const ACTIVE_ROOM_KEY = "potonchu.activeRoomId";
const HISTORY_RESET_KEY = "potonchu.historyReset.v4";
const FIREBASE_SDK_VERSION = "12.15.0";
const BLANK = "__POTON_BLANK__";

const topicGroups = [
  { label: "予定", topics: ["明日どうする", "今日どうする", "予定決めよ", "集合時間", "どっちにする"] },
  { label: "ごはん", topics: ["夜ごはん", "何食べる", "カフェ行こ", "空きコマ"] },
  { label: "帰り道", topics: ["帰り道", "どこ行く", "あとで話そ", "また話そ"] },
  { label: "ちょい相談", topics: ["ちょい相談", "話したい", "助かった", "眠すぎる"] },
  { label: "気持ち", topics: ["会いたい", "ごめん", "なんか暇", "また話そ"] },
  { label: "グループ", topics: ["集合時間", "予定決めよ", "どっちにする", "今日どうする"] },
];
const iconChoices = ["ぽ", "あ", "み", "こ", "ゆ", "と"];
const reactionLabels = ["わかる", "それな", "今の誰", "また話そ", "笑った", "刺さった"];
const emojiReactions = ["😂", "🥺", "👍", "💭", "🍵", "🌙", "🫶", "👀"];
const reactionOptions = [
  ...reactionLabels.map((label) => ({ id: label, label, type: "text" })),
  ...emojiReactions.map((label) => ({ id: label, label, type: "emoji" })),
];
const gachaCaptions = ["ことばをころころ中", "一首を探しています", "お題に合うことばを回しています", "ぽとんと届く一首を選んでいます"];
const reflectionCopies = ["昨日の一首、まだ残ってる？", "昨日のこれ、ちょっと話す？", "あの一首の続き、送ってみる？", "昨日のぽとん、今日どうなった？", "一晩たって、まだ刺さってる？"];
const reflectionQuestions = ["この一首、今もわかる？", "昨日より気持ち変わった？", "この一首、誰に近かった？", "続きがあるなら何を送る？", "今日の返事を一首にする？"];

const poemLibrary = [
  {
    id: "plan-1",
    tags: ["明日どうする", "明日", "どうする", "予定"],
    lines: ["明日どうする", "決めるつもりで", BLANK, "予定より先に", "笑ってしまう"],
    choices: ["集合時間", "眠気", "ノリ", "空きコマ"],
  },
  {
    id: "plan-2",
    tags: ["今日どうする", "今日", "どうする", "予定"],
    lines: ["今日どうする", "決めるだけなのに", BLANK, "予定のすきま", "少し広がる"],
    choices: ["ノリ", "眠気", "寄り道", "本音"],
  },
  {
    id: "plan-3",
    tags: ["予定決めよ", "予定", "決め"],
    lines: ["予定決めよ", "言い出したのは", BLANK, "ほんとは先に", "会いたかった"],
    choices: ["段取り", "口実", "勢い", "空きコマ"],
  },
  {
    id: "time-1",
    tags: ["集合時間", "集合", "時間", "遅刻"],
    lines: ["集合時間", "決めるだけでも", BLANK, "誰かの遅刻", "もう見えている"],
    choices: ["空気", "ノリ", "不安", "笑い"],
  },
  {
    id: "choice-1",
    tags: ["どっち", "する", "決め", "グループ"],
    lines: ["どっちにする", "決まらないまま", BLANK, "みんなの顔が", "少しゆるむ"],
    choices: ["多数決", "ノリ", "やさしさ", "迷い"],
  },
  {
    id: "food-1",
    tags: ["夜ごはん", "夜", "ごはん", "飯"],
    lines: ["夜ごはん", "決めるふりして", BLANK, "ほんとは少し", "まだ歩きたい"],
    choices: ["ラーメン", "寄り道", "空腹", "本音"],
  },
  {
    id: "food-2",
    tags: ["何食べる", "食べる", "ごはん", "夜"],
    lines: ["何食べる", "決まらないのは", BLANK, "まだ帰らない", "理由がほしい"],
    choices: ["空腹", "優柔不断", "寄り道", "湯気"],
  },
  {
    id: "cafe-1",
    tags: ["カフェ", "空きコマ", "コマ"],
    lines: ["空きコマに", "カフェでも行こ", BLANK, "課題のことは", "あとで思い出す"],
    choices: ["甘いもの", "眠気", "本音", "充電"],
  },
  {
    id: "where-1",
    tags: ["どこ行く", "どこ", "行く"],
    lines: ["どこ行くの", "答えを待つより", BLANK, "同じほうへと", "歩き出してる"],
    choices: ["ノリ", "夕方", "駅前", "寄り道"],
  },
  {
    id: "way-1",
    tags: ["帰り道", "帰り", "道", "駅"],
    lines: ["帰り道", "改札前で", BLANK, "さよならだけが", "少し遅れる"],
    choices: ["夕焼け", "沈黙", "コンビニ", "足音"],
  },
  {
    id: "way-2",
    tags: ["あとで話そ", "話そ", "帰り", "道"],
    lines: ["あとで話そ", "軽く言ったら", BLANK, "帰り道だけ", "少し長くて"],
    choices: ["続き", "本音", "約束", "くだらなさ"],
  },
  {
    id: "sorry-1",
    tags: ["ごめん", "謝", "悪い", "仲直り"],
    lines: ["ごめん", "言えばいいのに", BLANK, "遠回りして", "一首で送る"],
    choices: ["照れくささ", "意地っ張り", "タイミング", "ほんとのこと"],
  },
  {
    id: "sorry-2",
    tags: ["ごめん", "仲直り"],
    lines: ["言いすぎた", "あとの画面に", BLANK, "送れないまま", "夜がほどける"],
    choices: ["既読", "反省", "チョコ", "ごめん"],
  },
  {
    id: "meet-1",
    tags: ["会いたい", "会う", "また", "話そ"],
    lines: ["会いたいを", "軽く包んで", BLANK, "また話そって", "送る夜更け"],
    choices: ["冗談", "本音", "月明かり", "通知"],
  },
  {
    id: "meet-2",
    tags: ["また", "話そ", "会いたい", "暇"],
    lines: ["また話そ", "言いそびれてた", BLANK, "帰り道だけ", "少し長くて"],
    choices: ["続き", "本音", "約束", "くだらなさ"],
  },
  {
    id: "talk-1",
    tags: ["話したい", "話す", "あとで"],
    lines: ["話したい", "それだけ置いて", BLANK, "急がないまま", "返事を待った"],
    choices: ["余白", "本音", "夜風", "通知"],
  },
  {
    id: "light-1",
    tags: ["暇", "なんか", "だるい", "ちょい"],
    lines: ["なんか暇", "言い訳みたいに", BLANK, "君の名前を", "探してしまう"],
    choices: ["スクロール", "夕方", "プリン", "弱音"],
  },
  {
    id: "sleepy-1",
    tags: ["眠すぎる", "眠", "ねむ"],
    lines: ["眠すぎる", "それでも少し", BLANK, "返事を待って", "画面がにじむ"],
    choices: ["授業中", "帰り道", "甘いもの", "くだらなさ"],
  },
  {
    id: "consult-1",
    tags: ["相談", "ちょい", "聞いて", "迷"],
    lines: ["ちょい相談", "重くしないで", BLANK, "机のすみへ", "そっと置きたい"],
    choices: ["本音", "飴玉", "ためらい", "明日"],
  },
  {
    id: "thanks-1",
    tags: ["助かった", "ありがと", "ありがとう"],
    lines: ["助かった", "ちゃんと言うには", BLANK, "照れが先きて", "一首にしたよ"],
    choices: ["ありがと", "照れ", "帰り道", "甘さ"],
  },
  {
    id: "default-1",
    tags: [],
    lines: ["{{topic}}", "うまく言えずに", BLANK, "湯気の向こうで", "君を見ている"],
    choices: ["本音", "眠気", "余白", "小さな嘘"],
  },
  {
    id: "default-2",
    tags: [],
    lines: ["{{topic}}を", "丸めてそっと", BLANK, "言葉の端が", "少し甘くなる"],
    choices: ["ポケット", "沈黙", "カプセル", "遠回り"],
  },
];

clearLegacyHistory();

const roomChannel = "BroadcastChannel" in window ? new BroadcastChannel("potonchu-room-sync-v3") : null;
const backend = {
  mode: "demo",
  ready: false,
  status: "Firebase未設定です。同じPCの別タブだけで試せます。",
  firebase: null,
  roomUnsubscribe: null,
  messageUnsubscribes: new Map(),
  messageErrors: new Map(),
  seenMemberIds: new Map(),
};
if (hasFirebaseConfig()) backend.status = "Firebaseへ接続中です。";
let demoState = createSharedState();

const roomStore = {
  load() {
    return demoState;
  },
  save(data, shouldBroadcast = true) {
    const next = normalizeSharedState({ ...data, updatedAt: Date.now() });
    demoState = next;
    if (shouldBroadcast) roomChannel?.postMessage({ type: "demo-state-updated", state: next });
    return next;
  },
  update(updater) {
    const current = this.load();
    const result = updater(current) || current;
    return this.save(result);
  },
};

let sharedState = roomStore.load();
let appState = createAppState();
let ui = {
  view: appState.user ? "home" : "login",
  topic: "",
  composer: null,
  createResultId: null,
  openReactionFor: "",
  pendingPhoto: "",
  firebaseNoticeDismissed: false,
  pendingInviteRoomId: new URLSearchParams(window.location.search).get("roomId"),
  pendingInviteName: new URLSearchParams(window.location.search).get("roomName"),
  pendingInviteType: new URLSearchParams(window.location.search).get("roomType"),
};

roomChannel?.postMessage({ type: "request-demo-state" });

function createSharedState() {
  return {
    users: [],
    rooms: [],
    favorites: {},
    updatedAt: Date.now(),
  };
}

function createAppState() {
  const user = loadSessionUser();
  return {
    user,
    rooms: sharedState.rooms,
    favorite: user ? sharedState.favorites?.[user.id] || null : null,
    activeRoomId: sessionStorage.getItem(ACTIVE_ROOM_KEY) || null,
  };
}

function normalizeSharedState(data) {
  const empty = createSharedState();
  return {
    ...empty,
    ...data,
    users: Array.isArray(data?.users) ? data.users.map(normalizeUser) : [],
    rooms: Array.isArray(data?.rooms) ? data.rooms.map(normalizeRoom) : [],
    favorites: data?.favorites && typeof data.favorites === "object" ? data.favorites : {},
    updatedAt: Number(data?.updatedAt) || Date.now(),
  };
}

function normalizeRoom(room) {
  return {
    id: room.id || makeId("room"),
    name: room.name || "名前のないルーム",
    type: room.type === "group" ? "group" : "pair",
    createdBy: room.createdBy || room.members?.[0]?.id || "",
    inviteCode: room.inviteCode || room.id || makeId("invite"),
    members: Array.isArray(room.members) ? room.members.map(normalizeUser) : [],
    messages: Array.isArray(room.messages) ? room.messages.map(normalizeMessage) : [],
    createdAt: room.createdAt || Date.now(),
  };
}

function normalizeMessage(message) {
  const author = normalizeUser(message.author || {
    id: message.senderId,
    name: message.senderName,
    icon: message.senderPhoto || message.senderIcon,
    photoURL: message.senderPhoto,
  });
  return {
    id: message.id || message.messageId || makeId("msg"),
    roomId: message.roomId || "",
    topic: message.topic || "お題",
    lines: Array.isArray(message.lines) ? message.lines : Array.isArray(message.poemLines) ? message.poemLines : [],
    selectedWord: message.selectedWord || "",
    author,
    senderId: message.senderId || author.id,
    senderName: message.senderName || author.name,
    senderPhoto: message.senderPhoto || author.icon,
    reactions: normalizeReactions(message.reactions),
    createdAt: toMillis(message.createdAt) || message.createdAtMillis || Date.now(),
  };
}

function normalizeUser(user) {
  const photoURL = user?.photoURL || (isImageValue(user?.icon) ? user.icon : "");
  const customIconURL = user?.customIconURL || "";
  return {
    id: user?.id || user?.uid || makeId("user"),
    name: user?.name || user?.displayName || "ぽとん",
    icon: user?.icon && !isImageValue(user.icon) ? user.icon : "ぽ",
    photoURL,
    customIconURL,
    provider: user?.provider || "google-mock",
    createdAt: user?.createdAt || Date.now(),
  };
}

function normalizeReactions(reactions) {
  if (!reactions || typeof reactions !== "object") return {};
  return Object.fromEntries(
    Object.entries(reactions).map(([key, users]) => [key, Array.isArray(users) ? [...new Set(users)] : []]),
  );
}

function clearLegacyHistory() {
  try {
    if (localStorage.getItem(HISTORY_RESET_KEY) === "done") return;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(SHARED_STORAGE_KEY);
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
    localStorage.setItem(HISTORY_RESET_KEY, "done");
  } catch (error) {
    // 保存を使えないブラウザでも画面はそのまま動かします。
  }
}

function loadSessionUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch (error) {
    return null;
  }
}

function saveSessionUser(user) {
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(normalizeUser(user)));
}

function clearSessionUser() {
  sessionStorage.removeItem(SESSION_USER_KEY);
}

function getFirebaseConfig() {
  return window.POTONCHU_FIREBASE_CONFIG || {};
}

function hasFirebaseConfig() {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function isFirebaseMode() {
  return backend.mode === "firebase" && backend.firebase?.db;
}

async function initBackend() {
  if (!hasFirebaseConfig()) {
    backend.ready = true;
    render();
    return;
  }

  try {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
    ]);

    const firebaseApp = appModule.initializeApp(getFirebaseConfig());
    const auth = authModule.getAuth(firebaseApp);
    const db = firestoreModule.getFirestore(firebaseApp);
    backend.mode = "firebase";
    backend.ready = true;
    backend.status = "Firebaseでリアルタイム同期します。";
    backend.firebase = { appModule, authModule, firestoreModule, app: firebaseApp, auth, db };

    authModule.onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearSessionUser();
        sharedState = createSharedState();
        cleanupFirebaseSubscriptions();
        if (!["login", "setup"].includes(ui.view)) ui.view = "login";
        render();
        return;
      }

      const user = await loadFirebaseUser(firebaseUser);
      saveSessionUser(user);
      upsertLocalUser(user);
      if (user.favoritePoem) {
        sharedState = normalizeSharedState({
          ...sharedState,
          favorites: { ...sharedState.favorites, [user.id]: user.favoritePoem },
        });
      }
      subscribeFirebaseRooms(user.id);
      await routeAfterAuth();
    });

    render();
  } catch (error) {
    backend.ready = true;
    backend.mode = "demo";
    backend.status = "Firebaseの読み込みに失敗しました。設定を確認してください。";
    render();
  }
}

async function signInWithFirebase() {
  if (!isFirebaseMode()) return false;
  try {
    const { authModule, auth } = backend.firebase;
    const provider = new authModule.GoogleAuthProvider();
    await authModule.signInWithPopup(auth, provider);
    return true;
  } catch (error) {
    showToast("Googleログインを完了できませんでした。");
    return false;
  }
}

async function signOutCurrentUser() {
  if (isFirebaseMode()) {
    await backend.firebase.authModule.signOut(backend.firebase.auth);
  }
  clearSessionUser();
  sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  cleanupFirebaseSubscriptions();
}

async function loadFirebaseUser(firebaseUser) {
  const { firestoreModule, db } = backend.firebase;
  const userRef = firestoreModule.doc(db, "users", firebaseUser.uid);
  const snapshot = await firestoreModule.getDoc(userRef);
  const saved = snapshot.exists() ? snapshot.data() : {};
  const user = normalizeUser({
    id: firebaseUser.uid,
    name: saved.displayName || firebaseUser.displayName || "ぽとん",
    icon: "ぽ",
    photoURL: saved.photoURL || firebaseUser.photoURL || "",
    customIconURL: saved.customIconURL || "",
    provider: "firebase",
    createdAt: toMillis(saved.createdAt) || Date.now(),
  });
  user.favoritePoem = saved.favoritePoem || null;
  await firestoreModule.setDoc(
    userRef,
    {
      displayName: user.name,
      photoURL: user.photoURL || "",
      customIconURL: user.customIconURL || "",
      updatedAt: firestoreModule.serverTimestamp(),
    },
    { merge: true },
  );
  return user;
}

function cleanupFirebaseSubscriptions() {
  backend.roomUnsubscribe?.();
  backend.roomUnsubscribe = null;
  backend.messageUnsubscribes.forEach((unsubscribe) => unsubscribe());
  backend.messageUnsubscribes.clear();
  backend.seenMemberIds.clear();
}

function subscribeFirebaseRooms(userId) {
  if (!isFirebaseMode()) return;
  const { firestoreModule, db } = backend.firebase;
  backend.roomUnsubscribe?.();
  const roomsQuery = firestoreModule.query(
    firestoreModule.collection(db, "rooms"),
    firestoreModule.where("memberIds", "array-contains", userId),
  );
  backend.roomUnsubscribe = firestoreModule.onSnapshot(
    roomsQuery,
    (snapshot) => {
      const nextRooms = snapshot.docs.map((roomDoc) => normalizeFirebaseRoom(roomDoc));
      sharedState = normalizeSharedState({
        ...sharedState,
        rooms: nextRooms.map((room) => {
          const existing = sharedState.rooms.find((item) => item.id === room.id);
          return { ...room, messages: existing?.messages || [] };
        }),
      });
      watchRoomMemberChanges(nextRooms);
      nextRooms.forEach((room) => subscribeFirebaseMessages(room.id));
      render();
    },
    (error) => {
      backend.status = "ルームを読み込めません。Firebaseのルールを確認してください。";
      showToast("ルームを読み込めませんでした。");
      render();
    },
  );
}

function subscribeFirebaseMessages(roomId) {
  if (!isFirebaseMode() || backend.messageUnsubscribes.has(roomId)) return;
  const { firestoreModule, db } = backend.firebase;
  const messagesQuery = firestoreModule.collection(db, "rooms", roomId, "messages");
  const unsubscribe = firestoreModule.onSnapshot(
    messagesQuery,
    (snapshot) => {
      backend.messageErrors.delete(roomId);
      const messages = snapshot.docs
        .map((messageDoc) => normalizeFirebaseMessage(roomId, messageDoc))
        .sort((a, b) => a.createdAt - b.createdAt);
      sharedState = normalizeSharedState({
        ...sharedState,
        rooms: sharedState.rooms.map((room) => (room.id === roomId ? { ...room, messages } : room)),
      });
      if (["home", "chat"].includes(ui.view)) render();
    },
    (error) => {
      backend.messageErrors.set(roomId, error.code || error.message || "unknown");
      showToast("一首を読み込めません。");
      render();
    },
  );
  backend.messageUnsubscribes.set(roomId, unsubscribe);
}

function normalizeFirebaseRoom(roomDoc) {
  const data = roomDoc.data();
  return normalizeRoom({
    id: roomDoc.id,
    name: data.roomName || data.name,
    type: data.type,
    createdBy: data.createdBy,
    inviteCode: data.inviteCode || roomDoc.id,
    members: Array.isArray(data.members) ? data.members : [],
    messages: [],
    createdAt: toMillis(data.createdAt) || data.createdAtMillis,
  });
}

function normalizeFirebaseMessage(roomId, messageDoc) {
  const data = messageDoc.data();
  return normalizeMessage({
    id: messageDoc.id,
    roomId,
    topic: data.topic,
    lines: data.poemLines,
    poemLines: data.poemLines,
    selectedWord: data.selectedWord,
    senderId: data.senderId,
    senderName: data.senderName,
    senderPhoto: data.senderPhoto,
    author: {
      id: data.senderId,
      name: data.senderName,
      photoURL: data.senderPhoto,
      customIconURL: data.senderPhoto,
    },
    reactions: data.reactions || {},
    createdAt: toMillis(data.createdAt) || data.createdAtMillis,
  });
}

function watchRoomMemberChanges(rooms) {
  rooms.forEach((room) => {
    const previous = backend.seenMemberIds.get(room.id) || new Set();
    const current = new Set(room.members.map((member) => member.id));
    const joined = room.members.find((member) => !previous.has(member.id) && member.id !== appState.user?.id);
    backend.seenMemberIds.set(room.id, current);
    if (joined && room.id === appState.activeRoomId && ui.view === "chat") showToast(`${joined.name}が入りました`);
  });
}

function render() {
  refreshAppState();

  if (!appState.user && !["login", "setup"].includes(ui.view)) {
    ui.view = "login";
  }

  if (ui.view === "login") app.innerHTML = renderLogin();
  if (ui.view === "setup") app.innerHTML = renderSetup();
  if (ui.view === "home") app.innerHTML = renderHome();
  if (ui.view === "create-room") app.innerHTML = renderCreateRoom();
  if (ui.view === "chat") app.innerHTML = renderChat();
  if (ui.view === "topic") app.innerHTML = renderTopic();
  if (ui.view === "gacha") app.innerHTML = renderGacha();

  const topicInput = document.querySelector("#topicInput");
  if (topicInput) {
    topicInput.focus();
    updateTopicCounter();
  }
}

function refreshAppState() {
  if (backend.mode !== "firebase") sharedState = roomStore.load();
  const user = loadSessionUser();
  appState = {
    user,
    rooms: sharedState.rooms,
    favorite: user ? sharedState.favorites?.[user.id] || null : null,
    activeRoomId: sessionStorage.getItem(ACTIVE_ROOM_KEY) || appState?.activeRoomId || null,
  };
}

function handleSharedUpdate() {
  refreshAppState();
  if (["home", "chat"].includes(ui.view)) render();
}

roomChannel?.addEventListener("message", (event) => {
  if (backend.mode === "firebase") return;
  if (event.data?.type === "request-demo-state" && demoState.rooms.length) {
    roomChannel.postMessage({ type: "demo-state-updated", state: demoState });
  }
  if (event.data?.type === "demo-state-updated" && event.data.state) {
    demoState = normalizeSharedState(event.data.state);
    watchRoomMemberChanges(demoState.rooms);
    handleSharedUpdate();
  }
});

function renderLogin() {
  const inviteNote = ui.pendingInviteRoomId ? "<p class=\"small-note\">招待リンクを開いています。ログイン後にそのルームへ入ります。</p>" : "";
  return `
    <section class="screen login-screen">
      <div class="auth-panel">
        <div class="brand-lockup">
          <div class="brand-mark">ぽ</div>
          <div>
            <h1 class="brand-title">ぽとんちゅ</h1>
            <p class="brand-subcopy">一首しか送れないチャット。</p>
          </div>
        </div>
        <p class="login-copy">話したいことを10字で置いて、ことばを選んで、友達にぽとんと送る。普通の文章は送れません。</p>
        <button type="button" class="google-button" data-action="google-login">
          <span class="google-dot">G</span>
          Googleでログイン
        </button>
        <p class="small-note">${escapeHtml(backend.status)}</p>
        ${inviteNote}
      </div>
    </section>
  `;
}

function renderSetup() {
  return `
    <section class="screen setup-screen">
      <div class="setup-panel">
        <div class="page-title">
          <p class="eyebrow">account</p>
          <h1 class="brand-title">アカウント作成</h1>
          <p class="brand-subcopy">友達に見える名前とアイコンを決めます。</p>
        </div>
        <form class="setup-form" data-form="setup">
          <label class="field-label">
            ユーザー名
            <input id="setupName" name="name" maxlength="12" value="ぽとん" autocomplete="off" />
          </label>
          <div class="field-label">
            アイコン
            <div class="icon-grid">
              ${iconChoices
                .map(
                  (icon, index) => `
                    <label class="icon-choice">
                      <input type="radio" name="icon" value="${escapeAttribute(icon)}" ${index === 0 ? "checked" : ""} />
                      <span class="icon-face">${escapeHtml(icon)}</span>
                    </label>
                  `,
                )
                .join("")}
            </div>
          </div>
          <button type="submit" class="primary-button">マイページへ</button>
        </form>
      </div>
    </section>
  `;
}

function renderHome() {
  return `
    <section class="screen">
      ${renderTopbar(`
        <button type="button" class="create-button" data-action="go-create-room">新しいルームを作る</button>
        <button type="button" class="ghost-button" data-action="logout">ログアウト</button>
      `)}
      <div class="home-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">rooms</p>
              <h2>参加中のチャットルーム</h2>
            </div>
          </div>
          ${renderRoomList()}
        </section>
        <aside class="panel">
          ${renderProfileCard()}
          <div class="panel-header">
            <div>
              <p class="eyebrow">favorite</p>
              <h2>お気に入りの一句</h2>
            </div>
          </div>
          ${renderFavorite()}
        </aside>
      </div>
    </section>
  `;
}

function renderTopbar(actions = "") {
  const user = appState.user;
  return `
    <header class="app-topbar">
      <div class="brand-lockup">
        <div class="brand-mark">ぽ</div>
        <div>
          <p class="eyebrow">potonchu</p>
          <h1 class="brand-title">ぽとんちゅ</h1>
        </div>
      </div>
      <div class="top-actions">
        <div class="account-chip">
          ${renderAvatar(user)}
          <span class="account-name">${escapeHtml(user.name)}</span>
        </div>
        ${actions}
      </div>
    </header>
  `;
}

function renderProfileCard() {
  const user = appState.user;
  const previewUser = ui.pendingPhoto ? { ...user, customIconURL: ui.pendingPhoto } : user;
  return `
    <div class="profile-card">
      <div>
        <p class="eyebrow">profile</p>
        <h2>プロフィール写真</h2>
      </div>
      <div class="profile-photo-row">
        ${renderAvatar(previewUser, "avatar profile-avatar")}
        <div class="profile-photo-actions">
          <input class="visually-hidden-file" id="profilePhotoInput" type="file" accept="image/*" />
          <button type="button" class="copy-button" data-action="choose-profile-photo">写真をえらぶ</button>
          ${ui.pendingPhoto ? `<button type="button" class="primary-button" data-action="save-profile-photo">この写真にする</button>` : ""}
        </div>
      </div>
      <p class="small-note">写真は丸いアイコンとして表示されます。</p>
    </div>
  `;
}

function renderRoomList() {
  if (appState.rooms.length === 0) {
    return `
      <div class="empty-state">
        <p>まだルームがありません。</p>
        <button type="button" class="primary-button" data-action="go-create-room">最初のルームを作る</button>
      </div>
    `;
  }

  return `
    <div class="room-list">
      ${appState.rooms
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(
          (room) => `
            <button type="button" class="room-item" data-action="open-room" data-room-id="${escapeAttribute(room.id)}">
              <span>
                <strong>${escapeHtml(room.name)}</strong>
                <span class="room-meta">${room.type === "group" ? "グループ" : "1対1"} ・ ${room.members.length}人 ・ ${room.messages.length}首 ・ ${formatDate(room.createdAt)}</span>
              </span>
              <span class="room-kind">${getYesterdayReflection(room) ? "昨日のぽとん" : room.type === "group" ? "グループ" : "1対1"}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderFavorite() {
  const favorite = appState.favorite;
  if (!favorite) {
    return `
      <div class="favorite-box">
        <p class="favorite-empty">今の自分のよりしろになる一句を、ここに1つだけ置けます。新しく保存すると前の一句は置き換わります。</p>
      </div>
    `;
  }

  return `
    <div class="favorite-box">
      <div class="favorite-meta">${escapeHtml(favorite.roomName)} ・ ${escapeHtml(favorite.topic)}</div>
      ${renderPoemLines(favorite.lines)}
      <div class="favorite-meta">${formatDate(favorite.savedAt)}に保存</div>
    </div>
  `;
}

function renderCreateRoom() {
  const createdRoom = ui.createResultId ? findRoom(ui.createResultId) : null;
  return `
    <section class="screen room-create-screen">
      ${renderTopbar(`<button type="button" class="back-button" data-action="go-home">マイページへ</button>`)}
      <div class="panel">
        <div class="page-title">
          <p class="eyebrow">new room</p>
          <h1>ルーム作成</h1>
        </div>
        <form class="room-form" data-form="room">
          <label class="field-label">
            ルーム名
            <input name="roomName" maxlength="24" placeholder="例：帰り道の会" autocomplete="off" />
          </label>
          <div class="field-label">
            使い方
            <div class="room-type-grid">
              <label class="room-type">
                <input type="radio" name="roomType" value="pair" checked />
                <span>1対1</span>
              </label>
              <label class="room-type">
                <input type="radio" name="roomType" value="group" />
                <span>グループ</span>
              </label>
            </div>
          </div>
          <button type="submit" class="primary-button">ルームを作る</button>
        </form>
        ${createdRoom ? renderCreatedRoom(createdRoom) : ""}
      </div>
    </section>
  `;
}

function renderCreatedRoom(room) {
  const inviteLink = makeInviteLink(room.id);
  return `
    <div class="created-room">
      <strong>${escapeHtml(room.name)}を作りました。</strong>
      <span class="invite-link">${escapeHtml(inviteLink)}</span>
      <div class="gacha-actions">
        <button type="button" class="copy-button" data-action="copy-invite" data-room-id="${escapeAttribute(room.id)}">招待リンクをコピー</button>
        <button type="button" class="primary-button" data-action="open-room" data-room-id="${escapeAttribute(room.id)}">チャットを開く</button>
        <button type="button" class="ghost-button" data-action="go-home">マイページへ</button>
      </div>
    </div>
  `;
}

function renderChat() {
  const room = currentRoom();
  if (!room) {
    ui.view = "home";
    return renderHome();
  }

  return `
    <section class="screen chat-shell">
      <header class="chat-header">
        <button type="button" class="back-button" data-action="go-home">戻る</button>
        <div>
          <p class="eyebrow">${room.type === "group" ? "group room" : "pair room"}</p>
          <h1>${escapeHtml(room.name)}</h1>
        </div>
        <div class="participant-stack" aria-label="参加者">
          ${room.members.map((member) => renderAvatar(member, "avatar small", member.name)).join("")}
        </div>
      </header>

      <section class="message-list" aria-label="一首チャット">
        ${renderRoomStatus(room)}
        ${renderReflectionCard(room)}
        ${renderMessages(room)}
      </section>

      <section class="composer-dock">
        <p class="dock-note">このルームでは普通の文章は送れません。送れるのは、完成した一首だけです。</p>
        <button type="button" class="primary-button" data-action="go-topic">一首をつくる</button>
      </section>
    </section>
  `;
}

function renderRoomStatus(room) {
  const messageError = backend.messageErrors.get(room.id);
  if (messageError) {
    return `
      <div class="room-status-card is-error">
        <p>一首の読み込みが止まっています。FirebaseのFirestoreルールを確認してください。</p>
        <span class="status-code">${escapeHtml(messageError)}</span>
      </div>
    `;
  }
  if (room.members.length <= 1) {
    return `
      <div class="room-status-card">
        <p>まだ相手がいません。招待リンクを送ってみる。</p>
        <button type="button" class="copy-button" data-action="copy-invite" data-room-id="${escapeAttribute(room.id)}">招待リンクをコピー</button>
      </div>
    `;
  }
  return "";
}

function renderMessages(room) {
  if (room.messages.length === 0) {
    return `
      <div class="empty-state">
        <p>まだ一首は届いていません。</p>
        <button type="button" class="primary-button" data-action="go-topic">一首をつくる</button>
        <button type="button" class="copy-button" data-action="copy-invite" data-room-id="${escapeAttribute(room.id)}">招待リンクをコピー</button>
      </div>
    `;
  }

  return room.messages
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((message) => renderMessage(message, room))
    .join("");
}

function renderMessage(message, room) {
  const isMine = message.author.id === appState.user.id;
  return `
    <article class="message-row ${isMine ? "is-mine" : ""}">
      <div class="message-meta ${isMine ? "is-mine" : ""}">
        ${isMine ? "" : renderAvatar(message.author, "avatar small", message.author.name)}
        <span>${escapeHtml(message.author.name)} ・ ${formatDate(message.createdAt)}</span>
      </div>
      <div class="poem-bubble">
        <span class="message-topic">${escapeHtml(message.topic)}</span>
        ${renderPoemLines(message.lines)}
        <div class="reaction-row">${renderReactionSummary(message)}</div>
        <div class="message-footer">
          <button type="button" class="mini-button" data-action="favorite-message" data-message-id="${escapeAttribute(message.id)}">よりしろにする</button>
          <button type="button" class="mini-button reaction-toggle" data-action="toggle-reaction-picker" data-message-id="${escapeAttribute(message.id)}">＋ リアクション</button>
        </div>
      </div>
      ${ui.openReactionFor === message.id ? renderReactionPicker(message, room) : ""}
    </article>
  `;
}

function renderReactionSummary(message) {
  const activeReactions = Object.entries(message.reactions || {}).filter(([, users]) => users.length > 0);
  if (activeReactions.length === 0) return "";
  return activeReactions
    .map(([label, users]) => `<span class="reaction-pill is-active">${escapeHtml(label)} ${users.length}</span>`)
    .join("");
}

function renderReactionPicker(message, room) {
  return `
    <div class="reaction-picker" aria-label="リアクション">
      ${reactionOptions
        .map((option) => {
          const users = message.reactions?.[option.id] || [];
          const active = users.includes(appState.user.id);
          const count = users.length ? ` ${users.length}` : "";
          return `<button type="button" class="reaction-pill ${option.type === "emoji" ? "is-emoji" : ""} ${active ? "is-active" : ""}" data-action="toggle-reaction" data-room-id="${escapeAttribute(room.id)}" data-message-id="${escapeAttribute(message.id)}" data-reaction="${escapeAttribute(option.id)}">${escapeHtml(option.label)}${count}</button>`;
        })
        .join("")}
    </div>
  `;
}

function renderReflectionCard(room) {
  const reflection = getYesterdayReflection(room);
  if (!reflection) return "";
  return `
    <section class="reflection-card" aria-label="昨日の一首">
      <div>
        <p class="eyebrow">昨日のぽとん</p>
        <h2>${escapeHtml(reflection.copy)}</h2>
      </div>
      <div class="reflection-poem">
        <span class="message-topic">${escapeHtml(reflection.message.topic)}</span>
        ${renderPoemLines(reflection.message.lines)}
      </div>
      <p>${escapeHtml(reflection.question)}</p>
      <button type="button" class="primary-button" data-action="reply-yesterday">今日の一首で返す</button>
    </section>
  `;
}

function renderTopic() {
  const current = currentRoom();
  if (!current) {
    ui.view = "home";
    return renderHome();
  }

  return `
    <section class="screen composer-screen">
      ${renderTopbar(`<button type="button" class="back-button" data-action="go-chat">チャットへ</button>`)}
      <div class="topic-panel">
        <div class="topic-title">
          <p class="eyebrow">${escapeHtml(current.name)}</p>
          <h1>話したいお題を10字以内で</h1>
        </div>
        <form class="topic-form" data-form="topic">
          <label class="field-label">
            お題
            <input id="topicInput" name="topic" maxlength="10" value="${escapeAttribute(ui.topic)}" placeholder="例：夜ごはん" autocomplete="off" />
          </label>
          <div class="counter-row" id="topicCounter">
            <span>軽いお題でも大丈夫</span>
            <span id="topicCount">残り10字</span>
          </div>
          <div class="topic-example-wrap" aria-label="おすすめお題">
            <p class="topic-hint">おすすめお題</p>
            ${topicGroups
              .map(
                (group) => `
                  <section class="topic-group">
                    <h2>${escapeHtml(group.label)}</h2>
                    <div class="topic-examples">
                      ${group.topics.map((topic) => `<button type="button" class="topic-chip" data-action="use-topic" data-topic="${escapeAttribute(topic)}">${escapeHtml(topic)}</button>`).join("")}
                    </div>
                  </section>
                `,
              )
              .join("")}
          </div>
          <button type="submit" class="primary-button" id="topicSubmit">一首ガチャを回す</button>
        </form>
      </div>
    </section>
  `;
}

function renderGacha() {
  const composer = ui.composer;
  if (!composer) {
    ui.view = "topic";
    return renderTopic();
  }

  if (composer.step === "loading") {
    return `
      <section class="screen composer-screen">
        ${renderTopbar(`<button type="button" class="back-button" data-action="go-topic">お題へ</button>`)}
        <div class="gacha-panel">
          <div class="gacha-head">
            <div class="gacha-title">
              <p class="eyebrow">isshu gacha</p>
              <h1>一首ガチャ</h1>
            </div>
            <span class="topic-badge">${escapeHtml(composer.topic)}</span>
          </div>
          <div class="machine-wrap">
            <div>
              <div class="gacha-machine" aria-hidden="true">
                <div class="machine-globe">
                  <span class="capsule capsule-one"></span>
                  <span class="capsule capsule-two"></span>
                  <span class="capsule capsule-three"></span>
                  <span class="capsule capsule-four"></span>
                </div>
                <div class="machine-body">
                  <div class="machine-handle"></div>
                </div>
                <div class="machine-slot"></div>
              </div>
              <div class="machine-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p class="machine-caption">${escapeHtml(composer.loadingCopy)}</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  if (composer.step === "confirm") return renderConfirm();

  const isDropping = composer.step === "dropping";
  const isResting = composer.step === "resting";
  const poemMode = isDropping ? "dropping" : isResting ? "settled" : "blank";
  return `
    <section class="screen composer-screen">
      ${renderTopbar(`<button type="button" class="back-button" data-action="go-topic">お題へ</button>`)}
      <div class="gacha-panel">
        <div class="gacha-head">
          <div class="gacha-title">
            <p class="eyebrow">isshu gacha</p>
            <h1>穴あき一首</h1>
          </div>
          <span class="topic-badge">${escapeHtml(composer.topic)}</span>
        </div>
        <section class="poem-stage">
          <div class="poem-paper">
            ${renderDraftPoem(composer.draft, composer.selectedChoice, poemMode)}
          </div>
          ${
            isResting
              ? ""
              : `<div class="choice-grid">
                  ${composer.draft.choices
                    .map(
                      (choice) => `
                        <button type="button" class="choice-button ${choice === composer.selectedChoice ? "is-picked" : ""}" data-action="choose-word" data-choice="${escapeAttribute(choice)}" ${isDropping ? "disabled" : ""}>
                          ${escapeHtml(choice)}
                        </button>
                      `,
                    )
                    .join("")}
                </div>`
          }
        </section>
        ${
          isResting
            ? ""
            : `<div class="gacha-actions">
                <button type="button" class="subtle-button" data-action="reroll">引き直し</button>
                <button type="button" class="ghost-button" data-action="go-topic">お題を変える</button>
                <button type="button" class="ghost-button" data-action="go-chat">チャットへ</button>
              </div>`
        }
      </div>
    </section>
  `;
}

function renderConfirm() {
  const composer = ui.composer;
  const lines = completePoemLines(composer.draft, composer.selectedChoice);
  return `
    <section class="screen composer-screen">
      ${renderTopbar(`<button type="button" class="back-button" data-action="go-chat">チャットへ</button>`)}
      <div class="confirm-panel">
        <div>
          <p class="eyebrow">send</p>
          <h1>この一首で送る？</h1>
          <p class="confirm-copy">説明は足さず、一首だけ届きます。</p>
        </div>
        <div class="poem-stage">
          <div class="poem-paper">
            ${renderPoemLines(lines)}
          </div>
        </div>
        <div class="confirm-actions">
          <button type="button" class="send-button" data-action="send-poem">この一首を送る</button>
          <button type="button" class="subtle-button" data-action="reroll">もう一回まわす</button>
          <button type="button" class="ghost-button" data-action="choose-again">選び直す</button>
        </div>
      </div>
    </section>
  `;
}

function renderDraftPoem(draft, selectedChoice, mode) {
  const lines = draft.lines
    .map((line) => {
      if (line !== BLANK) return `<span class="poem-line">${escapeHtml(line)}</span>`;
      if (mode === "blank") return `<span class="poem-line"><span class="blank-slot">＿＿＿＿</span></span>`;
      if (mode === "dropping") {
        return `<span class="poem-line"><span class="blank-slot is-filled is-dropping"><span class="landing-puff"></span><span class="falling-word">${escapeHtml(selectedChoice)}</span></span></span>`;
      }
      return `<span class="poem-line"><span class="blank-slot is-filled"><span class="settled-word">${escapeHtml(selectedChoice)}</span></span></span>`;
    })
    .join("");

  return `<div class="poem-lines">${lines}</div>`;
}

function renderPoemLines(lines) {
  return `
    <div class="poem-lines">
      ${lines.map((line) => `<span class="poem-line">${escapeHtml(line)}</span>`).join("")}
    </div>
  `;
}

function selectedRadio(form, name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

async function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "google-login") {
    if (isFirebaseMode()) {
      await signInWithFirebase();
      return;
    }
    ui.view = "setup";
    render();
    return;
  }

  if (action === "logout") {
    await signOutCurrentUser();
    ui.view = "login";
    render();
    showToast("ログアウトしました。");
    return;
  }

  if (action === "go-home") {
    ui.view = "home";
    ui.createResultId = null;
    render();
    return;
  }

  if (action === "go-create-room") {
    ui.view = "create-room";
    ui.createResultId = null;
    render();
    return;
  }

  if (action === "open-room") {
    await setActiveRoom(button.dataset.roomId);
    ui.view = "chat";
    render();
    return;
  }

  if (action === "go-chat") {
    ui.view = "chat";
    render();
    return;
  }

  if (action === "go-topic") {
    ui.view = "topic";
    ui.topic = "";
    ui.composer = null;
    render();
    return;
  }

  if (action === "use-topic") {
    const input = document.querySelector("#topicInput");
    if (input) {
      input.value = button.dataset.topic;
      ui.topic = input.value;
      updateTopicCounter();
    }
    return;
  }

  if (action === "reroll") {
    spinGacha(ui.composer?.topic || ui.topic, ui.composer?.draft?.templateId);
    return;
  }

  if (action === "choose-word") {
    chooseWord(button.dataset.choice);
    return;
  }

  if (action === "choose-again") {
    if (ui.composer?.draft) {
      ui.composer.step = "gacha";
      ui.composer.selectedChoice = "";
      render();
    }
    return;
  }

  if (action === "send-poem") {
    await sendPoem();
    return;
  }

  if (action === "toggle-reaction") {
    await toggleReaction(button.dataset.roomId, button.dataset.messageId, button.dataset.reaction);
    return;
  }

  if (action === "toggle-reaction-picker") {
    ui.openReactionFor = ui.openReactionFor === button.dataset.messageId ? "" : button.dataset.messageId;
    render();
    return;
  }

  if (action === "favorite-message") {
    await saveFavorite(button.dataset.messageId);
    return;
  }

  if (action === "choose-profile-photo") {
    document.querySelector("#profilePhotoInput")?.click();
    return;
  }

  if (action === "save-profile-photo") {
    await saveProfilePhoto();
    return;
  }

  if (action === "reply-yesterday") {
    ui.topic = "昨日の続き";
    ui.composer = null;
    ui.view = "topic";
    render();
    return;
  }

  if (action === "copy-invite") {
    await copyInvite(button.dataset.roomId);
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();

  if (form.dataset.form === "setup") {
    const name = form.name.value.trim();
    const icon = selectedRadio(form, "icon");
    if (!name) {
      showToast("ユーザー名を入れてください。");
      return;
    }

    const user = {
      id: makeId("user"),
      name,
      icon,
      provider: "google-mock",
      createdAt: Date.now(),
    };
    saveSessionUser(user);
    await upsertUser(user);
    await routeAfterAuth();
    return;
  }

  if (form.dataset.form === "room") {
    const name = form.roomName.value.trim();
    const type = selectedRadio(form, "roomType") || "pair";
    if (!name) {
      showToast("ルーム名を入れてください。");
      return;
    }

    const room = await createRoom(name, type);
    await setActiveRoom(room.id);
    ui.createResultId = room.id;
    render();
    showToast("招待リンクを作りました。");
    return;
  }

  if (form.dataset.form === "topic") {
    const topic = form.topic.value.trim();
    const count = countChars(topic);
    if (!topic) {
      showToast("お題を入れてください。");
      return;
    }
    if (count > 10) {
      showToast("お題は10字以内です。");
      return;
    }
    ui.topic = topic;
    spinGacha(topic);
  }
}

function handleInput(event) {
  if (event.target.id === "profilePhotoInput") {
    handleProfilePhotoSelection(event.target.files?.[0]);
    return;
  }
  if (event.target.id !== "topicInput") return;
  ui.topic = event.target.value;
  updateTopicCounter();
}

async function routeAfterAuth() {
  if (ui.pendingInviteRoomId) {
    const room = await ensureJoinedRoom(ui.pendingInviteRoomId);
    await setActiveRoom(room.id);
    ui.view = "chat";
    render();
    showToast("招待リンクから参加しました。");
    return;
  }

  ui.view = "home";
  render();
}

async function createRoom(name, type) {
  const id = makeId("room");
  const room = {
    id,
    name,
    type,
    createdBy: appState.user.id,
    inviteCode: id,
    members: createMembersForRoom(type),
    messages: [],
    createdAt: Date.now(),
  };
  if (isFirebaseMode()) {
    const { firestoreModule, db } = backend.firebase;
    await firestoreModule.setDoc(firestoreModule.doc(db, "rooms", id), {
      roomName: name,
      type,
      createdBy: appState.user.id,
      inviteCode: id,
      memberIds: [appState.user.id],
      members: createMembersForRoom(type),
      createdAt: firestoreModule.serverTimestamp(),
      createdAtMillis: room.createdAt,
    });
    upsertLocalRoom(room);
    return room;
  }
  sharedState = roomStore.update((data) => {
    data.rooms = [room, ...data.rooms.filter((item) => item.id !== room.id)];
    return data;
  });
  refreshAppState();
  return room;
}

function createMembersForRoom(type) {
  const current = normalizeUser(appState.user);
  return [current];
}

async function ensureJoinedRoom(roomId) {
  let room = findRoom(roomId);
  if (isFirebaseMode()) {
    const { firestoreModule, db } = backend.firebase;
    const roomRef = firestoreModule.doc(db, "rooms", roomId);
    const snapshot = await firestoreModule.getDoc(roomRef);
    const member = normalizeUser(appState.user);
    if (!snapshot.exists()) {
      room = {
        id: roomId,
        name: ui.pendingInviteName || `招待ルーム ${roomId.slice(-4).toUpperCase()}`,
        type: ui.pendingInviteType === "pair" ? "pair" : "group",
        createdBy: appState.user.id,
        inviteCode: roomId,
        members: [member],
        messages: [],
        createdAt: Date.now(),
      };
      await firestoreModule.setDoc(roomRef, {
        roomName: room.name,
        type: room.type,
        createdBy: appState.user.id,
        inviteCode: roomId,
        memberIds: [member.id],
        members: [member],
        createdAt: firestoreModule.serverTimestamp(),
        createdAtMillis: room.createdAt,
      });
      upsertLocalRoom(room);
      return room;
    }
    room = normalizeFirebaseRoom(snapshot);
    const hasUser = room.members.some((item) => item.id === member.id);
    if (!hasUser) {
      await firestoreModule.updateDoc(roomRef, {
        memberIds: firestoreModule.arrayUnion(member.id),
        members: firestoreModule.arrayUnion(member),
      });
      room.members.push(member);
    }
    upsertLocalRoom(room);
    subscribeFirebaseMessages(roomId);
    return room;
  }

  if (!room) {
    room = {
      id: roomId,
      name: ui.pendingInviteName || `招待ルーム ${roomId.slice(-4).toUpperCase()}`,
      type: ui.pendingInviteType === "pair" ? "pair" : "group",
      createdBy: "",
      inviteCode: roomId,
      members: [],
      messages: [],
      createdAt: Date.now(),
    };
    sharedState = roomStore.update((data) => {
      data.rooms = [room, ...data.rooms];
      return data;
    });
    refreshAppState();
    room = findRoom(roomId);
  }

  const hasUser = room.members.some((member) => member.id === appState.user.id);
  if (!hasUser) {
    const user = normalizeUser(appState.user);
    sharedState = roomStore.update((data) => {
      const target = data.rooms.find((item) => item.id === roomId);
      if (target && !target.members.some((member) => member.id === user.id)) target.members.push(user);
      return data;
    });
    refreshAppState();
    room = findRoom(roomId);
  }

  return room;
}

async function upsertUser(user) {
  const normalized = normalizeUser(user);
  if (isFirebaseMode()) {
    const { firestoreModule, db } = backend.firebase;
    await firestoreModule.setDoc(
      firestoreModule.doc(db, "users", normalized.id),
      {
        displayName: normalized.name,
        photoURL: normalized.photoURL || "",
        customIconURL: normalized.customIconURL || "",
        updatedAt: firestoreModule.serverTimestamp(),
      },
      { merge: true },
    );
  }
  upsertLocalUser(normalized);
}

function upsertLocalUser(user) {
  const normalized = normalizeUser(user);
  if (backend.mode === "firebase") {
    const users = sharedState.users.filter((item) => item.id !== normalized.id);
    sharedState = normalizeSharedState({ ...sharedState, users: [...users, normalized] });
    refreshAppState();
    return;
  }
  sharedState = roomStore.update((data) => {
    const index = data.users.findIndex((item) => item.id === normalized.id);
    if (index >= 0) data.users[index] = normalized;
    else data.users.push(normalized);
    return data;
  });
  refreshAppState();
}

function upsertLocalRoom(room) {
  const existing = sharedState.rooms.find((item) => item.id === room.id);
  const nextRoom = {
    ...room,
    messages: room.messages?.length ? room.messages : existing?.messages || [],
  };
  sharedState = normalizeSharedState({
    ...sharedState,
    rooms: [nextRoom, ...sharedState.rooms.filter((item) => item.id !== room.id)],
  });
  if (backend.mode !== "firebase") roomStore.save(sharedState);
  refreshAppState();
}

function upsertLocalMessage(roomId, message) {
  sharedState = normalizeSharedState({
    ...sharedState,
    rooms: sharedState.rooms.map((room) => {
      if (room.id !== roomId) return room;
      const messages = [message, ...room.messages.filter((item) => item.id !== message.id)].sort((a, b) => a.createdAt - b.createdAt);
      return { ...room, messages };
    }),
  });
  if (backend.mode !== "firebase") roomStore.save(sharedState);
  refreshAppState();
}

async function setActiveRoom(roomId) {
  appState.activeRoomId = roomId;
  sessionStorage.setItem(ACTIVE_ROOM_KEY, roomId);
  if (appState.user) await ensureJoinedRoom(roomId);
}

function spinGacha(topic, previousTemplateId = "") {
  if (!topic) return;
  ui.view = "gacha";
  ui.composer = {
    topic,
    step: "loading",
    draft: null,
    selectedChoice: "",
    loadingCopy: pickOne(gachaCaptions),
  };
  render();

  window.setTimeout(() => {
    if (!ui.composer || ui.composer.topic !== topic) return;
    ui.composer.draft = poemProvider.generate(topic, previousTemplateId);
    ui.composer.step = "gacha";
    render();
  }, 1700);
}

function chooseWord(choice) {
  if (!ui.composer || ui.composer.step !== "gacha") return;
  ui.composer.selectedChoice = choice;
  ui.composer.step = "dropping";
  render();

  window.setTimeout(() => {
    if (!ui.composer || ui.composer.selectedChoice !== choice) return;
    ui.composer.step = "resting";
    render();
    window.setTimeout(() => {
      if (!ui.composer || ui.composer.selectedChoice !== choice || ui.composer.step !== "resting") return;
      ui.composer.step = "confirm";
      render();
    }, 1050);
  }, 980);
}

async function sendPoem() {
  const room = currentRoom();
  const composer = ui.composer;
  if (!room || !composer?.draft || !composer.selectedChoice) return;

  const lines = completePoemLines(composer.draft, composer.selectedChoice);
  const message = {
    id: makeId("msg"),
    roomId: room.id,
    topic: composer.topic,
    lines,
    poemLines: lines,
    selectedWord: composer.selectedChoice,
    author: normalizeUser(appState.user),
    senderId: appState.user.id,
    senderName: appState.user.name,
    senderPhoto: getAvatarImage(appState.user) || appState.user.icon,
    reactions: {},
    createdAt: Date.now(),
  };

  if (isFirebaseMode()) {
    const { firestoreModule, db } = backend.firebase;
    try {
      const docRef = await firestoreModule.addDoc(firestoreModule.collection(db, "rooms", room.id, "messages"), {
        senderId: appState.user.id,
        senderName: appState.user.name,
        senderPhoto: getAvatarImage(appState.user) || appState.user.icon,
        topic: composer.topic,
        poemLines: lines,
        selectedWord: composer.selectedChoice,
        reactions: {},
        createdAt: firestoreModule.serverTimestamp(),
        createdAtMillis: message.createdAt,
      });
      message.id = docRef.id;
      upsertLocalMessage(room.id, message);
    } catch (error) {
      showToast("一首を送れませんでした。");
      return;
    }
  } else {
    sharedState = roomStore.update((data) => {
      const target = data.rooms.find((item) => item.id === room.id);
      if (target) target.messages.push(message);
      return data;
    });
    upsertLocalMessage(room.id, message);
  }
  await setActiveRoom(room.id);
  ui.composer = null;
  ui.topic = "";
  ui.openReactionFor = "";
  ui.view = "chat";
  render();
  showToast("ぽとんと届きました");
}

async function toggleReaction(roomId, messageId, label) {
  if (isFirebaseMode()) {
    const { firestoreModule, db } = backend.firebase;
    const messageRef = firestoreModule.doc(db, "rooms", roomId, "messages", messageId);
    await firestoreModule.runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(messageRef);
      if (!snapshot.exists()) return;
      const reactions = normalizeReactions(snapshot.data().reactions || {});
      if (!reactions[label]) reactions[label] = [];
      const users = reactions[label];
      const index = users.indexOf(appState.user.id);
      if (index >= 0) users.splice(index, 1);
      else users.push(appState.user.id);
      transaction.update(messageRef, { reactions });
    });
    ui.openReactionFor = "";
    render();
    return;
  }
  sharedState = roomStore.update((data) => {
    const room = data.rooms.find((item) => item.id === roomId);
    const message = room?.messages.find((item) => item.id === messageId);
    if (!message) return data;
    if (!message.reactions) message.reactions = {};
    if (!message.reactions[label]) message.reactions[label] = [];
    const users = message.reactions[label];
    const index = users.indexOf(appState.user.id);
    if (index >= 0) users.splice(index, 1);
    else users.push(appState.user.id);
    return data;
  });
  render();
}

async function saveFavorite(messageId) {
  const room = currentRoom();
  const message = room?.messages.find((item) => item.id === messageId);
  if (!message) return;

  appState.favorite = {
    messageId: message.id,
    roomId: room.id,
    roomName: room.name,
    topic: message.topic,
    lines: message.lines,
    authorName: message.author.name,
    savedAt: Date.now(),
  };
  if (isFirebaseMode()) {
    sharedState = normalizeSharedState({
      ...sharedState,
      favorites: { ...sharedState.favorites, [appState.user.id]: appState.favorite },
    });
    const { firestoreModule, db } = backend.firebase;
    await firestoreModule.setDoc(
      firestoreModule.doc(db, "users", appState.user.id),
      {
        favoritePoem: appState.favorite,
        updatedAt: firestoreModule.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    sharedState = roomStore.update((data) => {
      data.favorites[appState.user.id] = appState.favorite;
      return data;
    });
  }
  render();
  showToast("お気に入りの一句を置き換えました。");
}

async function handleProfilePhotoSelection(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("画像ファイルを選んでください。");
    return;
  }
  try {
    ui.pendingPhoto = await resizeImageToDataUrl(file, 180);
    render();
  } catch (error) {
    showToast("写真を読み込めませんでした。");
  }
}

async function saveProfilePhoto() {
  if (!ui.pendingPhoto || !appState.user) return;
  const updatedUser = normalizeUser({
    ...appState.user,
    customIconURL: ui.pendingPhoto,
  });
  if (isFirebaseMode()) {
    const { firestoreModule, db } = backend.firebase;
    await firestoreModule.setDoc(
      firestoreModule.doc(db, "users", updatedUser.id),
      {
        displayName: updatedUser.name,
        photoURL: updatedUser.photoURL || "",
        customIconURL: updatedUser.customIconURL,
        updatedAt: firestoreModule.serverTimestamp(),
      },
      { merge: true },
    );
    await updateSenderPhotoInJoinedRooms(updatedUser);
  }
  saveSessionUser(updatedUser);
  updateLocalProfile(updatedUser);
  ui.pendingPhoto = "";
  render();
  showToast("写真をアイコンにしました。");
}

async function updateSenderPhotoInJoinedRooms(user) {
  if (!isFirebaseMode()) return;
  const { firestoreModule, db } = backend.firebase;
  await Promise.all(
    sharedState.rooms.map((room) => {
      const roomRef = firestoreModule.doc(db, "rooms", room.id);
      const nextMembers = room.members.map((member) => (member.id === user.id ? user : member));
      return firestoreModule.setDoc(
        roomRef,
        {
          members: nextMembers,
          updatedAt: firestoreModule.serverTimestamp(),
        },
        { merge: true },
      );
    }),
  );
}

function updateLocalProfile(user) {
  const normalized = normalizeUser(user);
  sharedState = normalizeSharedState({
    ...sharedState,
    users: [...sharedState.users.filter((item) => item.id !== normalized.id), normalized],
    rooms: sharedState.rooms.map((room) => ({
      ...room,
      members: room.members.map((member) => (member.id === normalized.id ? normalized : member)),
      messages: room.messages.map((message) =>
        message.author.id === normalized.id
          ? {
              ...message,
              author: normalized,
              senderPhoto: getAvatarImage(normalized) || normalized.icon,
            }
          : message,
      ),
    })),
  });
  if (backend.mode !== "firebase") roomStore.save(sharedState);
  refreshAppState();
}

function resizeImageToDataUrl(file, size) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const poemProvider = {
  generate(topic, previousTemplateId = "") {
    const normalizedTopic = topic.trim();
    const scored = poemLibrary
      .map((template) => ({
        template,
        score: template.tags.reduce((total, tag) => {
          if (normalizedTopic === tag) return total + 5;
          if (normalizedTopic.includes(tag) || tag.includes(normalizedTopic)) return total + 2;
          return total;
        }, template.tags.length ? 0 : 1),
      }))
      .sort((a, b) => b.score - a.score);

    const bestScore = scored[0]?.score || 0;
    let pool = scored.filter((item) => item.score === bestScore).map((item) => item.template);
    if (pool.length === 1 && pool[0].id === previousTemplateId) {
      pool = poemLibrary.filter((template) => template.id !== previousTemplateId);
    } else {
      pool = pool.filter((template) => template.id !== previousTemplateId) || pool;
    }

    const template = pickOne(pool.length ? pool : poemLibrary);
    return {
      templateId: template.id,
      topic: normalizedTopic,
      lines: template.lines.map((line) => line.replaceAll("{{topic}}", normalizedTopic)),
      choices: shuffle(template.choices).slice(0, 4),
    };
  },
};

function completePoemLines(draft, selectedChoice) {
  return draft.lines.map((line) => (line === BLANK ? selectedChoice : line));
}

function getYesterdayReflection(room) {
  const yesterdayMessages = room.messages
    .filter((message) => isYesterday(message.createdAt))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (yesterdayMessages.length === 0) return null;
  const message = yesterdayMessages[0];
  const seed = Math.abs(Array.from(message.id).reduce((total, char) => total + char.charCodeAt(0), 0));
  return {
    message,
    copy: reflectionCopies[seed % reflectionCopies.length],
    question: reflectionQuestions[seed % reflectionQuestions.length],
  };
}

function isYesterday(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  return date.getTime() >= startOfYesterday && date.getTime() < startOfToday;
}

function updateTopicCounter() {
  const input = document.querySelector("#topicInput");
  const countTarget = document.querySelector("#topicCount");
  const counter = document.querySelector("#topicCounter");
  const submit = document.querySelector("#topicSubmit");
  if (!input || !countTarget || !counter || !submit) return;

  const count = countChars(input.value.trim());
  const remaining = 10 - count;
  countTarget.textContent = remaining >= 0 ? `残り${remaining}字` : `${Math.abs(remaining)}字オーバー`;
  counter.classList.toggle("is-over", remaining < 0);
  submit.disabled = count === 0 || remaining < 0;
}

async function copyInvite(roomId) {
  const room = findRoom(roomId);
  if (!room) return;
  await copyText(makeInviteLink(room.id));
  showToast("招待リンクをコピーしました。");
}

function makeInviteLink(roomId) {
  const url = new URL(window.location.href);
  const room = findRoom(roomId);
  url.searchParams.set("roomId", roomId);
  if (room?.name) url.searchParams.set("roomName", room.name);
  if (room?.type) url.searchParams.set("roomType", room.type);
  url.hash = "";
  return url.toString();
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // ローカル表示では使えない場合があるので、下の方法に戻します。
    }
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function currentRoom() {
  return findRoom(appState.activeRoomId);
}

function renderAvatar(user, className = "avatar", title = "") {
  const image = getAvatarImage(user);
  const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
  if (image) return `<span class="${escapeAttribute(className)}"${titleAttribute}><img src="${escapeAttribute(image)}" alt="" /></span>`;
  return `<span class="${escapeAttribute(className)}"${titleAttribute}>${escapeHtml(user?.icon || "ぽ")}</span>`;
}

function getAvatarImage(user) {
  return user?.customIconURL || user?.photoURL || (isImageValue(user?.icon) ? user.icon : "");
}

function isImageValue(value) {
  return typeof value === "string" && (value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://"));
}

function findRoom(roomId) {
  return appState.rooms.find((room) => room.id === roomId);
}

function persistShared() {
  sharedState = roomStore.save(sharedState);
  refreshAppState();
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2300);
}

function makeId(prefix) {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function countChars(text) {
  return Array.from(text).length;
}

function pickOne(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatDate(value) {
  const millis = toMillis(value) || Date.now();
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(millis);
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(text) {
  return escapeHtml(text).replaceAll("`", "&#096;");
}

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);
app.addEventListener("input", handleInput);

render();
initBackend();
