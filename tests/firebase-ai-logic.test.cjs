const {test}=require("node:test");
const assert=require("node:assert/strict");
const ai=require("../preview/ai-logic.js");
const sample=()=>({lines:["ありがとう","君の言葉に",ai.BLANK,"心がほどけ","そっと届ける"],readings:["ありがとう","きみのことばに","","こころがほどけ","そっととどける"],choices:["あたたかい","うれしいな","忘れない","君がいる"],choiceReadings:["あたたかい","うれしいな","わすれない","きみがいる"]});
const reply=value=>({response:{text:()=>JSON.stringify(value)}});
test("validates all five lines and every middle choice",()=>{
  assert.equal(ai.validateDraft(sample()).source,"firebase-ai-logic");
  const wrong=sample();wrong.choiceReadings[3]="きみ";assert.throws(()=>ai.validateDraft(wrong));
  const bad=sample();bad.lines[2]="入力";assert.throws(()=>ai.validateDraft(bad));
  const duplicate=sample();duplicate.choices[3]=duplicate.choices[0];assert.throws(()=>ai.validateDraft(duplicate));
  const punctuation=sample();punctuation.readings[0]="あり。がとう";assert.throws(()=>ai.validateDraft(punctuation));
});
test("disabled mode never initializes Firebase or contacts a model",async()=>{
  let calls=0;const p=ai.createProvider({enabled:false},{makeModel:()=>{calls++;}});
  await assert.rejects(p.generate("ありがとう"),{code:"ai/disabled"});assert.equal(calls,0);
});
test("rejects invalid input before any model call",async()=>{
  let calls=0;const p=ai.createProvider({enabled:true},{makeModel:()=>{calls++;}});
  await assert.rejects(p.generate(""));await assert.rejects(p.generate("あ".repeat(201)));assert.equal(calls,0);
});
test("uses only the feeling, enforces one repair, and labels real AI output",async()=>{
  const requests=[];const bad=sample();bad.readings[0]="あ";
  const p=ai.createProvider({enabled:true},{makeModel:()=>({generateContent:async prompt=>{requests.push(prompt);return reply(requests.length===1?bad:sample());}})});
  const draft=await p.generate("助けてくれた友達にありがとうを伝えたい");
  assert.equal(requests.length,2);assert.equal(draft.source,"firebase-ai-logic");assert.equal(draft.choices.length,4);
  assert.match(requests[0],/入力データ/);assert.doesNotMatch(requests[0],/senderId|roomId|sessionUser/);
});
test("invalid output stops after two requests instead of returning a sample as AI",async()=>{
  let calls=0;const p=ai.createProvider({enabled:true},{makeModel:()=>({generateContent:async()=>{calls++;return reply({lines:[]});}})});
  await assert.rejects(p.generate("ありがとう"),{code:"ai/invalid-poem"});assert.equal(calls,2);
});
test("backend errors are surfaced and are not retried as content repairs",async()=>{
  let calls=0;const p=ai.createProvider({enabled:true},{makeModel:()=>({generateContent:async()=>{calls++;throw Object.assign(new Error("unavailable"),{code:"ai/service-disabled"});}})});
  await assert.rejects(p.generate("ありがとう"),{code:"ai/service-disabled"});assert.equal(calls,1);
});
test("concurrent taps cannot trigger parallel model requests",async()=>{
  let resolve;const p=ai.createProvider({enabled:true},{makeModel:()=>({generateContent:()=>new Promise(r=>{resolve=r;})})});
  const first=p.generate("ありがとう");await new Promise(setImmediate);
  await assert.rejects(p.generate("また回す"),{code:"ai/busy"});resolve(reply(sample()));await first;
});
test("rerolls reject the previous poem and accept a new one",async()=>{
  let calls=0;const other=sample();other.lines[3]="お礼をこめて";other.readings[3]="おれいをこめて";
  const p=ai.createProvider({enabled:true},{makeModel:()=>({generateContent:async()=>reply(++calls<3?sample():other)})});
  const first=await p.generate("ありがとう");const next=await p.generate("ありがとう");
  assert.notEqual(first.templateId,next.templateId);assert.equal(calls,3);
});
