# FCMプッシュ通知の運用手順

## 実装した通知

- 相手から一首・文章・一首への返信が届いた時、現在のルーム参加者の端末に通知します。送った本人には送りません。
- 自分が一首を送って12時間後に「次の一首」の通知を1回送ります。既存の12時間のおしゃべり期間に合わせた案内です。一首の送信を12時間禁止する変更はしていません。
- 新しい一首を送ると、そのルームでの自分の通知時刻を更新します。文章の送信では更新しません。
- 5分ごとに期限を確認するため、通常は予定時刻から0〜5分程度後に送信します。実際の到着は端末の通信・省電力設定にも左右されます。
- OS通知は、アプリを開いている時も閉じている時も表示します（iPhoneは通知を出さない受信が続くと登録が失効するため）。開いている時は画面内のお知らせも出します。同じトークを閲覧中に届いた分は、OS通知をすぐ閉じ、画面内のお知らせも省略します。
- ログアウトした端末と、別のアカウントに切り替えた端末には、前のアカウント宛ての通知を表示しません。
- 通知には送った人の名前を表示します。おしゃべりと一首への返信は、タイトルが名前（グループは「名前（ルーム名）」）、本文がメッセージ（100字まで）です。一首は「〇〇さんから一首が届きました」とだけ表示し、短歌の本文は出しません（ぽとんちゅを開いて読みます）。ロック画面にも同じ内容が出るので、気になる場合は端末の設定で通知のプレビューを切れます。通知をタップすると対象のルームを開きます。
- プロフィールの「テスト通知を送る」で、その端末だけにテスト通知を送れます。押してから5秒後に送るので、アプリを閉じた状態で届くかも確かめられます。続けて押せるのは30秒に1回です。
- プロフィールの「通知を受け取る」「この端末の通知を停止」で切り替えます。ログアウトでも解除します。ほかの端末の設定は維持します。

## 設定値

| 値 | 保存場所・現在値 |
| --- | --- |
| Firebase project ID | `firebase-config.js` と `.firebaserc` の `potonchu` |
| Web Push公開鍵（VAPID） | `firebase-config.js` の `POTONCHU_FIREBASE_MESSAGING_VAPID_KEY_VALUE`。受領した値を設定済み |
| Callable Functionsの地域 | `POTONCHU_NOTIFICATION_CONFIG.region` とサーバー側の `asia-northeast1` |
| 通知クリック先 | Functionsパラメーター `NOTIFICATION_APP_URL`。初期値 `https://coco0214yan-ship-it.github.io/POTONCYU/` |
| 次の一首までの時間 | `functions/notifications.js` の `CONVERSATION_MS`（12時間）。変える場合は画面文言・`chat-rules.js` の会話時間とも整合を確認 |

公開鍵はブラウザに配信する値です。Firebaseコンソールの「プロジェクトの設定 → Cloud Messaging → Web Push証明書」に表示される公開鍵と一致することを確認してください。秘密鍵・サービスアカウントのJSON・FCM端末トークンはGitHubに載せません。

## 公開前にFirebaseで確認すること

1. `potonchu` のGoogleログインとFirestoreが利用できること。
2. Cloud Messaging API（HTTP v1）とFCM Registration APIが有効なこと。
3. Cloud FunctionsとCloud Schedulerを利用できる課金設定（Blaze）になっていること。FCMの送信以外にFunctions・Firestore・Schedulerの利用料金が発生し得ます。
4. Functionsの実行サービスアカウントにFirestoreの読み書きとFCM送信権限があること。組織ポリシーで既定権限を削っている場合は特に確認してください。
5. Firestoreのルール（`firestore.rules`）で、以下のサーバー専用データへのクライアントからの読み書きを許可していないこと。登録・解除は認証付きCallable Functionsで行うため、ブラウザにこれらのアクセス権は必要ありません。

| パス | 内容・アクセス方針 |
| --- | --- |
| `users/{uid}/notificationTokens/{tokenHash}` | 端末トークン。サーバーのみ読み書き |
| `_notificationDevices/{tokenHash}` | 同一端末の現在の所有ユーザー。サーバーのみ |
| `_notificationDeliveries/{deliveryHash}` | 再送を抑える送信記録。サーバーのみ |
| `_poemReminders/{roomUserHash}` | 次の一首の通知予約。サーバーのみ |

2026-11-19に、本番のルールを `firestore.rules` の内容へ変更しました。ルールに書いていない場所は読み書きできないため、上の表のデータはアプリから見えません。包括的な `/{document=**}` の許可は足さないでください。Firestoreでは、別の場所に拒否ルールを追加しても既存の許可を上書きできません。

## デプロイ

`C:\Users\Owner\Documents\coco` のPowerShellで実行します。2026-11-19に下記の6関数を初めてデプロイしました（それまでは Cloud Functions API が無効で、端末の登録も送信も動いていませんでした）。`functions/` を変えた時に同じ手順で再デプロイします。

```powershell
npm --prefix functions install
npx firebase-tools login
npx firebase-tools deploy --project potonchu --only "functions:registerNotificationDevice,functions:unregisterNotificationDevice,functions:sendTestNotification,functions:sendPoemNotification,functions:sendTalkNotification,functions:sendPoemReminders"
```

このPCの既存Firebase CLIを使う場合は、`npx firebase-tools` の代わりに `node .tools/node_modules/firebase-tools/lib/bin/firebase.js` を使えます。

デプロイ時に `NOTIFICATION_APP_URL` を聞かれたら、そのままEnterで初期値（現在の公開URL）を使います。`--non-interactive` を付ける場合と公開URLを変える場合は、Functionsの環境設定 `functions/.env.potonchu` に `NOTIFICATION_APP_URL=https://実際の公開先/` を設定してからデプロイします。環境ファイルはGit管理対象外です。既存の環境ファイルにほかの値がある場合は追記してください。SDK12.15.0と互換性のある`getToken`方式を維持しています。

`sendPoemNotification` と `sendTalkNotification` は既定地域（us-central1、Firestoreが米国のマルチリージョン nam5 のため）、ほかの4関数は asia-northeast1 です。`generatePoems`（OpenAI）は `functions/index.js` で公開を止めています。シークレット未登録のまま公開対象に戻すと、ほかの関数もデプロイできません。

Firebaseコンソールで `sendPoemReminders` と、そのSchedulerジョブが作成されたことを確認します。スケジュールから使うクエリは `dueAt <= 現在時刻` の単一フィールドなので複合インデックスは不要です。

その後、変更したWebファイルをレビューしてコミット・pushし、既存のGitHub Pages公開手順で公開します。`index.html`、`script.js`、`firebase-config.js`、`firebase-messaging-sw.js`、`manifest.webmanifest`、`assets/notification-icon*.png` が同じ場所に配信される必要があります。`preview/` は通知なしの独立した試作版のままです。

推奨設定として、FirestoreのTTLで `_notificationDeliveries` の `expiresAt` を有効にすると、7日後に送信記録が自動削除されます。未設定でも通知は動きますが、送信記録が蓄積します。

## 実機での検証

1. 公開URLをChrome・Edge・対応Safariで開き、Googleログインします。`?demo=1` はFCMを利用しません。
2. ホームのプロフィールで「通知を受け取る」を押し、ブラウザの通知を許可します。許可を自動で求める処理はありません。続けて「テスト通知を送る」を押し、5秒後に通知が出ることを確認します。押してすぐアプリを閉じると、閉じた状態での受信も確かめられます。
3. 別アカウント・別端末から同じルームに一首と文章を送ります。受信側をバックグラウンドにしてOS通知を確認し、送り主の端末には受信通知が出ないことを確認します。
4. 通知をタップして、`/POTONCYU/` の対象ルームが開くことを確認します。
5. 自分で一首を送信し、12時間後〜次回の5分周期で「次の一首」の通知を確認します。早く試す場合は本番の時間設定を変えず、Firebaseコンソールから検証用の `_poemReminders` 1件の `dueAt` を過去にして、次のScheduler実行を待ちます。送信記録の再利用を避けるため新しい一首で試してください。
6. 「通知を停止」とログアウトのそれぞれで、その端末への通知が止まり、別端末は継続することを確認します。アカウントを切り替えた後に以前のユーザーの通知が出ないことも確認します。
7. iOS/iPadOS 16.4以降では、Safariの共有から「ホーム画面に追加」を行い、追加したアプリから通知を許可します。アプリ内ブラウザではなく通常のブラウザを使用してください。

通知登録エラーは画面に安全なエラーコードを表示します。`functions/not-found` は未デプロイや地域不一致、`functions/unauthenticated` はログイン状態を確認してください。`messaging/token-subscribe-failed` は公開鍵・FCM API、通知拒否はブラウザのサイト設定を確認します。

## ローカル検証

```powershell
node --test tests/notifications.test.cjs tests/notification-client.test.cjs tests/notification-worker.test.cjs tests/production-chat.test.cjs tests/chat-flow.test.cjs tests/chat-rules.test.cjs tests/poem-engine.test.cjs tests/reactions.test.cjs tests/ai-generation.test.cjs
node server.cjs
```

画面は `http://127.0.0.1:4280/?demo=1` で確認できます。ローカルテストはFirebaseとFCM送信を模した環境で実行し、本番のメッセージや端末へ送信しません。アイコンを作り直す場合は `node scripts/build-notification-icons.cjs` を使います。

## 制限と残作業

- 端末での到着確認（特にiPhoneのホーム画面版）は別途必要です。FCMの実送信成功はローカルテストだけでは確認できません。「テスト通知を送る」で端末ごとに確かめてください。
- 通知予約はデプロイ後に送った一首から作られます。過去の一首をまとめて通知する移行は行いません。既存端末は新しいWeb版で「通知を受け取る」を押し直してください。
- Firestoreイベントは重複や順序入れ替わりがあり得ます。送信済みトークン記録と期限付きの実行ロック、OS通知のタグで再送を抑えています。FCM送信後・記録保存前にサーバーが停止した場合など、厳密な「必ず1回」の保証はありません。
- 失効トークンを削除し、一時的な失敗は再試行します。90日間更新されていない端末情報も送信対象から外します。再ログインした端末では登録を更新します。
- 期限到達は1回につき最大100予約を処理します。大量利用時はSchedulerの実行間隔・処理件数・費用を調整してください。通知配信の遅延や停止はCloud Loggingで確認します。

公式資料: [FCM Web設定](https://firebase.google.com/docs/cloud-messaging/web/get-started)、[Webでの受信](https://firebase.google.com/docs/cloud-messaging/web/receive-messages)、[端末登録の管理](https://firebase.google.com/docs/cloud-messaging/manage-tokens)、[定期実行](https://firebase.google.com/docs/functions/schedule-functions)、[iOSのWeb Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)。
