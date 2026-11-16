const form = document.querySelector("#bellForm");
const worryInput = document.querySelector("#worryInput");
const charCount = document.querySelector("#charCount");
const emptyHint = document.querySelector("#emptyHint");
const pagerCode = document.querySelector("#pagerCode");
const categoryLabel = document.querySelector("#categoryLabel");
const pagerPreview = document.querySelector("#pagerPreview");
const resultList = document.querySelector("#resultList");
const copyAllButton = document.querySelector("#copyAllButton");
const copyStatus = document.querySelector("#copyStatus");
const sampleButtons = document.querySelectorAll("[data-sample]");

const categoryData = {
  job: {
    label: "就活",
    code: "4510",
    pager: ["エラバレルノ、コワイ。デモ、コエハアル", "ナイテイヨリ、キョウノホンネ"],
    friend: "3分だけ、就活をちゃんと怖がる時間つくらない？",
    question: "面接やESで、いちばん自分を小さく見せてしまう瞬間はどこだろう？",
    voice: "まだ選ばれていないだけで、私が消えたわけじゃない。",
    memo: "就活不安を個人の弱さではなく、選ばれる側に立たされる若者の社会的な緊張として見せられる点が強い。",
  },
  ai: {
    label: "AIに仕事を奪われる不安",
    code: "2045",
    pager: ["AI、シゴト、コワイ。デモ、コエハノコル", "ミライガハヤイ。3プン、トメル"],
    friend: "3分だけ、AIに仕事を奪われる怖さをそのまま話してみない？",
    question: "AIが仕事を変えるとして、自分に残ってほしいものって何だろう？",
    voice: "答えはまだない。でも、この速さにひとりで追いつかなくてもいい。",
    memo: "AIで不安を解決するのではなく、AI時代のキャリア不安を友人同士の会話へ変換する点が新しい。",
  },
  future: {
    label: "将来",
    code: "3910",
    pager: ["ミライ、コワイ。デモ、ヒトリジャナイ", "コタエナシ。コエアリ。"],
    friend: "3分だけ、将来のことをちゃんと怖がる時間つくらない？",
    question: "未来が不安なとき、それでも手放したくない生活の感じは何だろう？",
    voice: "まだ答えはない。でも、この不安を誰かと持ってみたい。",
    memo: "未来不安を正解探しにせず、話し始める余白としてデザインしている点が応募時の見せ場になる。",
  },
  friend: {
    label: "友だち関係",
    code: "3341",
    pager: ["ホンネ、オモクナイ。スコシダケ", "イエナイコト、3プンダケ"],
    friend: "ちょっとだけ本音を出す練習に付き合ってくれない？重くしないから。",
    question: "友だちに話せないのは、心配させたくないから？それとも比べられたくないから？",
    voice: "うまく言えなくてもいい。近い人にほど、短く鳴らしてみたい。",
    memo: "友人関係の距離感を責めず、短い通信で本音の入口をつくるUI体験として説明できる。",
  },
  vague: {
    label: "なんとなく不安",
    code: "0003",
    pager: ["ナンカコワイ。ソレモ、シグナル", "モヤモヤ、シンヤノベル"],
    friend: "理由はまだ薄いんだけど、3分だけモヤモヤを言葉にするの付き合って。",
    question: "名前のついていない不安に、仮のタイトルをつけるなら何だろう？",
    voice: "はっきりしない不安にも、鳴っている理由があるのかもしれない。",
    memo: "言語化できない不安も参加できるため、相談アプリより軽く、ZINEのような余白を持つ体験になる。",
  },
};

const keywordRules = [
  {
    name: "job",
    words: ["就活", "面接", "ES", "内定"],
    focus: "選ばれる怖さ",
    pagerWord: "シュウカツ",
  },
  {
    name: "ai",
    words: ["AI", "仕事", "奪われる", "将来"],
    focus: "AI時代の速さ",
    pagerWord: "AI",
  },
  {
    name: "friend",
    words: ["友だち", "話せない", "本音"],
    focus: "近い人に言えない感じ",
    pagerWord: "ホンネ",
  },
  {
    name: "anxiety",
    words: ["不安", "怖い", "焦り", "しんどい"],
    focus: "胸のざわつき",
    pagerWord: "コワイ",
  },
];

let latestResults = [];

function getSelectedCategory() {
  return document.querySelector("input[name='category']:checked").value;
}

function setSelectedCategory(value) {
  const radio = document.querySelector(`input[name='category'][value="${value}"]`);
  if (radio) radio.checked = true;
}

function detectSignals(text) {
  return keywordRules.filter((rule) => rule.words.some((word) => text.includes(word)));
}

function pick(items, seed) {
  return items[Math.abs(seed) % items.length];
}

function shortQuote(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 34) return compact;
  return `${compact.slice(0, 34)}...`;
}

function buildResults(text, categoryKey) {
  const data = categoryData[categoryKey];
  const signals = detectSignals(text);
  const mainSignal = signals[0];
  const focus = mainSignal ? mainSignal.focus : "まだ名前のない不安";
  const pagerWord = mainSignal ? mainSignal.pagerWord : data.label;
  const seed = text.length + categoryKey.length + signals.length;
  const quote = shortQuote(text);

  const pagerMessage =
    signals.length > 0
      ? `${pagerWord}、${focus.replace("怖さ", "コワイ").replace("速さ", "ハヤイ")}。3プン、ワケアウ`
      : pick(data.pager, seed);

  return [
    {
      title: "ポケベル風メッセージ",
      text: pagerMessage,
    },
    {
      title: "友だちに送れる一言",
      text:
        signals.length > 0
          ? `${data.friend} いま近いのは「${focus}」かも。`
          : data.friend,
    },
    {
      title: "3分だけ話すための問い",
      text:
        signals.length > 0
          ? `${data.question} 入力してくれた「${quote}」の中で、いちばん声に出しにくい部分はどこ？`
          : data.question,
    },
    {
      title: "声に出して読める短いセリフ",
      text:
        signals.length > 0
          ? `${data.voice} まずは「${focus}」を、少しだけ外に置いてみる。`
          : data.voice,
    },
    {
      title: "勝ち筋メモ",
      text: `${data.memo} この画面では「${quote}」のような個人の声を、ポケベル風の短文と3分トークへ変換している。`,
    },
  ];
}

function renderResults(results, categoryKey) {
  const data = categoryData[categoryKey];
  latestResults = results;
  pagerCode.textContent = data.code;
  categoryLabel.textContent = data.label;
  pagerPreview.textContent = results[0].text;
  copyAllButton.disabled = false;

  resultList.innerHTML = results
    .map(
      (item, index) => `
        <article class="result-card">
          <div>
            <span>${item.title}</span>
            <p>${item.text}</p>
          </div>
          <button class="copy-button" type="button" data-copy-index="${index}">コピー</button>
        </article>
      `,
    )
    .join("");
}

function showEmptyMessage() {
  emptyHint.textContent = "まずは一文だけ入力してください。例ボタンでも試せます。";
  emptyHint.classList.add("is-alert");
  worryInput.focus();
}

function generate() {
  const text = worryInput.value.trim();
  const categoryKey = getSelectedCategory();

  if (!text) {
    showEmptyMessage();
    return;
  }

  emptyHint.textContent = "一文だけでも大丈夫です。";
  emptyHint.classList.remove("is-alert");
  renderResults(buildResults(text, categoryKey), categoryKey);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
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
}

function formatAllResults() {
  return latestResults.map((item) => `${item.title}：\n${item.text}`).join("\n\n");
}

worryInput.addEventListener("input", () => {
  charCount.textContent = String(worryInput.value.length);
  if (worryInput.value.trim()) {
    emptyHint.textContent = "一文だけでも大丈夫です。";
    emptyHint.classList.remove("is-alert");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

sampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    worryInput.value = button.dataset.sample;
    setSelectedCategory(button.dataset.category);
    charCount.textContent = String(worryInput.value.length);
    generate();
  });
});

resultList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-index]");
  if (!button) return;

  const item = latestResults[Number(button.dataset.copyIndex)];
  await copyText(item.text);
  copyStatus.textContent = `${item.title}をコピーしました。`;
});

copyAllButton.addEventListener("click", async () => {
  if (latestResults.length === 0) return;
  await copyText(formatAllResults());
  copyStatus.textContent = "生成結果をまとめてコピーしました。";
});
