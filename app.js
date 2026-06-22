const categories = [
  {
    key: "assignment",
    label: "課題中",
    hint: "締切も横目",
    items: [
      {
        lines: ["課題より", "先に片づけたい", "__", "でも締切も", "普通にやばい"],
        choices: ["胸の中", "LINEの返信", "明日の自分", "眠気"],
        question: "今いちばん片づけたいの、どれ？",
      },
      {
        lines: ["やる気なら", "さっきまでそこに", "__", "たぶん今ごろ", "売店あたり"],
        choices: ["いたはずで", "寝てました", "置いてきた", "逃げました"],
        question: "やる気がいなくなる瞬間、だいたいどこ？",
      },
      {
        lines: ["レポートの", "空白よりも", "__", "見つめてしまう", "午後三時"],
        choices: ["友達の顔", "天井のしみ", "通知の数字", "次の休憩"],
        question: "この中で一番しっくりきた言葉どれ？",
      },
      {
        lines: ["締切が", "近いと急に", "__", "人生の話", "始めがちです"],
        choices: ["深くなる", "逃げたくなる", "優しくなる", "変に冴える"],
        question: "締切前に出てくる変な集中、ある？",
      },
    ],
  },
  {
    key: "tired",
    label: "ちょい疲れ",
    hint: "軽い限界",
    items: [
      {
        lines: ["疲れたね", "それだけ言って", "__", "今日の重さを", "半分にする"],
        choices: ["笑い合う", "水を飲む", "空を見る", "席をずらす"],
        question: "疲れた日の回復って、何が効く？",
      },
      {
        lines: ["元気では", "ないけどなぜか", "__", "くだらないことで", "まだ笑えてる"],
        choices: ["帰らない", "しゃべってる", "座ってる", "持ちこたえる"],
        question: "疲れてるのに笑える相手、いる？",
      },
      {
        lines: ["もう無理と", "言った顔だけ", "__", "ポテト一本", "ちゃんと食べてる"],
        choices: ["本気です", "助かってる", "笑ってる", "眠そうで"],
        question: "今日の自分、何点くらいで許す？",
      },
      {
        lines: ["ちょい疲れ", "言葉にしたら", "__", "思ったよりも", "人間だった"],
        choices: ["軽くなり", "腹が減り", "眠くなり", "笑えてきて"],
        question: "最近、自分が人間だなと思った瞬間ある？",
      },
    ],
  },
  {
    key: "talky",
    label: "なんか話したい",
    hint: "用事なし集合",
    items: [
      {
        lines: ["話題なら", "ないと言いつつ", "ある顔で", "__", "こぼれてほしい"],
        choices: ["笑い話から", "帰り道から", "ポテトの端から", "くだらない話から"],
        question: "大げさじゃないけど、最近残ってることある？",
      },
      {
        lines: ["言うほどの", "ことでもないが", "__", "机の上で", "まだ帰らない"],
        choices: ["残ってる", "引っかかる", "笑ってる", "転がってる"],
        question: "これ、誰っぽい？",
      },
      {
        lines: ["なんかさ", "言ったあとだけ", "__", "全員ちょっと", "聞く顔になる"],
        choices: ["長くなる", "静かになる", "目が合う", "空気変わる"],
        question: "最近これに近い瞬間あった？",
      },
      {
        lines: ["帰るには", "まだ少しだけ", "__", "話す理由を", "探してしまう"],
        choices: ["早すぎて", "惜しくって", "もったいなくて", "眠くなくて"],
        question: "帰りそびれるとき、何が起きてる？",
      },
    ],
  },
  {
    key: "scrolling",
    label: "スマホ見すぎ",
    hint: "親指帰宅ぎみ",
    items: [
      {
        lines: ["となりいて", "画面の中に", "__", "話したいこと", "机に残る"],
        choices: ["逃げていく", "吸い込まれる", "帰ってこない", "親指だけ元気"],
        question: "スマホ見られて冷める瞬間、ある？",
      },
      {
        lines: ["通知より", "となりの声が", "__", "なのに画面を", "まだ見てしまう"],
        choices: ["近いのに", "小さい日", "気になるし", "遅れてくる"],
        question: "画面置いたら出てきそうな話、ある？",
      },
      {
        lines: ["スクロール", "しすぎて今日が", "__", "友達の変顔", "急に濃すぎる"],
        choices: ["薄くなる", "遠くなる", "溶けていく", "迷子になる"],
        question: "最近、画面より濃かった瞬間ある？",
      },
      {
        lines: ["親指が", "先に帰って", "__", "まだ温かい", "紙コップだけ"],
        choices: ["しまいそう", "こなさそう", "働きすぎ", "元気すぎる"],
        question: "逆に今の空気を一言で言うなら？",
      },
    ],
  },
  {
    key: "leaving",
    label: "帰る前",
    hint: "解散前の余白",
    items: [
      {
        lines: ["帰ろうか", "言ったあとから", "__", "そういう時間", "だいたい大事"],
        choices: ["話し出す", "黙りこむ", "笑い出す", "本題になる"],
        question: "帰る前に話し出したくなること、ある？",
      },
      {
        lines: ["じゃあまたね", "言うには少し", "__", "駅までの道", "ゆっくりになる"],
        choices: ["早すぎて", "惜しくって", "さみしくて", "照れくさくて"],
        question: "帰り道で出る話って、昼と違う？",
      },
      {
        lines: ["解散の", "空気になって", "__", "会話のほうが", "本気出してる"],
        choices: ["からのほう", "なぜか急に", "今さら少し", "変な感じで"],
        question: "これ、ある？ない？",
      },
      {
        lines: ["コンビニの", "前で止まった", "__", "買うものないのに", "まだ帰れない"],
        choices: ["足だけが", "二人だけ", "会話だけ", "夜だけが"],
        question: "寄り道したくなる相手っている？",
      },
    ],
  },
  {
    key: "laugh",
    label: "笑って終わりたい",
    hint: "最後は雑でいい",
    items: [
      {
        lines: ["話したら", "思ったよりも", "__", "またくだらない", "ことで笑える"],
        choices: ["軽くなり", "近くなり", "眠くなり", "変になる"],
        question: "どの行が一番わかる？",
      },
      {
        lines: ["重い話", "したあと急に", "__", "そういう雑さ", "かなり助かる"],
        choices: ["変な顔", "ポテト食う", "水を飲む", "声が裏返る"],
        question: "空気を戻してくれる人、誰？",
      },
      {
        lines: ["笑い声", "最後にひとつ", "__", "今日の続きは", "明日でいいや"],
        choices: ["置いていく", "転がして", "持って帰る", "残してく"],
        question: "終わり方が良かった日、最近あった？",
      },
      {
        lines: ["真面目すぎ", "そう言いながら", "__", "救われたのを", "ごまかしている"],
        choices: ["笑うから", "茶化すから", "食べるから", "帰るから"],
        question: "救われたのをごまかすとき、何する？",
      },
    ],
  },
  {
    key: "freePeriod",
    label: "空きコマ",
    hint: "無限っぽい60分",
    items: [
      {
        lines: ["空きコマで", "何かできると", "__", "結局いつも", "だべって終わる"],
        choices: ["思ってた", "言っていた", "信じてた", "夢見てた"],
        question: "空きコマ、何に消えがち？",
      },
      {
        lines: ["一時間", "未来を変える", "__", "ポテトの前で", "全部ゆるんだ"],
        choices: ["気でいたが", "はずだった", "顔をして", "予定だけ"],
        question: "空きコマにだけ出る話、ある？",
      },
      {
        lines: ["ソファ席", "沈んだままで", "__", "世界のことより", "昼飯を決める"],
        choices: ["三人で", "動けずに", "真剣に", "なぜか今"],
        question: "この一首、今の誰に近い？",
      },
      {
        lines: ["暇すぎて", "話が急に", "__", "自販機だけが", "ずっと明るい"],
        choices: ["深くなる", "変になる", "長くなる", "近くなる"],
        question: "暇だからこそ話せること、ある？",
      },
    ],
  },
  {
    key: "starbucks",
    label: "スタバ勉強",
    hint: "意識と休憩",
    items: [
      {
        lines: ["スタバ来て", "勉強するぞと", "__", "まずは写真を", "撮って落ち着く"],
        choices: ["開いたら", "座ったら", "言ったけど", "思ったら"],
        question: "勉強場所で気分だけ上がること、ある？",
      },
      {
        lines: ["ノートより", "ラテの泡だけ", "__", "意識高めの", "低空飛行で"],
        choices: ["見つめてる", "整ってる", "減っていく", "強すぎる"],
        question: "今ならどの言葉入れる？",
      },
      {
        lines: ["隣席の", "集中力だけ", "__", "自分の画面は", "まだ真っ白だ"],
        choices: ["吸いながら", "浴びながら", "借りながら", "尊敬して"],
        question: "隣の人に影響されること、ある？",
      },
      {
        lines: ["レシートが", "思ったよりも", "__", "未来の話が", "急に現実"],
        choices: ["長すぎて", "高すぎて", "白すぎて", "正直で"],
        question: "値段で急に現実に戻る瞬間、ある？",
      },
    ],
  },
  {
    key: "romance",
    label: "恋愛のにおい",
    hint: "全員ちょい前のめり",
    items: [
      {
        lines: ["その名前", "出た瞬間に", "__", "飲みもの置いて", "聞く姿勢です"],
        choices: ["全員が", "空気だけ", "目線だけ", "笑い声が"],
        question: "名前が出た瞬間、空気変わることある？",
      },
      {
        lines: ["恋バナは", "軽く始めた", "__", "急に人生", "混ざりがちです"],
        choices: ["はずなのに", "だけなのに", "顔をして", "つもりでも"],
        question: "恋バナ、どこから深くなりがち？",
      },
      {
        lines: ["好きかもを", "まだ言わないで", "__", "その顔だけで", "だいたいわかる"],
        choices: ["笑ってる", "ごまかしてる", "水を飲む", "目をそらす"],
        question: "これ、誰っぽい？",
      },
      {
        lines: ["返信の", "速度で世界", "__", "ほんまは声が", "聞きたいだけか"],
        choices: ["測る夜", "揺れる夜", "決まる夜", "狭い夜"],
        question: "返信で勝手に物語つくること、ある？",
      },
    ],
  },
  {
    key: "futureBlur",
    label: "将来ぼんやり",
    hint: "まだ霧の中",
    items: [
      {
        lines: ["将来を", "聞かれるたびに", "笑ってる", "まだ何者にも", "__"],
        choices: ["なれてないから", "決めてないから", "見えてないから", "言えないだけで"],
        question: "将来の話、笑って流すことある？",
      },
      {
        lines: ["やりたいを", "探していると", "__", "今日の予定も", "まだ決まらない"],
        choices: ["言いながら", "笑いながら", "歩きながら", "ごまかして"],
        question: "予定が決まらない日、逆に楽なことある？",
      },
      {
        lines: ["未来って", "言葉が急に", "__", "ラテの甘さに", "逃げ込んでいる"],
        choices: ["重すぎて", "近すぎて", "遠すぎて", "広すぎて"],
        question: "未来の話、どのくらいの距離なら話せる？",
      },
      {
        lines: ["白紙でも", "いいとは思う", "__", "白紙のままが", "ちょっと怖いな"],
        choices: ["はずなのに", "顔をして", "今日だけは", "帰り道"],
        question: "白紙のまま置いてること、ある？",
      },
    ],
  },
  {
    key: "faceFriend",
    label: "友達と向き合う",
    hint: "ふざけた奥",
    items: [
      {
        lines: ["いつメンの", "知らない部分", "出てきたら", "急に大学", "__"],
        choices: ["ちょっと良くなる", "ちゃんと始まる", "深く見える", "好きになる"],
        question: "最近、友達の知らん一面見た？",
      },
      {
        lines: ["ふざけてる", "顔の向こうに", "__", "たまに見たくて", "黙ってしまう"],
        choices: ["あるものを", "いる人を", "残るものを", "見えるものを"],
        question: "ふざけてる時ほど出る優しさ、ある？",
      },
      {
        lines: ["近いほど", "聞けてないこと", "__", "今日の沈黙", "ちょっとありがたい"],
        choices: ["残ってて", "増えていて", "置いていて", "隠れてて"],
        question: "近いから逆に聞けないこと、ある？",
      },
      {
        lines: ["向き合うと", "言うより同じ", "__", "見ながら少し", "話すくらいで"],
        choices: ["方向を", "景色を", "机を", "帰り道を"],
        question: "真正面より話しやすい場所ってある？",
      },
    ],
  },
  {
    key: "funny",
    label: "ぽとんちゅ面白系",
    hint: "なんやこれ枠",
    items: [
      {
        lines: ["ポテトには", "塩があるのに", "__", "会話のオチは", "いつも薄味"],
        choices: ["俺たちの", "今日だけは", "この席の", "帰り際の"],
        question: "今の空気、味で言うなら何？",
      },
      {
        lines: ["深そうな", "顔で飲んでる", "__", "言うことなくて", "口をつけてる"],
        choices: ["水だけど", "ラテだけど", "氷だけど", "紙コップ"],
        question: "深そうな顔して中身うすい瞬間、ある？",
      },
      {
        lines: ["沈黙を", "おしゃれに言えば", "__", "つまり今ちょい", "気まずいだけか"],
        choices: ["余白です", "間ですか", "映画です", "演出です"],
        question: "今の沈黙、名前つけるなら？",
      },
      {
        lines: ["一首出て", "全員ちょっと", "__", "おもろいからもう", "一回まわそ"],
        choices: ["黙るのが", "笑うのが", "目を見るのが", "困るのが"],
        question: "この一首、ある？ない？",
      },
    ],
  },
];

const categoryMap = Object.fromEntries(categories.map((category) => [category.key, category]));
const scenes = {
  top: document.querySelector("#topScene"),
  category: document.querySelector("#categoryScene"),
  roll: document.querySelector("#rollScene"),
  hole: document.querySelector("#holeScene"),
  complete: document.querySelector("#completeScene"),
};

const categoryGrid = document.querySelector("#categoryGrid");
const rollingLabel = document.querySelector("#rollingLabel");
const holeLabel = document.querySelector("#holeLabel");
const holePoem = document.querySelector("#holePoem");
const choiceGrid = document.querySelector("#choiceGrid");
const completeScene = document.querySelector("#completeScene");
const completeLabel = document.querySelector("#completeLabel");
const completePoem = document.querySelector("#completePoem");
const questionText = document.querySelector("#questionText");

let currentCategory = "assignment";
let currentIndex = -1;
let currentItem = null;
let rollTimer = 0;
let sleepTimer = 0;
let questionTimer = 0;
let isDropping = false;

function showScene(name) {
  window.clearTimeout(sleepTimer);
  window.clearTimeout(questionTimer);
  completeScene.classList.remove("is-sleeping", "is-question-visible");
  choiceGrid.classList.remove("is-disabled");
  Object.values(scenes).forEach((scene) => scene.classList.remove("is-active"));
  scenes[name].classList.add("is-active");
}

function renderCategories() {
  categoryGrid.innerHTML = categories
    .map(
      (category) => `
        <button class="category-button" type="button" data-category="${category.key}">
          <strong>${category.label}</strong>
          <span>${category.hint}</span>
        </button>
      `,
    )
    .join("");
}

function randomIndex(length) {
  if (length <= 1) return 0;
  let next = currentIndex;
  while (next === currentIndex) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function renderPoem(lines, word = "＿＿＿＿") {
  return lines.map((line) => (line === "__" ? `<span class="blank-word">${word}</span>` : line)).join("<br>");
}

function startRoll(categoryKey) {
  window.clearTimeout(rollTimer);
  const category = categoryMap[categoryKey];
  currentCategory = categoryKey;
  rollingLabel.textContent = category.label;
  showScene("roll");
  rollTimer = window.setTimeout(() => {
    showHole(categoryKey);
  }, 950);
}

function showHole(categoryKey) {
  const category = categoryMap[categoryKey];
  currentIndex = randomIndex(category.items.length);
  currentItem = category.items[currentIndex];
  isDropping = false;
  holeLabel.textContent = category.label;
  holePoem.innerHTML = renderPoem(currentItem.lines);
  choiceGrid.innerHTML = currentItem.choices
    .map((choice) => `<button class="choice-button" type="button" data-choice="${choice}">${choice}</button>`)
    .join("");
  showScene("hole");
}

function animateChoiceDrop(choice, button) {
  const blank = holePoem.querySelector(".blank-word");
  if (!blank) return Promise.resolve();

  const sourceRect = button.getBoundingClientRect();
  const targetRect = blank.getBoundingClientRect();
  const chip = document.createElement("div");
  chip.className = "falling-chip";
  chip.textContent = choice;
  chip.style.visibility = "hidden";
  document.body.appendChild(chip);

  const chipRect = chip.getBoundingClientRect();
  const startX = sourceRect.left + sourceRect.width / 2 - chipRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - chipRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2 - chipRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2 - chipRect.height / 2;

  chip.style.left = `${startX}px`;
  chip.style.top = `${startY}px`;
  chip.style.visibility = "visible";
  blank.classList.add("is-catching");

  return new Promise((resolve) => {
    const cleanUp = () => {
      chip.remove();
      blank.classList.remove("is-catching");
      resolve();
    };

    if (!chip.animate) {
      window.setTimeout(cleanUp, 620);
      return;
    }

    const animation = chip.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: "translate(0, -18px) scale(1.05) rotate(-2deg)", opacity: 1, offset: 0.22 },
        {
          transform: `translate(${(endX - startX) * 0.68}px, ${endY - startY - 28}px) scale(0.98) rotate(4deg)`,
          opacity: 1,
          offset: 0.72,
        },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.94) rotate(0deg)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${endX - startX}px, ${endY - startY - 5}px) scale(1.02)`, opacity: 1 },
      ],
      {
        duration: 680,
        easing: "cubic-bezier(0.2, 0.86, 0.24, 1)",
        fill: "forwards",
      },
    );

    animation.addEventListener("finish", cleanUp, { once: true });
    animation.addEventListener("cancel", cleanUp, { once: true });
  });
}

async function chooseWord(choice, button) {
  if (isDropping) return;
  isDropping = true;
  button.classList.add("is-picked");
  choiceGrid.classList.add("is-disabled");
  await animateChoiceDrop(choice, button);
  showComplete(choice);
}

function showComplete(choice) {
  const category = categoryMap[currentCategory];
  completeLabel.textContent = category.label;
  completePoem.innerHTML = renderPoem(currentItem.lines, choice);
  questionText.textContent = currentItem.question;
  showScene("complete");
  questionTimer = window.setTimeout(() => {
    completeScene.classList.add("is-question-visible");
    sleepTimer = window.setTimeout(() => {
      completeScene.classList.add("is-sleeping");
    }, 10000);
  }, 1000);
}

document.querySelector("#startButton").addEventListener("click", () => {
  showScene("category");
});

categoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  currentIndex = -1;
  startRoll(button.dataset.category);
});

choiceGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button) return;
  chooseWord(button.dataset.choice, button);
});

document.querySelector("#againButton").addEventListener("click", () => {
  startRoll(currentCategory);
});

document.querySelector("#changeButton").addEventListener("click", () => {
  showScene("category");
});

document.querySelector("#sleepButton").addEventListener("click", () => {
  window.clearTimeout(sleepTimer);
  completeScene.classList.add("is-question-visible", "is-sleeping");
});

renderCategories();
