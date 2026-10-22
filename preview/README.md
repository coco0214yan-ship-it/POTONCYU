# ぽとんちゅのプレビュー

URL: https://coco0214yan-ship-it.github.io/POTONCYU/preview/

現在のPC内の画面を、公開版とは別に試すためのスナップショットです。Googleログイン、Firebase、AI生成、プッシュ通知は利用しません。画面上の名前は仮の名前で入力できます。

一首ガチャ、リアクションと音、一首にひもづく文章トークを試せます。同じブラウザの別タブでは招待リンクで同期できますが、別端末の人との通信はできません。お試しの内容はメモリ上だけに置き、保存しません。タブをすべて閉じると消えます。

公開版の保存キー・同期チャンネルとは分離しています。元の公開版は変更していません。

更新する場合は、プロジェクトのフォルダで `node scripts/build-preview.cjs` を実行し、現在の作業中の `script.js`、`styles.css`、`poem-engine.js`、`reaction-feedback.js` をコピーします。`index.html` の読み込みURLのバージョンも更新し、プレビューのみをGitHubへ送ります。Firebaseの設定や秘密鍵はコピーしません。
