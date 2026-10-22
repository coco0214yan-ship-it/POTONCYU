https://coco0214yan-ship-it.github.io/POTONCYU/

# ぽとんちゅ

一首しか送れないチャット。10字以内のお題から穴あき一首を引き、4択で完成した一首をルームへ送ります。

## 開き方

公開版: https://coco0214yan-ship-it.github.io/POTONCYU/

PC内で開く場合は、このフォルダでPowerShellを開いて次を実行します。

```powershell
$env:PORT = "4280"
node server.js
```

ブラウザで http://127.0.0.1:4280/ を開きます。`server.js` はローカルの開発用です。GoogleログインにはFirebase Authenticationでそのホストの許可が必要です。

## 一首とリアクション

- `poem-engine.js`: 自由入力を話題の単語から分類。お題を本文に残し、1つのお題につき22パターン以上を重複せず一巡します。
- 分類できないお題も汎用22パターンで表示します。このローカル生成はテンプレート方式で、自由文の細かな意味をAIが理解する機能ではありません。
- 一首と4択はセットで管理します。無関係なフレーズを後から混ぜません。
- リアクションは選択直後に表示。Firestoreでは選んだ種類だけを更新し、他の人の反応を保ちます。保存失敗時は自分の変更を戻し、画面に表示します。
- リアクションの音は端末内で合成します。チャット上部の「音」で切り替え、端末ごとに設定を保存します。

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
node --test tests/poem-engine.test.cjs tests/reactions.test.cjs tests/ai-generation.test.cjs
```

`tests/ui-smoke.cjs` はPlaywrightを使ったローカル画面確認です。Firebase設定を空にした検証専用のブラウザで動かし、本物のアカウントやルームには書き込みません。
