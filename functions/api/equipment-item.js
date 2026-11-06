const CHARACTER={serverId:"2316",characterId:"6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=",region:"eu"};
export async function onRequestGet({request}={}) {
  try {
    const query=new URL(request.url).searchParams;
    const id=Number(query.get("id")),slotPos=Number(query.get("slotPos"));
    const enchantLevel=Number(query.get("enchantLevel")??0),exceedLevel=Number(query.get("exceedLevel")??0);
    if(!Number.isSafeInteger(id)||id<=0||!Number.isSafeInteger(slotPos)||slotPos<=0||
       !Number.isSafeInteger(enchantLevel)||enchantLevel<0||!Number.isSafeInteger(exceedLevel)||exceedLevel<0) {
      return Response.json({ok:false,error:"Нужны корректные id и slotPos предмета из профиля NCSOFT."},{status:400,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
    }
    const params=new URLSearchParams({region:CHARACTER.region,lang:"en-US",characterId:CHARACTER.characterId,serverId:CHARACTER.serverId,id:String(id),slotPos:String(slotPos),enchantLevel:String(enchantLevel),exceedLevel:String(exceedLevel)});
    const upstream=await fetch("https://aion2.plaync.com/api/character/equipment/item?"+params.toString(),{headers:{Accept:"application/json, text/plain, */*","User-Agent":"Mozilla/5.0 (compatible; AION2BuildLab/1.0)",Referer:"https://aion2.plaync.com/"},signal:AbortSignal.timeout(10000),cf:{cacheTtl:45,cacheEverything:true}});
    const body=await upstream.text();
    if(!upstream.ok)throw new Error("NCSOFT item detail HTTP "+upstream.status+": "+body.slice(0,160));
    let payload;try{payload=JSON.parse(body);}catch{throw new Error("NCSOFT item detail вернул не JSON.");}
    const data=payload?.data&&typeof payload.data==="object"?payload.data:payload;
    if(!data||typeof data!=="object"||Array.isArray(data)||!data.id||!data.name) return Response.json({ok:false,error:"NCSOFT не вернул подробности этого предмета."},{status:502,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
    return Response.json({ok:true,source:"NCSOFT public equipped item detail",fetchedAt:new Date().toISOString(),data},{headers:{"Cache-Control":"public, max-age=20, s-maxage=45","X-Content-Type-Options":"nosniff"}});
  }catch(error){return Response.json({ok:false,error:error?.name==="TimeoutError"?"NCSOFT не ответил за 10 секунд.":error?.message||"Не удалось получить детали предмета."},{status:502,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
}
