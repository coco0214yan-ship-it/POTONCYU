const form = document.querySelector("#bellForm");
const senderName = document.querySelector("#senderName");
const noteInput = document.querySelector("#noteInput");
const noteCount = document.querySelector("#noteCount");
const pagerCode = document.querySelector("#pagerCode");
const pagerTitle = document.querySelector("#pagerTitle");
const pagerQuestion = document.querySelector("#pagerQuestion");
const aiMemo = document.querySelector("#aiMemo");
const recordButton = document.querySelector("#recordButton");
const stopButton = document.querySelector("#stopButton");
const clearAudioButton = document.querySelector("#clearAudioButton");
const recordStatus = document.querySelector("#recordStatus");
const recordTime = document.querySelector("#recordTime");
const recordDot = document.querySelector("#recordDot");
const audioPreview = document.querySelector("#audioPreview");
const timeline = document.querySelector("#timeline");
const friendList = document.querySelector("#friendList");
const replyButtons = document.querySelectorAll("[data-reaction]");

const STORAGE_KEY = "honnebell.entries.v1";
const MAX_RECORD_SECONDS = 30;

const friends = [
  { name: "ミナ", text: "焦る日の声、ちゃんと届いてる" },
  { name: "ソウ", text: "答えより先に、一回聞くよ" },
  { name: "ユイ", text: "週末に少しだけ話そ" },
];

const topicMap = {
  job: {
    code: "4510",
    label: "就活",
    title: "選ばれる前に、自分が遠くなる",
    question: "就活で一番こわいのは、落ちること？それとも自分がわからなくなること？",
    memo: "就活の不安を、企業選びではなく気持ちの距離として編集しました。",
  },
  ai: {
    code: "2045",
    label: "AI",
    title: "AIが進むほど、何者かが揺れる",
    question: "AIに奪われそうで不安なものは、仕事・努力・自信のどれに近い？",
    memo: "AI不安を、技術の話ではなく自分の価値への不安として短くしました。",
  },
  friend: {
    code: "3341",
    label: "友達",
    title: "近いのに、言えないことがある",
    question: "友達に言えないのは、心配させたくないから？比べられたくないから？",
    memo: "友達との距離を責めずに、話し出す入口になる問いへ変えました。",
  },
  future: {
    code: "3910",
    label: "将来",
    title: "未来のことを考えると、足元がぼやける",
    question: "未来が不安なとき、ほんとうは何を守りたい？",
    memo: "大きすぎる将来不安を、今日話せる小さな問いに分けました。",
  },
};

let mediaRecorder = null;
let chunks = [];
let audioDataUrl = "";
let seconds = 0;
let timerId = null;
let entries = loadEntries();
let activeEntryId = entries[0]?.id || null;

function getTopic() {
  return document.querySelector("input[name='topic']:checked").value;
}

function getTemplate() {
  return topicMap[getTopic()];
}

function updateCount() {
  noteCount.textContent = String(noteInput.value.length);
}

function summarizeNote(note, template) {
  const trimmed = note.trim();

  if (!trimmed) return template.title;
  if (trimmed.includes("焦") || trimmed.includes("比べ")) return "比べるほど、自分の声が小さくなる";
  if (trimmed.includes("AI") || trimmed.includes("仕事")) return "AIのニュースで、未来が急に速くなる";
  if (trimmed.includes("友達") || trimmed.includes("言え")) return "友達にほど、軽く言えない";
  if (trimmed.includes("将来") || trimmed.includes("未来")) return "未来の話が、今の胸に残っている";

  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}...` : trimmed;
}

function updatePreview() {
  const template = getTemplate();
  const title = summarizeNote(noteInput.value, template);

  pagerCode.textContent = template.code;
  pagerTitle.textContent = title;
  pagerQuestion.textContent = template.question;
  aiMemo.textContent = template.memo;
}

function formatTime(value) {
  return `00:${String(value).padStart(2, "0")}`;
}

function setRecordingState(isRecording) {
  recordButton.disabled = isRecording;
  stopButton.disabled = !isRecording;
  recordDot.classList.toggle("is-recording", isRecording);
  recordStatus.textContent = isRecording ? "録音中" : audioDataUrl ? "録音済み" : "録音待ち";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    recordStatus.textContent = "このブラウザでは録音できません";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    seconds = 0;
    recordTime.textContent = formatTime(seconds);
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      audioDataUrl = await blobToDataUrl(blob);
      audioPreview.src = audioDataUrl;
      audioPreview.hidden = false;
      clearAudioButton.disabled = false;
      setRecordingState(false);
    });

    mediaRecorder.start();
    setRecordingState(true);

    timerId = window.setInterval(() => {
      seconds += 1;
      recordTime.textContent = formatTime(seconds);
      if (seconds >= MAX_RECORD_SECONDS) stopRecording();
    }, 1000);
  } catch (error) {
    recordStatus.textContent = "マイクを使えませんでした";
  }
}

function stopRecording() {
  window.clearInterval(timerId);
  timerId = null;

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

function clearAudio() {
  audioDataUrl = "";
  audioPreview.removeAttribute("src");
  audioPreview.hidden = true;
  clearAudioButton.disabled = true;
  recordTime.textContent = "00:00";
  setRecordingState(false);
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 9)));
}

function renderFriends() {
  friendList.innerHTML = friends
    .map((friend) => {
      const initial = friend.name.slice(0, 1);
      return `
        <div class="friend">
          <span class="avatar">${initial}</span>
          <p>
            <strong>${friend.name}</strong>
            <span>${friend.text}</span>
          </p>
        </div>
      `;
    })
    .join("");
}

function renderTimeline() {
  if (entries.length === 0) {
    timeline.innerHTML = '<div class="empty-state">まだ本音ベルはありません。最初の30秒を置いてみてください。</div>';
    return;
  }

  timeline.innerHTML = entries
    .map((entry) => {
      const reactions = entry.reactions.length ? `反応: ${entry.reactions.join(" / ")}` : "反応待ち";
      const audio = entry.audio ? `<audio controls src="${entry.audio}"></audio>` : "";
      return `
        <article class="entry" data-id="${entry.id}">
          <span class="code">${entry.code}</span>
          <time>${entry.date} / ${entry.topicLabel}</time>
          <strong>${entry.title}</strong>
          <p>${entry.question}</p>
          ${audio}
          <p>${reactions}</p>
        </article>
      `;
    })
    .join("");
}

function addEntry(event) {
  event.preventDefault();
  const template = getTemplate();
  const now = new Date();
  const title = summarizeNote(noteInput.value, template);
  const note = noteInput.value.trim();

  const entry = {
    id: String(Date.now()),
    sender: senderName.value.trim() || "わたし",
    code: template.code,
    topicLabel: template.label,
    title,
    question: template.question,
    note,
    audio: audioDataUrl,
    reactions: [],
    date: `${now.getMonth() + 1}/${now.getDate()}`,
  };

  entries.unshift(entry);
  activeEntryId = entry.id;
  saveEntries();
  renderTimeline();
  noteInput.value = "";
  updateCount();
  clearAudio();
  updatePreview();
}

function addReaction(reaction) {
  if (!activeEntryId && entries[0]) activeEntryId = entries[0].id;
  const entry = entries.find((item) => item.id === activeEntryId);
  if (!entry) return;

  entry.reactions.push(reaction);
  saveEntries();
  renderTimeline();
}

noteInput.addEventListener("input", () => {
  updateCount();
  updatePreview();
});

document.querySelectorAll("input[name='topic']").forEach((radio) => {
  radio.addEventListener("change", updatePreview);
});

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
clearAudioButton.addEventListener("click", clearAudio);
form.addEventListener("submit", addEntry);

replyButtons.forEach((button) => {
  button.addEventListener("click", () => addReaction(button.dataset.reaction));
});

renderFriends();
renderTimeline();
updateCount();
updatePreview();
