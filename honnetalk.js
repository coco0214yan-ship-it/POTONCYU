const form = document.querySelector("#conversationForm");
const talkInput = document.querySelector("#talkInput");
const topicText = document.querySelector("#topicText");
const listenText = document.querySelector("#listenText");
const starterText = document.querySelector("#starterText");
const shuffleButton = document.querySelector("#shuffleButton");
const toneButtons = document.querySelectorAll("[data-tone]");
const presetButtons = document.querySelectorAll("[data-preset]");

let selectedTone = "gentle";
let lastInput = "";
let answerIndex = 0;

const toneLabels = {
  gentle: "やさしく",
  light: "軽めに",
  deep: "深めに",
};

const ideaSets = [
  {
    keywords: ["授業", "課題", "勉強", "テスト", "ゼミ", "学校"],
    topic: "最近、学校のことで一番頭に残っていることって何？",
    listen: "それって大変だった？それとも少し楽しかった？どっちに近い？",
    starter: "自分は最近、ちゃんとできてるか少し不安になる時がある。",
  },
  {
    keywords: ["バイト", "仕事", "疲れ", "忙しい", "寝不足"],
    topic: "最近、無理して笑っている場面ってある？",
    listen: "頑張ってるのは伝わる。どの瞬間が一番しんどい？",
    starter: "自分も疲れてる時ほど、平気なふりをしがちかも。",
  },
  {
    keywords: ["将来", "就活", "夢", "進路", "不安"],
    topic: "将来のことで、楽しみより不安が勝つ瞬間ってある？",
    listen: "正解を出さなくていいなら、今どんな未来が少し怖い？",
    starter: "自分も先のことを考えると、置いていかれそうに感じる時がある。",
  },
  {
    keywords: ["友達", "人間関係", "恋愛", "喧嘩", "距離", "LINE"],
    topic: "最近、人との距離感で少し気になっていることある？",
    listen: "それ、相手に言えたら楽になりそう？それとも言わない方が楽？",
    starter: "自分は仲良い人ほど、言い方を考えすぎる時がある。",
  },
  {
    keywords: ["寂しい", "孤独", "ひとり", "モヤモヤ", "つらい"],
    topic: "人といるのに少し寂しい時って、どんな時？",
    listen: "その寂しさって、誰かにわかってほしい感じ？それとも休みたい感じ？",
    starter: "自分も人とつながってるのに、急にひとりっぽく感じる時がある。",
  },
];

const fallbackIdeas = [
  {
    topic: "最近、言葉にしていないけど本当は話したかったことある？",
    listen: "うまく説明しなくて大丈夫。少しだけ近い気持ちで言うと何？",
    starter: "自分も本音を話すタイミングを逃すことがある。",
  },
  {
    topic: "最近の自分を一言で言うなら、どんな感じ？",
    listen: "その一言になった理由って、何が大きい？",
    starter: "自分は最近、元気な日とそうじゃない日の差があるかも。",
  },
  {
    topic: "今の生活で、もう少し誰かにわかってほしいことは何？",
    listen: "それをわかってもらえたら、どんな感じになりそう？",
    starter: "自分も全部は言わないけど、わかってほしいことはある。",
  },
];

function findIdea(text) {
  const normalizedText = text.trim();

  const matched = ideaSets.find((set) =>
    set.keywords.some((keyword) => normalizedText.includes(keyword)),
  );

  if (matched) {
    return matched;
  }

  return fallbackIdeas[answerIndex % fallbackIdeas.length];
}

function adjustByTone(idea) {
  if (selectedTone === "light") {
    return {
      topic: idea.topic.replace("ってある？", "ってある？話せる範囲で！"),
      listen: `重くしすぎず聞くなら「${idea.listen}」`,
      starter: `軽く出すなら「${idea.starter}」`,
    };
  }

  if (selectedTone === "deep") {
    return {
      topic: `${idea.topic} もし少し深く聞くなら、何が一番心に残ってる？`,
      listen: `${idea.listen} すぐ答えを出さなくていいよ。`,
      starter: `${idea.starter} 今日は少し本音で話してみたい。`,
    };
  }

  return idea;
}

function renderIdea() {
  const baseIdea = findIdea(lastInput || talkInput.value);
  const idea = adjustByTone(baseIdea);

  topicText.textContent = idea.topic;
  listenText.textContent = idea.listen;
  starterText.textContent = idea.starter;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  lastInput = talkInput.value;
  answerIndex = 0;
  renderIdea();
});

shuffleButton.addEventListener("click", () => {
  answerIndex += 1;
  renderIdea();
});

toneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedTone = button.dataset.tone;
    toneButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    button.setAttribute("aria-label", `${toneLabels[selectedTone]}を選択中`);
    renderIdea();
  });
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    talkInput.value = button.dataset.preset;
    lastInput = talkInput.value;
    answerIndex = 0;
    renderIdea();
  });
});
