import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/equipment-item.js";

test("rejects incomplete item identifiers without upstream requests",async()=>{
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls+=1;throw new Error("must not fetch");};
 try{
  const response=await onRequestGet({request:new Request("https://example.test/api/equipment-item?id=0&slotPos=1")});
  assert.equal(response.status,400);assert.equal((await response.json()).ok,false);assert.equal(calls,0);
 }finally{globalThis.fetch=originalFetch;}
});

test("loads exact equipped item detail with its enhancement parameters",async()=>{
 const originalFetch=globalThis.fetch;let requested="";
 globalThis.fetch=async(url)=>{requested=String(url);return new Response(JSON.stringify({id:901,name:"Ranger Bow",mainStats:[{id:"Attack",name:"Attack",value:"491"}],subStats:[{id:"Crit",name:"Critical Hit",value:"+80"}],magicStoneStat:[{slotPos:1,name:"Attack Stone",value:"+12"}]}),{status:200,headers:{"Content-Type":"application/json"}});};
 try{
  const response=await onRequestGet({request:new Request("https://example.test/api/equipment-item?id=901&slotPos=11&enchantLevel=12&exceedLevel=2")});
  const body=await response.json(),url=new URL(requested);
  assert.equal(response.status,200);assert.equal(body.ok,true);assert.equal(body.data.mainStats[0].value,"491");
  assert.equal(url.searchParams.get("id"),"901");assert.equal(url.searchParams.get("slotPos"),"11");
  assert.equal(url.searchParams.get("enchantLevel"),"12");assert.equal(url.searchParams.get("exceedLevel"),"2");
 }finally{globalThis.fetch=originalFetch;}
});
