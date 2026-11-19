# Firebase AI Logicで一首を作る（プレビュー用）
本番には反映していません。AIの有効化もまだ行っていません。

## 作ったもの
入力した思い（1〜200字）から、5・7・空欄・7・7の一首と、中央の5音の4択をGeminiで生成します。
AIの読み仮名で音数と形式を検証し、不適合なら1回だけ作り直します。それでも不適合なら送信せずエラーを表示します。
入力した思いだけを送ります。プロフィール、相手の名前、会話履歴、ルームIDは送りません。
漢字と読み仮名が本当に対応するかは機械的には保証できないため、実際の出力でも確認してください。

## 接続前に確認すること
1. 既存のFirebaseプロジェクト potonchu の AI Logic が有効か確認します。
2. 使用するのは Gemini Developer API です。現在の料金プランと無料枠・使用量上限を確認してください。
   既にBlazeの場合は使用に応じた料金が発生する可能性があります。プラン変更や課金設定は確認してから行います。
3. Webアプリを App Check に登録し、reCAPTCHA Enterprise のサイトキーを取得します。
   Firebaseの設定は既存のWebアプリのものを使います。GoogleログインやFirestoreの設定は変更しません。
4. サイトキーに、実際に試すドメインを登録します。公開プレビューなら coco0214yan-ship-it.github.io です。
   App Checkの保護を無効にする方法や、デバッグトークンを公開する方法は使いません。
5. preview/ai-logic-config.js の appCheckSiteKey に公開サイトキーを入れます。
   GeminiのAPIキーやreCAPTCHAの秘密鍵は入れないでください。
6. 接続先と料金を確認したあと、同ファイルの enabled を true にします。

モデル名は設定で変更できます。初期設定は公式のWeb導入例で案内されている gemini-3.8-flash です。
記事内の古いモデル名をそのまま使わないでください。

## PC内で開く
POTONCYU フォルダでPowerShellを開きます。
    node preview/server.cjs
ブラウザで http://127.0.0.1:4280/ を開きます。停止はPowerShellで Ctrl+C。
AIを無効にしたままでも従来のお試し一首で画面を確認できます。
AIを有効にする場合はApp Checkに対応する利用設定が先に必要です。

## 試す順番
仮の名前で開始 → 仮の相手を追加 → トーク下に思いを入力 → 一首ガチャ → 中央の5音を選ぶ → 送信／引き直し。
AIで生成した一首と、設定待ちのサンプルは画面で区別します。
送信を選ぶまで、一首も入力文もトークに送られません。

## 確認
    node --test tests/firebase-ai-logic.test.cjs tests/chat-flow.test.cjs tests/chat-rules.test.cjs
このテストはモデルを仮の応答に差し替え、実際のAI通信や課金を行いません。

公式手順:
https://firebase.google.com/docs/ai-logic/get-started?platform=web
https://firebase.google.com/docs/ai-logic/app-check
https://firebase.google.com/docs/ai-logic/generate-structured-output?hl=en
https://firebase.google.com/docs/ai-logic/models
