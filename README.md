https://coco0214yan-ship-it.github.io/POTONCYU/

# ぽとんちゅ

一首から会話がはじまるチャット。相手やグループを選び、200字以内で思いを入力して一首ガチャを回します。真ん中の5音を4択から選び、完成した一首を送るか引き直すか決められます。

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

- `chat-rules.js`: 思いのキーワードから一首の組み合わせを選びます。各行と選択肢の読み仮名で5・7・5・7・7を検証しています。AIは未接続で、分類できない思いには汎用の一首を使います。入力した思いそのものはトークに送りません。
- 自分がそのトークで最後に一首を送ってから12時間、おしゃべりを送れます。送信直前にも期限を確認します。サーバーのFirestoreルールで12時間を強制する設定は今回変更していません。
- おしゃべりは `rooms/{roomId}/messages` に `kind: "text"` として保存します。過去の一首も引き続き表示します。
- お気に入りはユーザー情報の `favoritePoems` に複数保存します。過去の `favoritePoem` も読み込み、更新はトランザクションで行います。
- 一首と4択はセットで管理します。無関係なフレーズを後から混ぜません。
- リアクションは選択直後に表示。Firestoreでは選んだ種類だけを更新し、他の人の反応を保ちます。保存失敗時は自分の変更を戻し、画面に表示します。
- リアクションの音は端末内で合成します。チャット上部の「音」で切り替え、端末ごとに設定を保存します。

FCM通知は、新しい一首・文章・返信を受け取った時と、自分の一首から12時間後に送信します。プロフィールで端末ごとに開始・停止できます。本番利用にはFunctionsのデプロイとFirebase設定の確認が必要です。[プッシュ通知の設定・デプロイ・検証手順](docs/push-notifications.md)を参照してください。

## AI生成の有効化

接続コードは用意済みですが、`firebase-config.js` の `POTONCHU_GENERATION_CONFIG.enabled` は初期値 `false` です。現在、OpenAIへの通信や課金は発生しません。200字の思いの入力と読み仮名による音数検証に生成APIを対応させてから、下記の接続設定を行います。今回AIや有料サービスを有効にはしていません。

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
node --test tests/notifications.test.cjs tests/notification-client.test.cjs tests/notification-worker.test.cjs tests/production-chat.test.cjs tests/chat-flow.test.cjs tests/chat-rules.test.cjs tests/poem-engine.test.cjs tests/reactions.test.cjs tests/ai-generation.test.cjs
```

`tests/ui-smoke.cjs` はPlaywrightを使ったローカル画面確認です。Firebase設定を空にした検証専用のブラウザで動かし、本物のアカウントやルームには書き込みません。
