const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
async function harness(){
  const storage=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
  const node={addEventListener(){},classList:{add(){},remove(){}}};
  const context=vm.createContext({console,Date,URLSearchParams,crypto:require("node:crypto"),document:{querySelector:()=>node},navigator:{onLine:true},
    window:{POTONCHU_PREVIEW:true,location:{search:""},setTimeout(fn){fn();},clearTimeout(){}},sessionStorage:storage(),localStorage:storage(),
    PotonchuPoems:require("../poem-engine.js"),PotonchuChatRules:require("../preview/chat-rules.js"),PotonchuFeedback:{enabled:false,play(){}}});
  const src=fs.readFileSync(path.join(__dirname,"../preview/script.js"),"utf8");
  vm.runInContext(src.slice(0,src.indexOf('app.addEventListener("compositionstart"')),context);
  const run=code=>vm.runInContext(code,context);
  run('saveSessionUser({id:"me",name:"確認用"});refreshAppState();render=()=>refreshAppState()');
  await run('(async()=>{const room=await createRoom("1対1のテスト","pair");await setActiveRoom(room.id);})()');
  return{run,json:code=>JSON.parse(run("JSON.stringify("+code+")"))};
}
test("edited titles survive sending, normalization, and favorites",async()=>{
  const app=await harness();await app.run('spinGacha("おなかすいた")');
  app.run('ui.composer.title="おなかすいた";ui.composer.selectedChoice=ui.composer.draft.choices[0];ui.composer.step="confirm"');
  assert.match(app.run("renderConfirm()"),/poemTitleInput/);await app.run("sendPoem()");
  assert.equal(app.run("currentRoom().messages[0].title"),"おなかすいた");
  const html=app.run("renderMessage(currentRoom().messages[0],currentRoom())");
  assert.match(html,/おなかすいた/);assert.doesNotMatch(html,/ぽとんと一首/);
  await app.run("saveFavorite(currentRoom().messages[0].id)");assert.equal(app.run("getFavorites()[0].title"),"おなかすいた");
  assert.equal(app.run('poemTitle({topic:"一首"})'),"無題の一首");assert.equal(app.run('poemTitle({topic:"帰り道"})'),"帰り道");
});
test("title markup is escaped and a blank title does not send",async()=>{
  const app=await harness();await app.run('spinGacha("ありがとう")');
  app.run('ui.composer.title="";ui.composer.selectedChoice=ui.composer.draft.choices[0];ui.composer.step="confirm"');
  await app.run("sendPoem()");assert.equal(app.run("currentRoom().messages.length"),0);
  app.run('ui.composer.title="<img src=x>"');await app.run("sendPoem()");
  const html=app.run("renderMessage(currentRoom().messages[0],currentRoom())");assert.ok(html.includes("&lt;img src=x&gt;"));assert.ok(!html.includes("<img src=x>"));
});
test("group history is retained but hidden and new rooms are always pairs",async()=>{
  const app=await harness();app.run('upsertLocalRoom({id:"old-group",name:"残すグループ履歴",type:"group",members:[appState.user],messages:[]})');
  assert.ok(!app.run("renderRoomList()").includes("残すグループ履歴"));
  await app.run('createRoom("新しいトーク","group")');assert.equal(app.run("sharedState.rooms[0].type"),"pair");
  assert.ok(!app.run("renderCreateRoom()").includes('value="group"'));assert.ok(app.run("sharedState.rooms.some(r=>r.id==='old-group')"));
});
test("a third person and group invitation cannot join a pair",async()=>{
  const app=await harness();app.run('upsertLocalRoom({id:"full",name:"満員",type:"pair",members:[{id:"a"},{id:"b"}],messages:[]})');
  assert.equal(await app.run('ensureJoinedRoom("full")'),null);assert.equal(app.run('findRoom("full").members.length'),2);
  app.run('ui.pendingInviteType="group"');assert.equal(await app.run('ensureJoinedRoom("group-link")'),null);assert.equal(app.run('findRoom("group-link")'),undefined);
});
test("peer profiles show shared names and icons and return to the conversation",async()=>{
  const app=await harness();app.run('const r=currentRoom();upsertLocalRoom({...r,members:[appState.user,{id:"friend",name:"友達",icon:"と",email:"private@example.com"}]});ui.view="chat"');
  assert.match(app.run("renderChat()"),/open-member-profile/);assert.match(app.run("renderRoomList()"),/open-member-profile/);
  await app.run('handleClick({target:{closest:()=>({dataset:{action:"open-member-profile",roomId:currentRoom().id,userId:"friend"}})}})');
  assert.equal(app.run("ui.view"),"member-profile");
  const html=app.run("renderMemberProfile()");assert.ok(html.includes("友達"));assert.ok(!html.includes("private@example.com"));
  await app.run('handleClick({target:{closest:()=>({dataset:{action:"close-member-profile"}})}})');assert.equal(app.run("ui.view"),"chat");
});
test("a sample friend can be used without a real account",async()=>{
  const app=await harness();await app.run('handleClick({target:{closest:()=>({dataset:{action:"sample-rooms"}})}})');
  const rooms=app.json("appState.rooms.filter(r=>r.name==='ともだち（お試し）')");
  assert.equal(rooms.length,1);assert.equal(rooms[0].members.length,2);assert.ok(app.json("appState.rooms").every(r=>r.type==="pair"));
});

test("remote poem titles are preserved",async()=>{const app=await harness();assert.equal(app.run('normalizeFirebaseMessage("room",{id:"poem",data:()=>({title:"おなかすいた",poemLines:["a","b","c","d","e"]})}).title'),"おなかすいた");});
