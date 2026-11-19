https://coco0214yan-ship-it.github.io/POTONCYU/

# ぽとんちゅ

一首から会話がはじまるチャット。相手やグループを選び、相手に送りたい内容を200字以内で入力して「生成する」を押すと、AIが一首を作ります。真ん中の5音を4択から選び、完成した一首を送るか引き直すか決められます。

2026-11-15に、下部の「ホーム・トーク・おきにいり」、スマホでのコンパクト表示、Enter送信、複数のお気に入り、トーク内のおしゃべりを本番へ反映しました。プレビュー用の仮の相手・時計・通知見本は本番に表示しません。

## 開き方

公開版: https://coco0214yan-ship-it.github.io/POTONCYU/

PC内で開く場合は、このフォルダでPowerShellを開いて次を実行します。

```powershell
$env:PORT = "4280"
node server.cjs
```

仮データで確認する場合はブラウザで http://127.0.0.1:4280/?demo=1 を開きます。実際のログイン・通信は本番URLで利用します。ローカルでGoogleログインを使う場合は、Firebase Authenticationでそのホストの許可が必要です。

## 一首とリアクション

- `chat-rules.js`: AIで作れない時に使う、用意してある一首です。入力のキーワードから組み合わせを選び、各行と選択肢の読み仮名で5・7・5・7・7を検証しています。入力した内容そのものはトークに送りません。
- 自分がそのトークで最後に一首を送ってから12時間、おしゃべりを送れます。送信直前にも期限を確認します。サーバーのFirestoreルールで12時間を強制する設定は今回変更していません。
- おしゃべりは `rooms/{roomId}/messages` に `kind: "text"` として保存します。過去の一首も引き続き表示します。
- お気に入りはユーザー情報の `favoritePoems` に複数保存します。過去の `favoritePoem` も読み込み、更新はトランザクションで行います。
- 一首と4択はセットで管理します。無関係なフレーズを後から混ぜません。
- リアクションは選択直後に表示。Firestoreでは選んだ種類だけを更新し、他の人の反応を保ちます。保存失敗時は自分の変更を戻し、画面に表示します。
- リアクションの音は端末内で合成します。チャット上部の「音」で切り替え、端末ごとに設定を保存します。

FCM通知は、新しい一首・文章・返信を受け取った時と、自分の一首から12時間後に送信します。プロフィールで端末ごとに開始・停止でき、「テスト通知を送る」で届くかを確かめられます。通知用のFunctionsは2026-11-19にデプロイしました。`functions/` を変えた時は再デプロイが必要です。[プッシュ通知の設定・デプロイ・検証手順](docs/push-notifications.md)を参照してください。

## Firestoreのルール

`firestore.rules` が本番のルールです（2026-11-19に反映）。ログインした人が、自分のプロフィールと、自分が入っているルームの一首・おしゃべり・返信だけを読み書きできます。

- ルームは、招待リンク（ルームID）を知っているログイン済みの人が1件だけ読めて、自分をメンバーに追加できます。ほかの人の追加・追い出し、ルーム名の変更、ルームや一首の削除はアプリからできません。
- 送ったあとの一首・おしゃべりで変えられるのはリアクションだけです。送り主を偽って送ることはできません。
- 通知用のデータはFunctionsだけが使い、アプリからは読み書きできません。
- 12時間のおしゃべり期間は、これまでどおりアプリ側で確認しています（ルールでは強制していません）。

Firestoreへの新しい読み書きをアプリに足す時は、`firestore.rules` と `scripts/check-firestore-rules.py` の場面も足してください。足さないと本番で `permission-denied` になります。

```powershell
python scripts/check-firestore-rules.py
firebase deploy --only firestore:rules --project potonchu
```

1行目は公開せずにルールを確かめます（gcloudでプロジェクトを見られるアカウントにログインしている必要があります）。2行目で本番に反映します。

## AI生成（Firebase AI Logic）

トークの入力欄に相手に送りたい内容（200字以内）を書いて「生成する」を押すと、Firebase AI Logic（Gemini Developer API）で一首を作ります。ガチャのあと真ん中の5音を4択から選び、送るか引き直すかを決める流れは従来どおりです。

- `ai-logic.js`: 生成と検証。1回の問い合わせで3首の候補を作り、読み仮名で5・7・5・7・7と4択の5音を確かめて、合ったものだけを使います。残りの候補は「引き直し」で待たずに出ます。1首も合わなければ1回だけ作り直します。
- AIに送るのは入力した内容だけです。名前、相手、ルーム、過去の会話は送りません。入力した内容は相手には届きません。
- AIで作れない時（通信の失敗、30秒以内に応答がない、音数が合わない）は、`chat-rules.js` の用意してある一首に切り替え、画面にその旨を表示します。
- 設定は `firebase-config.js` の `POTONCHU_AI_LOGIC_CONFIG`。`enabled` を `false` にするとAIを使わず、用意してある一首だけになります。モデルは `gemini-3.8-flash`（考える量は `LOW`）。より軽い `gemini-3.5-flash-lite` は速いものの音数が合わず、採用していません。
- Firebase側は App Check（reCAPTCHA Enterprise）を必須にしています。`appCheckSiteKey` は公開してよいサイトキーで、使えるドメインは `coco0214yan-ship-it.github.io` だけです。公開先のドメインを変える時は、Google Cloud の reCAPTCHA のキーにドメインを追加してください。GeminiのAPIキーや秘密鍵はこのリポジトリに書きません。
- PC内（`http://127.0.0.1:4280/?demo=1`）ではAIを使いません。試す時は `?demo=1&ai=1` で開き、Firebaseコンソールの App Check で発行したデバッグトークンをブラウザのコンソールから `localStorage.setItem("potonchu.appCheckDebugToken", "トークン")` で入れます。トークンはファイルやチャットに書かないでください。
- 利用料金は Gemini Developer API の使用量に応じます。Firebaseコンソールの AI Logic で使用量を確認できます。

OpenAIを使う `functions/generate-poems.js`（`POTONCHU_GENERATION_CONFIG`）は使っていません。`functions/index.js` でも公開を止めています。

公式資料: [Firebase AI Logic](https://firebase.google.com/docs/ai-logic/get-started?platform=web)、[App Check](https://firebase.google.com/docs/ai-logic/app-check)、[対応モデル](https://firebase.google.com/docs/ai-logic/models)。

## 確認

```powershell
node --test tests/notifications.test.cjs tests/notification-client.test.cjs tests/notification-worker.test.cjs tests/production-chat.test.cjs tests/chat-flow.test.cjs tests/chat-rules.test.cjs tests/poem-engine.test.cjs tests/reactions.test.cjs tests/ai-generation.test.cjs tests/firebase-ai-logic.test.cjs
```

`tests/ui-smoke.cjs` はPlaywrightを使ったローカル画面確認です。Firebase設定を空にした検証専用のブラウザで動かし、本物のアカウントやルームには書き込みません。
