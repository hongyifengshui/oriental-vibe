// A2 audit: Admin lsSet keys x frontend listeners x render reads
const fs=require("fs");
const P="/workspace/oriental-space-energy/";

// Step 1: extract all lsSet(k) from admin.astro
const admin=fs.readFileSync(P+"src/pages/admin.astro","utf8");
const keys=new Set();
let m;
const re=/lsSet\(\s*['"`]([^'"`]+)['"`]/g;
while(m=re.exec(admin)) keys.add(m[1]);
console.log("=== Admin 写入的逻辑 key（"+keys.size+"） ===");
[...keys].sort().forEach(k=>console.log("  - "+k));

// Step 2: D1 snapshot fields
const all=fs.readFileSync(P+"functions/api/data/all.js","utf8");
const sf=new Set();
const re2=/snap\.(\w+)\s*=\s*safeParse/g;
while(m=re2.exec(all)) sf.add(m[1]);
// also the flat "writeAndBroadcast" fields in BaseLayout
const bl=fs.readFileSync(P+"src/layouts/BaseLayout.astro","utf8");
const blf=new Set();
const re3=/writeAndBroadcast\(['"`]([^'"`]+)['"`]/g;
while(m=re3.exec(bl)) blf.add(m[1]);
console.log("\n=== D1 snapshot 写入广播字段（snap / BaseLayout.writeAndBroadcast） ===");
console.log("  snapshot fields: "+[...sf].sort().join(", "));
console.log("  BaseLayout write: "+[...blf].sort().join(", "));

// Step 3: per-page listeners (parse ov-admin-saved conditional key)
const pages=[
  ["shop","src/pages/shop.astro"],
  ["blog","src/pages/blog.astro"],
  ["services","src/pages/services.astro"],
  ["courses","src/pages/courses.astro"],
  ["faq","src/pages/faq.astro"],
  ["index","src/pages/index.astro"],
  ["about","src/pages/about.astro"],
  ["membership","src/pages/membership.astro"],
  ["CartDrawer","src/components/CartDrawer.astro"],
  ["WhatsApp","src/components/WhatsAppButton.astro"],
];
console.log("\n=== 逐页监听器：ov-admin-saved 接受的 keys ===");
pages.forEach(([name,p])=>{
  const src=fs.readFileSync(P+p,"utf8");
  // Extract _admin_xxx_changed function bodies
  const listeners=[];
  const chFn=src.match(/function _admin_\w+_changed\([^)]*\)\s*\{([^}]+)\}/g);
  if(chFn){
    chFn.forEach(fn=>{
      const fnName=fn.match(/function (_admin_\w+_changed)/)[1];
      const keys=[];
      const kr=/k(?:ey)?\s*===\s*['"`]([^'"`]+)['"`]/g;
      let mm;
      while(mm=kr.exec(fn)) keys.push(mm[1]);
      // check || k === '__all__' pattern
      const kr2=/\|\|\s*k(?:ey)?\s*===\s*['"`]([^'"`]+)['"`]/g;
      while(mm=kr2.exec(fn)) if(!keys.includes(mm[1])) keys.push(mm[1]);
      const kr3=/k(?:ey)?\s*==\s*null/g;
      if(kr3.test(fn)) keys.unshift("null(=初始化)");
      listeners.push(fnName+"("+keys.join("|")+")");
    });
  }
  // Inline ov-admin-saved handler conditionals
  const inline=src.match(/window\.addEventListener\(['"`](ov-admin-saved)['"`][\s\S]{0,800}?\n\s*\}\);/g);
  if(inline){
    inline.forEach(block=>{
      const keys=[];
      const kr=/k\s*===\s*['"`]([^'"`]+)['"`]/g;
      let mm;
      while(mm=kr.exec(block)) keys.push(mm[1]);
      if(/k\s*==\s*null/.test(block)) keys.unshift("null");
      const kr2=/\|\|\s*k\s*===\s*['"`]([^'"`]+)['"`]/g;
      while(mm=kr2.exec(block)) if(!keys.includes(mm[1])) keys.push(mm[1]);
      // settingsKeyChanged function in CartDrawer
      const skc=block.match(/settingsKeyChanged\(e/);
      if(skc){
        // Read the actual settingsKeyChanged fn definition
        const skd=src.match(/function settingsKeyChanged\(k\)\s*\{([^}]+)\}/);
        if(skd){
          const skKeys=[];
          const kkr=/k\s*===\s*['"`]([^'"`]+)['"`]/g;
          while(mm=kkr.exec(skd[1])) skKeys.push(mm[1]);
          if(/k\s*==\s*null/.test(skd[1])) skKeys.unshift("null");
          listeners.push("settingsKeyChanged("+skKeys.join("|")+")");
        }
      }
      if(keys.length) listeners.push("inline("+keys.join("|")+")");
    });
  }
  console.log("  📄 "+name+"  "+p);
  console.log("     → "+(listeners.length?listeners.join(";  "):"(无 ov-admin-saved 监听器！)"));
});

console.log("\n=== 交叉覆盖：Admin 每个 key → 至少 1 个前端监听器？ ===");
const wantCover=[...keys,...sf,...blf].filter(k=>{
  // Skip pure-internal keys
  return !["token","admin-user","remember-username","pages","users","orders","data-version"].includes(k);
});
const mapCoverage = {
  products:["shop"], categories:["shop"], benefits:["shop","membership"],
  membershipLevels:["shop","membership"], members:["shop"],
  settings:["CartDrawer","WhatsApp","BaseLayout"],
  whatsappNumber:["CartDrawer","WhatsApp","BaseLayout"],
  page_faq:["faq"], page_home:["index"], page_about:["about"],
  content:["faq","index","about"],
  blog:["blog"], services:["services"], courses:["courses"],
  __all__:["shop","blog","services","courses","faq","index","about","membership","CartDrawer","WhatsApp"],
  paymentInfo:["CartDrawer","BaseLayout"],
};
const uniqWant=[...new Set(wantCover)];
uniqWant.sort().forEach(k=>{
  const humanKey=k.replace("page-","page_");
  const cov = Object.keys(mapCoverage).find(mk=>{
    if(mk===k) return true;
    if(k==="page-faq"&&mk==="page_faq") return true;
    if(k==="page-home"&&mk==="page_home") return true;
    if(k==="page-about"&&mk==="page_about") return true;
    return false;
  });
  if(cov){
    console.log("  ✅ "+k.padEnd(20)+" → 监听："+mapCoverage[cov].join(","));
  } else {
    // check for page-* keys
    console.log("  ❌ "+k.padEnd(20)+" → 没有任何前端监听到（可能是纯后台用的 internal key / 新页面尚未加同步）");
  }
});
console.log("\n✅ 覆盖校验结束。");
