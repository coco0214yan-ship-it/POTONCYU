#!/usr/bin/env python3
"""firestore.rules を、公開せずにFirebaseのルール検証APIで確かめる。

使い方:  python3 scripts/check-firestore-rules.py
前提:    gcloud でプロジェクト potonchu を見られるアカウントにログイン済み（gcloud auth login）。
本番のデータは読み書きしません。下の「場面」ごとに、許可・拒否が期待どおりかだけを調べます。
"""
import json
import pathlib
import subprocess
import sys
import urllib.request

PROJECT = "potonchu"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = "/databases/(default)/documents"

ME, FRIEND, STRANGER = "me-uid", "friend-uid", "stranger-uid"
ROOM = {"roomName": "帰り道の会", "type": "pair", "createdBy": ME, "inviteCode": "room_1",
        "memberIds": [ME, FRIEND], "members": [{"id": ME, "name": "わたし"}, {"id": FRIEND, "name": "ともだち"}]}
POEM = {"senderId": FRIEND, "senderName": "ともだち", "topic": "一首", "poemLines": ["一", "二", "三", "四", "五"],
        "selectedWord": "三", "reactions": {}}

cases = []


def case(name, allow, uid, method, path, existing=None, incoming=None, room=ROOM):
    request = {"path": DOCS + path, "method": method}
    if uid:
        request["auth"] = {"uid": uid}
    if incoming is not None:
        request["resource"] = {"data": incoming}
    test = {"expectation": "ALLOW" if allow else "DENY", "request": request}
    if existing is not None:
        test["resource"] = {"data": existing}
    if room is not None:
        # ルールの中の get(rooms/room_1) が返すルーム。
        test["functionMocks"] = [{"function": "get", "args": [{"exactValue": DOCS + "/rooms/room_1"}],
                                  "result": {"value": {"data": room}}}]
    cases.append((name, test))


def merged(base, **changes):
    return {**base, **changes}


# --- プロフィール
case("本人は自分のプロフィールを読める", True, ME, "get", "/users/" + ME, existing={"displayName": "わたし"})
case("本人は自分のプロフィールを初めて保存できる", True, ME, "create", "/users/" + ME, incoming={"displayName": "わたし"})
case("本人は名前・お気に入りを更新できる", True, ME, "update", "/users/" + ME,
     existing={"displayName": "わたし"}, incoming={"displayName": "あたらしい名前", "favoritePoems": [{"lines": ["一"]}]})
case("ほかの人のプロフィールは読めない", False, FRIEND, "get", "/users/" + ME, existing={"displayName": "わたし"})
case("ほかの人のプロフィールは書き換えられない", False, FRIEND, "update", "/users/" + ME,
     existing={"displayName": "わたし"}, incoming={"displayName": "いたずら"})
case("ログインしていない人はプロフィールを読めない", False, None, "get", "/users/" + ME, existing={"displayName": "わたし"})
case("プロフィールの一覧は誰も取れない", False, ME, "list", "/users/" + ME, existing={"displayName": "わたし"})
case("通知の端末トークンはアプリから読めない", False, ME, "get", "/users/" + ME + "/notificationTokens/t1", existing={"token": "x"})
case("通知の端末トークンはアプリから書けない", False, ME, "create", "/users/" + ME + "/notificationTokens/t1", incoming={"token": "x"})

# --- ルーム
case("メンバーは自分のルームを読める", True, ME, "get", "/rooms/room_1", existing=ROOM)
case("メンバーは自分が入っているルームの一覧を取れる", True, ME, "list", "/rooms/room_1", existing=ROOM)
case("入っていないルームは一覧に出せない", False, STRANGER, "list", "/rooms/room_1", existing=ROOM)
case("招待リンクを開いたログイン済みの人は、そのルームを読める", True, STRANGER, "get", "/rooms/room_1", existing=ROOM)
case("ログインしていない人はルームを読めない", False, None, "get", "/rooms/room_1", existing=ROOM)
NEW_ROOM = {"roomName": "新しい会", "type": "pair", "createdBy": ME, "inviteCode": "room_2", "memberIds": [ME],
            "members": [{"id": ME, "name": "わたし"}]}
case("自分だけがメンバーのルームを作れる", True, ME, "create", "/rooms/room_2", incoming=NEW_ROOM)
case("ほかの人を勝手に入れたルームは作れない", False, ME, "create", "/rooms/room_2", incoming=merged(NEW_ROOM, memberIds=[ME, FRIEND]))
case("他人の名義でルームは作れない", False, ME, "create", "/rooms/room_2", incoming=merged(NEW_ROOM, createdBy=FRIEND))
case("ログインしていない人はルームを作れない", False, None, "create", "/rooms/room_2", incoming=NEW_ROOM)
JOINED = merged(ROOM, memberIds=[ME, FRIEND, STRANGER], members=ROOM["members"] + [{"id": STRANGER, "name": "三人目"}])
case("招待リンクから自分を追加して参加できる", True, STRANGER, "update", "/rooms/room_1", existing=ROOM, incoming=JOINED)
case("参加の時にほかの人を追い出せない", False, STRANGER, "update", "/rooms/room_1", existing=ROOM,
     incoming=merged(ROOM, memberIds=[STRANGER], members=[{"id": STRANGER, "name": "三人目"}]))
case("参加の時に別の人まで追加できない", False, STRANGER, "update", "/rooms/room_1", existing=ROOM,
     incoming=merged(JOINED, memberIds=[ME, FRIEND, STRANGER, "another-uid"]))
case("参加の時にルーム名は変えられない", False, STRANGER, "update", "/rooms/room_1", existing=ROOM, incoming=merged(JOINED, roomName="のっとり"))
case("メンバーでない人は名簿だけを書き換えられない", False, STRANGER, "update", "/rooms/room_1", existing=ROOM,
     incoming=merged(ROOM, members=[{"id": STRANGER, "name": "三人目"}]))
case("メンバーは名簿の名前・写真を更新できる", True, ME, "update", "/rooms/room_1", existing=ROOM,
     incoming=merged(ROOM, members=[{"id": ME, "name": "わたし", "customIconURL": "data:image/jpeg;base64,xx"}, ROOM["members"][1]], updatedAt="2026-11-19T00:00:00Z"))
case("名簿と番号がずれていたメンバーは、名簿に自分を足せる", True, FRIEND, "update", "/rooms/room_1",
     existing=merged(ROOM, members=[ROOM["members"][0]]), incoming=ROOM)
case("メンバーでもほかの人を追い出せない", False, ME, "update", "/rooms/room_1", existing=ROOM, incoming=merged(ROOM, memberIds=[ME]))
case("メンバーでもほかの人を勝手に追加できない", False, ME, "update", "/rooms/room_1", existing=ROOM, incoming=merged(ROOM, memberIds=[ME, FRIEND, STRANGER]))
case("メンバーでもルーム名は変えられない", False, ME, "update", "/rooms/room_1", existing=ROOM, incoming=merged(ROOM, roomName="べつの名前"))
case("ルームは消せない", False, ME, "delete", "/rooms/room_1", existing=ROOM)

# --- 一首・おしゃべり
MESSAGE = "/rooms/room_1/messages/m1"
case("メンバーは一首を読める", True, ME, "get", MESSAGE, existing=POEM)
case("メンバーはトークの一覧を読める", True, ME, "list", MESSAGE, existing=POEM)
case("メンバーでない人は一首を読めない", False, STRANGER, "get", MESSAGE, existing=POEM)
case("メンバーでない人はトークの一覧を読めない", False, STRANGER, "list", MESSAGE, existing=POEM)
case("ログインしていない人は一首を読めない", False, None, "get", MESSAGE, existing=POEM)
case("メンバーは一首を送れる", True, ME, "create", MESSAGE, incoming=merged(POEM, senderId=ME, senderName="わたし"))
case("メンバーはおしゃべりを送れる", True, ME, "create", MESSAGE, incoming={"kind": "text", "text": "こんにちは", "senderId": ME, "senderName": "わたし"})
case("他人になりすまして送れない", False, ME, "create", MESSAGE, incoming=POEM)
case("メンバーでない人は送れない", False, STRANGER, "create", MESSAGE, incoming=merged(POEM, senderId=STRANGER))
case("メンバーはリアクションを付けられる", True, ME, "update", MESSAGE, existing=POEM, incoming=merged(POEM, reactions={"いいね": [ME]}))
case("リアクション欄がない古い一首にも付けられる", True, ME, "update", MESSAGE,
     existing={k: v for k, v in POEM.items() if k != "reactions"}, incoming=merged(POEM, reactions={"いいね": [ME]}))
case("送ったあとの一首の本文は誰も書き換えられない", False, FRIEND, "update", MESSAGE, existing=POEM, incoming=merged(POEM, poemLines=["改", "ざ", "ん", "だ", "よ"]))
case("メンバーでない人はリアクションを付けられない", False, STRANGER, "update", MESSAGE, existing=POEM, incoming=merged(POEM, reactions={"いいね": [STRANGER]}))
case("一首は消せない", False, FRIEND, "delete", MESSAGE, existing=POEM)

# --- 一首への返信
REPLY = MESSAGE + "/replies/r1"
REPLY_DATA = {"kind": "text", "text": "うれしい", "senderId": ME, "senderName": "わたし"}
case("メンバーは返信を読める", True, FRIEND, "get", REPLY, existing=REPLY_DATA)
case("メンバーは返信の一覧を読める", True, FRIEND, "list", REPLY, existing=REPLY_DATA)
case("メンバーは返信を送れる", True, ME, "create", REPLY, incoming=REPLY_DATA)
case("メンバーでない人は返信を読めない", False, STRANGER, "get", REPLY, existing=REPLY_DATA)
case("メンバーでない人は返信を送れない", False, STRANGER, "create", REPLY, incoming=merged(REPLY_DATA, senderId=STRANGER))
case("他人になりすまして返信できない", False, ME, "create", REPLY, incoming=merged(REPLY_DATA, senderId=FRIEND))
case("返信は書き換えられない", False, ME, "update", REPLY, existing=REPLY_DATA, incoming=merged(REPLY_DATA, text="なおした"))

# --- Functionsだけが使う場所
for collection in ["_notificationDevices", "_notificationDeliveries", "_poemReminders", "_poemGenerationUsage"]:
    case(collection + " はアプリから読めない", False, ME, "get", "/" + collection + "/x", existing={"userId": ME}, room=None)
    case(collection + " はアプリから書けない", False, ME, "create", "/" + collection + "/x", incoming={"userId": ME}, room=None)
case("決めていない場所は読めない", False, ME, "get", "/anything/x", existing={"a": 1}, room=None)


def main():
    token = subprocess.check_output(["gcloud", "auth", "print-access-token"]).decode().strip()
    body = {
        "source": {"files": [{"name": "firestore.rules", "content": (ROOT / "firestore.rules").read_text(encoding="utf-8")}]},
        "testSuite": {"testCases": [test for _, test in cases]},
    }
    request = urllib.request.Request(
        "https://firebaserules.googleapis.com/v1/projects/%s:test" % PROJECT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": PROJECT},
    )
    result = json.load(urllib.request.urlopen(request, timeout=60))
    for issue in result.get("issues", []):
        print("ルールの問題:", issue.get("severity"), issue.get("description"), issue.get("sourcePosition", {}).get("line"))
    results = result.get("testResults", [])
    failed = 0
    for (name, test), outcome in zip(cases, results):
        ok = outcome.get("state") == "SUCCESS"
        failed += not ok
        if not ok or "-v" in sys.argv:
            print(("ok   " if ok else "NG   ") + ("許可 " if test["expectation"] == "ALLOW" else "拒否 ") + name)
            if not ok:
                print("     ", json.dumps(outcome.get("debugMessages") or outcome.get("errorPosition") or outcome, ensure_ascii=False)[:400])
    if len(results) != len(cases):
        print("結果の数が合いません:", len(results), "/", len(cases))
        failed += 1
    print("%d 場面中 %d 場面が期待どおり" % (len(cases), len(cases) - failed))
    sys.exit(1 if failed or any(issue.get("severity") == "ERROR" for issue in result.get("issues", [])) else 0)


if __name__ == "__main__":
    main()
