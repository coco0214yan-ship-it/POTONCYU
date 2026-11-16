(function (root) {
  "use strict";
  const HOUR = 60 * 60 * 1000;
  const BLANK = "__POTON_BLANK__";
  // Readings are explicit: counting written kanji cannot establish a tanka's metre.
  const word = (text, reading = text) => ({ text, reading });
  const common = {
    first: [word("帰り道", "かえりみち"), word("夕暮れに", "ゆうぐれに"), word("あの空に", "あのそらに")],
    second: [word("言えないことを", "いえないことを"), word("君のとなりで", "きみのとなりで"), word("言葉にのせて", "ことばにのせて")],
    fourth: [word("小さな声で", "ちいさなこえで"), word("言葉をつなぐ", "ことばをつなぐ"), word("心をひらく", "こころをひらく")],
    fifth: [word("そっと届ける", "そっととどける"), word("君へと送る", "きみへとおくる"), word("また話そうね", "またはなそうね")],
    choices: [word("伝えたい", "つたえたい"), word("君がいる", "きみがいる"), word("待っている", "まっている"), word("そばにいて", "そばにいて")],
  };
  const scenes = {
    thanks: { match: /ありがとう|感謝|お礼|助か|助け|うれし|嬉し/, first: [word("ありがとう")], second: [word("君の言葉に", "きみのことばに"), word("助けられたよ", "たすけられたよ")], fourth: [word("お礼をこめて", "おれいをこめて"), word("心がほどけ", "こころがほどけ")], choices: [word("あたたかい"), word("うれしいな"), word("忘れない", "わすれない"), word("君がいる", "きみがいる")] },
    sorry: { match: /ごめん|謝|仲直り|言いすぎ|言い過ぎ|気まず|喧嘩|けんか/, first: [word("あの日から", "あのひから")], second: [word("言えないままの", "いえないままの"), word("あの日のことを", "あのひのことを")], fourth: [word("言い訳よりも", "いいわけよりも"), word("素直な声で", "すなおなこえで")], fifth: [word("もう一度だけ", "もういちどだけ"), word("君へと送る", "きみへとおくる")], choices: [word("ごめんねと"), word("伝えたい", "つたえたい"), word("話したい", "はなしたい"), word("向き合うよ", "むきあうよ")] },
    feeling: { match: /会いた|あいた|寂し|さみし|さびし|好き|すき|恋|声|話した|聞いて|きいて|不安|つら|辛|悲し/, first: [word("会えぬ夜", "あえぬよる"), word("この胸に", "このむねに")], second: [word("君の名前を", "きみのなまえを"), word("小さな思い", "ちいさなおもい")], choices: [word("会いたいな", "あいたいな"), word("声きかせ", "こえきかせ"), word("そばにいて"), word("待っている", "まっている")] },
    study: { match: /テスト|試験|課題|勉強|授業|レポート|大学|ゼミ/, first: [word("白い紙", "しろいかみ"), word("机には", "つくえには")], second: [word("ノートをひらく"), word("終わらぬ課題", "おわらぬかだい")], fourth: [word("ひと息ついて", "ひといきついて"), word("君の言葉に", "きみのことばに")], choices: [word("ひとやすみ"), word("あと少し", "あとすこし"), word("手をかして", "てをかして"), word("がんばろう")] },
    work: { match: /仕事|バイト|働|しごと|就活|面接|疲れ|つかれ/, first: [word("帰り道", "かえりみち"), word("今日もまた", "きょうもまた")], second: [word("荷物をおろし", "にもつをおろし"), word("今日のできごと", "きょうのできごと")], fourth: [word("ひと息ついて", "ひといきついて"), word("小さな声で", "ちいさなこえで")], choices: [word("おつかれと"), word("ひとやすみ"), word("聞いてよね", "きいてよね"), word("また明日", "またあした")] },
    invite: { match: /ごはん|ご飯|食べ|カフェ|遊|あそ|行こ|いこう|予定|集合|旅行|誘|出かけ/, first: [word("週末に", "しゅうまつに"), word("帰り道", "かえりみち")], second: [word("予定をあけて", "よていをあけて"), word("君をさそって", "きみをさそって")], fourth: [word("ふたりの時間", "ふたりのじかん"), word("みんなの声が", "みんなのこえが")], fifth: [word("また話そうね", "またはなそうね"), word("そっと届ける", "そっととどける")], choices: [word("会いたいな", "あいたいな"), word("どこ行こう", "どこいこう"), word("楽しみだ", "たのしみだ"), word("待っている", "まっている")] },
  };
  function mora(reading) {
    return Array.from(reading.normalize("NFKC")).filter((ch) => !/[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ\s、。！？]/.test(ch)).length;
  }
  function conversationWindow(messages, userId, now) {
    const last = Math.max(0, ...messages.filter((m) => m.kind !== "text" && !m.status && m.author?.id === userId).map((m) => Number(m.createdAt) || 0));
    return { lastPoemAt: last, expiresAt: last ? last + 12 * HOUR : 0, canTalk: Boolean(last && now >= last && now < last + 12 * HOUR) };
  }
  function reminderDue(startedAt, lastReminderAt, now) {
    return now - Math.max(startedAt, lastReminderAt || 0) >= 24 * HOUR;
  }
  function createGenerator(random = Math.random) {
    const history = new Map();
    return function generate(feeling) {
      const input = String(feeling).trim();
      if (!input || Array.from(input).length > 200) throw new Error("思いは1〜200字で入力してください。");
      const key = Object.keys(scenes).find((key) => scenes[key].match.test(input)) || "open";
      const scene = { ...common, ...(scenes[key] || {}) };
      const candidates = [];
      for (const a of scene.first) for (const b of scene.second) for (const d of scene.fourth) for (const e of scene.fifth) {
        const words = [a, b, null, d, e];
        candidates.push({ templateId: words.map((w) => w?.text || BLANK).join("/"), lines: words.map((w) => w?.text || BLANK), readings: words.map((w) => w?.reading || ""), choices: scene.choices.map((w) => w.text), choiceReadings: scene.choices.map((w) => w.reading), source: "sample", category: key });
      }
      const used = history.get(key) || new Set();
      let available = candidates.filter((d) => !used.has(d.templateId));
      if (!available.length) {
        const previous = Array.from(used).at(-1);
        used.clear();
        available = candidates.filter((d) => d.templateId !== previous);
      }
      const draft = available[Math.floor(random() * available.length)];
      used.add(draft.templateId);
      history.set(key, used);
      return draft;
    };
  }
  const api = { HOUR, BLANK, mora, conversationWindow, reminderDue, createGenerator, common, scenes };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PotonchuChatRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

