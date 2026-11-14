const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function harness() {
  const storage = () => { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }; };
  const node = { addEventListener() {}, classList: { add() {}, remove() {} } };
  const records = new Map([["users/me", { favoritePoem: { roomId:"r", messageId:"legacy", lines:["昔の一首"] } }]]);
  const writes = [];
  const context = vm.createContext({
    console, Date, URLSearchParams, crypto: require("node:crypto"),
    window: { location:{search:"",hostname:"example.com"}, setTimeout(){}, clearTimeout(){}, POTONCHU_FIREBASE_CONFIG:{apiKey:"test",authDomain:"test",projectId:"test",appId:"test"} },
    document:{querySelector:()=>node}, navigator:{onLine:true}, sessionStorage:storage(),localStorage:storage(),
    PotonchuPoems:require("../poem-engine.js"),PotonchuChatRules:require("../chat-rules.js"),PotonchuFeedback:{enabled:false,play(){}},
    globalRecords:records, globalWrites:writes,
  });
  const source = fs.readFileSync(path.join(__dirname,"../script.js"),"utf8");
  vm.runInContext(source.slice(0,source.indexOf('app.addEventListener("keydown", handleChatEnter)')),context);
  const run = code => vm.runInContext(code,context);
  run(`saveSessionUser({id:"me",name:"確認用"}); sessionStorage.setItem(ACTIVE_ROOM_KEY,"r"); backend.mode="firebase";
    sharedState.rooms=[normalizeRoom({id:"r",name:"確認用トーク",members:[{id:"me",name:"確認用"}],messages:[{id:"p",author:{id:"me"},lines:["一","二","三","四","五"],createdAt:Date.now()}]})];
    backend.firebase={db:{},firestoreModule:{
      doc:(_, ...parts)=>parts.join("/"), serverTimestamp:()=>({serverTimestamp:true}),
      getDoc:async ref=>({exists:()=>globalRecords.has(ref),data:()=>globalRecords.get(ref)}),
      setDoc:async(ref,data,options)=>{globalWrites.push({ref,data}); if(globalThis.failWrite) throw new Error("permission-denied");globalRecords.set(ref,options?.merge?{...globalRecords.get(ref),...data}:data);},
      runTransaction:async(_,work)=>{if(globalThis.failTransaction)throw new Error("permission-denied"); return work({get:async ref=>({data:()=>globalRecords.get(ref)}),set:(ref,data)=>globalRecords.set(ref,{...globalRecords.get(ref),...data})});}
    }};refreshAppState();render=()=>refreshAppState();`);
  return {run,records,writes,json:code=>JSON.parse(run(`JSON.stringify(${code})`))};
}

test("production sends text to Firestore with sender and kind; failed sends retain the draft",async()=>{
  const app=harness();
  await app.run('sendChatMessage("届く文章")');
  assert.equal(app.writes[0].data.kind,"text");
  assert.equal(app.writes[0].data.senderId,"me");
  assert.match(app.writes[0].ref,/^rooms\/r\/messages\/text_/);
  assert.equal(app.run('currentRoom().messages.filter(m=>m.kind==="text").length'),1);
  app.run("globalThis.failWrite=true");
  await app.run('sendChatMessage("失敗しても残す文章")');
  assert.equal(app.run('ui.chatDrafts.get("r:text")'),"失敗しても残す文章");
  assert.equal(app.run('currentRoom().messages.filter(m=>m.kind==="text").length'),1);
  assert.equal(app.run('backend.chatSending.size'),0);
});

test("production rejects text after twelve hours even if the composer is already open",async()=>{
  const app=harness();
  app.run("sharedState.rooms[0].messages[0].createdAt=Date.now()-12*PotonchuChatRules.HOUR");
  await app.run('sendChatMessage("期限後の文章")');
  assert.equal(app.writes.length,0);
  assert.equal(app.run("ui.composeMode"),"poem");
});

test("production reads text documents while remaining compatible with existing poems",()=>{
  const app=harness();
  assert.equal(app.run('normalizeFirebaseMessage("r",{id:"t",data:()=>({kind:"text",text:"こんにちは",senderId:"other",createdAtMillis:1000})}).text'),"こんにちは");
  assert.equal(app.run('normalizeFirebaseMessage("r",{id:"p",data:()=>({poemLines:["一","二","三","四","五"],senderId:"other"})}).kind'),"poem");
});

test("favorites migrate the old favorite, merge remote additions, survive reload, and reject failed updates",async()=>{
  const app=harness();
  await app.run('saveFavorite("p")');
  assert.deepEqual(Array.from(app.records.get("users/me").favoritePoems,f=>f.messageId),["p","legacy"]);
  app.records.get("users/me").favoritePoems.push({messageId:"other-device",roomId:"r"});
  await app.run('saveFavorite("p")');
  assert.deepEqual(Array.from(app.records.get("users/me").favoritePoems,f=>f.messageId),["p","legacy","other-device"]);
  await app.run('updateFavorites(items=>items.filter(item=>item.messageId!=="legacy"))');
  assert.deepEqual(Array.from(app.records.get("users/me").favoritePoems,f=>f.messageId),["p","other-device"]);
  const reloaded=await app.run('loadFirebaseUser({uid:"me",displayName:"確認用"})');
  assert.equal(reloaded.favoritePoems.length,2);
  app.run('globalThis.failTransaction=true');
  await assert.rejects(app.run("updateFavorites(()=>[])"));
  assert.equal(app.run("getFavorites().length"),2);
});

test("production excludes sample contacts and clocks and supports long feelings",async()=>{
  const app=harness();
  assert.equal(app.run("renderPreviewControls()"),"");
  assert.equal(app.run('renderHome().includes("仮の相手・グループを追加")'),false);
  app.run("ui.clockOffset=999999999");
  assert.ok(Math.abs(app.run("previewNow()")-Date.now())<1000);
  const draft=await app.run('generatePoem("助けてくれた友達にありがとうを伝えたい", "", "r")');
  assert.equal(draft.lines.length,5);assert.equal(draft.choices.length,4);
});

test("a failed profile write does not pretend the name has been saved",async()=>{
  const app=harness();app.run("globalThis.failWrite=true");
  await app.run('handleSubmit({preventDefault(){},target:{closest:()=>({dataset:{form:"profile-name"},elements:{namedItem:()=>({value:"変更後"})}})}})');
  assert.equal(app.run("appState.user.name"),"確認用");
});

test("LINE shows external-browser help; Safari does not; auth failures retain a safe error code",async()=>{
  const app=harness();
  app.run('navigator.userAgent="Mozilla/5.0 iPhone Line/15.0"');
  assert.equal(app.run("isEmbeddedBrowser()"),true);
  assert.equal(app.run('renderLogin().includes("このページのURLをコピー")'),true);
  assert.equal(app.run('renderLogin().includes("disabled aria-describedby")'),true);
  app.run('navigator.userAgent="Mozilla/5.0 iPhone Version/18.0 Mobile Safari/604.1"');
  assert.equal(app.run("isEmbeddedBrowser()"),false);
  assert.equal(app.run('renderLogin().includes("disabled aria-describedby")'),false);
  app.run(`backend.firebase.authModule={GoogleAuthProvider:class{},signInWithPopup:async()=>{throw {code:"auth/unauthorized-domain"}}};`);
  assert.equal(await app.run("signInWithFirebase()"),false);
  assert.equal(app.run("backend.loginError.code"),"auth/unauthorized-domain");
  assert.match(app.run("backend.loginError.message"),/ログイン許可設定/);
});
