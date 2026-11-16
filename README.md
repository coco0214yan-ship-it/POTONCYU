https://coco0214yan-ship-it.github.io/POTONCYU/

# ぽとんちゅ

## 現在のPC内プレビュー

「本音を自由入力 → 穴あき一首ガチャ → 真ん中を4択から選ぶ → 一首から文章で会話」の試作です。読みの音数を五・七・五・七・七にそろえ、4択はすべて5音です。開くURLは http://127.0.0.1:4173/preview/index.html です。AIはまだ未接続で、定型の候補を表示します。時間制限なしが標準です。今回の変更はまだGitHub Pagesへ公開していません。詳細と本物のAIへの接続条件は [本音モードの作業メモ](docs/honne-prototype.md) を参照してください。

以下は、以前の公開版の構成と接続メモです。

一首しか送れないチャット。10字以内のお題から穴あき一首を引き、4択で完成した一首をルームへ送ります。一首をタップした先では、その一首について文章で会話できます。

## 開き方

公開版: https://coco0214yan-ship-it.github.io/POTONCYU/

PC内で開く場合は、このフォルダでPowerShellを開いて次を実行します。

```powershell
$env:PORT = "4280"
node server.js
```

ブラウザで http://127.0.0.1:4280/ を開きます。`server.js` はローカルの開発用です。GoogleログインにはFirebase Authenticationでそのホストの許可が必要です。

## 一首とリアクション

- `poem-engine.js`: 自由入力を話題の単語から分類。お題そのものを1行目に固定せず、風景や行動から始めます。1つのお題につき22パターン以上を重複せず一巡します。
- 分類できないお題も汎用22パターンで表示します。このローカル生成はテンプレート方式で、自由文の細かな意味をAIが理解する機能ではありません。
- 一首と4択はセットで管理します。無関係なフレーズを後から混ぜません。
- リアクションは選択直後に表示。Firestoreでは選んだ種類だけを更新し、他の人の反応を保ちます。保存失敗時は自分の変更を戻し、画面に表示します。
- リアクションの音は端末内で合成します。チャット上部の「音」で切り替え、端末ごとに設定を保存します。

## 一首ごとのトーク

ルームの一首をタップするか「この一首のトーク」を押すと、元の一首を見ながら文章で会話できます。トークは同じルームの参加者が閲覧・返信できます。グループ内で特定の2人だけに見える個別チャットではありません。

文章の保存先は `rooms/{roomId}/messages/{poemId}/replies/{replyId}` です。ルームの一首一覧には文章を混ぜません。書きかけの返事はトークごとに保持し、受信中も日本語入力を中断しません。保存失敗時は返事を残し、再送できます。

公開前に、Firebaseの既存ルールへ次の追加が必要です。これは既存ルールに追加する断片です。ルール全体を置き換えるものではありません。

```text
// match /databases/{database}/documents の内側へ追加
match /rooms/{roomId}/messages/{poemId}/replies/{replyId} {
  function talkMember() {
    return request.auth != null
      && request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.memberIds
      && exists(/databases/$(database)/documents/rooms/$(roomId)/messages/$(poemId));
  }
  allow read: if talkMember();
  allow create: if talkMember()
    && request.resource.data.keys().hasAll(['kind', 'text', 'senderId', 'senderName', 'senderPhoto', 'createdAt', 'createdAtMillis'])
    && request.resource.data.keys().hasOnly(['kind', 'text', 'senderId', 'senderName', 'senderPhoto', 'createdAt', 'createdAtMillis'])
    && request.resource.data.kind == 'text'
    && request.resource.data.senderId == request.auth.uid
    && request.resource.data.text is string
    && request.resource.data.text.size() > 0
    && request.resource.data.text.size() <= 500
    && request.resource.data.senderName is string
    && request.resource.data.senderPhoto is string
    && request.resource.data.createdAt == request.time
    && request.resource.data.createdAtMillis is int;
  allow update, delete: if false;
}
```

このPCではFirebase CLIを `.tools/` に用意済みです。`node .tools/node_modules/firebase-tools/lib/bin/firebase.js` の後ろにFirebaseのコマンドを続けて実行できます。この道具とログイン情報はGitHubへ公開しません。Firebaseへの管理用ログインとルール追加、AI生成関数の公開が終わるまでは、PC内のデモでトークを確認してください。

## AI生成の有効化

接続コードは用意済みですが、`firebase-config.js` の `POTONCHU_GENERATION_CONFIG.enabled` は初期値 `false` です。現在、OpenAIへの通信や課金は発生しません。OpenAI APIとFirebase Cloud Functionsを利用する設定を終えてから有効にします。

1. OpenAI APIを利用できるアカウントとAPIキー、FirebaseでFunctionsを利用できる契約を用意します。
2. このフォルダのPowerShellで `npm --prefix functions install` を実行します。
3. Firebase CLIへログイン後、`firebase functions:secrets:set OPENAI_API_KEY --project potonchu` を実行し、表示される入力欄へAPIキーを登録します。キーをHTML、JavaScript、GitHub、チャットに貼らないでください。
4. `firebase deploy --only functions:generatePoems --project potonchu` で生成用関数だけを公開します。既存の通知関数はこの操作の対象外です。
5. `firebase-config.js` の `enabled` を `true` にしてフロントエンドを公開します。

`functions/generate-poems.js` はルームへの参加を確認し、お題と直前の一首だけをAIへ渡します。1回で3首とそれぞれの4択を生成し、次の引き直しで使います。生成失敗や形式不正時はローカルの一首を表示します。

標準モデルは `gpt-4.1-mini`。Functionsの `POEM_MODEL` 設定で変更できます。利用回数は1人につき毎分5回、1日30回、アプリ全体で1日500回まで。失敗したリクエストも回数に含みます。Firestoreの `_poemGenerationUsage` はクライアントから書き換えできないルールにしてください。APIキーと利用料金の設定は別途必要です。

公式仕様: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)、[Firebase callable functions](https://firebase.google.com/docs/functions/callable)。

## 確認

```powershell
node --test tests/poem-engine.test.cjs tests/reactions.test.cjs tests/ai-generation.test.cjs tests/talks.test.cjs
```

`tests/ui-smoke.cjs` はPlaywrightを使ったローカル画面確認です。Firebase設定を空にした検証専用のブラウザで動かし、本物のアカウントやルームには書き込みません。
