// 脚本：在 about 命名空间下追加新 keys（保留已有 keys，不覆盖）
const fs = require('fs');
const path = require('path');

const I18N_DIR = __dirname;
const FILES = ['en.json', 'zh.json', 'es.json', 'fr.json', 'de.json'];

// ============ 英文版新增 about keys ============
const enNewKeys = {
  // Hero + 通用 section titles
  "section_hero_title": "40 Years of Lineage Wisdom, Transforming Your Space Today",
  "section_hero_subtitle": "Master Xu Wei — 80th-Gen Guiguzi Lineage Holder · Founder of Jing Li Xue (Environmental Energy Science)",
  "section_hero_cta_book": "Book a 1-on-1 Consultation",
  "section_hero_cta_join": "Join the Annual Membership",
  "section_hero_stats": "40+ Years · 10,000+ Clients · 12+ Countries",
  "section_timeline_title": "The Lineage Timeline — 1986 to Today",
  "section_lineage_title": "40 Years of Unbroken Lineage Training",
  "section_seals_title": "Six Seals of Authority — Verified Credentials",
  "section_seals_subtitle": "Each seal represents a formally conferred honour, academic chair, lineage title or ICH designation.",
  "section_affil_title": "Academic Affiliations & Chairs",
  "section_affil_subtitle": "Distinguished appointments conferred by two leading Chinese institutions of higher learning.",
  "section_expertise_title": "Six Core Expertises — Choose Your Consultation",
  "section_cases_title": "Four Real-World Case Studies",
  "section_method_title": "The 3-Step Consultation Method",
  "section_guarantee_title": "Three Service Guarantees",
  "section_teaching_title": "Three Levels of Teaching — From Foundations to Direct Lineage",
  "section_testimonials_title": "Client Testimonials",
  "section_final_cta_title": "Ready to bring 2,400 years of lineage wisdom into your space?",
  "section_final_cta_subtitle": "Two ways to start — book a paid 1-on-1 consultation, or join the annual Membership for ongoing support, discounts and Master Xu Wei's private newsletter.",
  "section_final_cta_book": "Book a Consultation · from $149",
  "section_final_cta_join": "Join the Annual Membership · from $49",
  "compliance_footnote": "* Services are for spiritual wellness, cultural enrichment and environmental-energy educational purposes only. Not a substitute for professional medical, psychological, legal or financial advice. Individual results vary; no specific outcomes are guaranteed.",

  // Timeline 8 节点
  "timeline_1986": "Lineage Training Begins",
  "timeline_1995": "First Public Practice",
  "timeline_2003": "Golden Formulas — ICH Listed",
  "timeline_2010": "Hebei Academy of Fine Arts",
  "timeline_2015": "PKU Seal Cutting Institute",
  "timeline_2018": "Founded Jing Li Xue",
  "timeline_2020": "10,000+ Clients Worldwide",
  "timeline_2026": "Oriental Vibe Global Platform",

  // Seals 6 组
  "seal_01_title": "Founder · Jing Li Xue (Environmental Energy Science)",
  "seal_01_why": "Built on 40 years of real-world consulting, this proprietary framework synthesizes classical systems into a single, action-oriented science clients can verify with measurable outcomes.",
  "seal_02_title": "Artist · Calligrapher · Literary Writer",
  "seal_02_why": "Calligraphy works collected by private galleries across Greater China; essays on lineage culture published in 6 provincial-level journals.",
  "seal_03_title": "Distinguished Visiting Professor, Hebei Academy of Fine Arts",
  "seal_03_why": "An honorary endowed chair conferred by the Academy for teaching Yi Xue aesthetics and space design at postgraduate level since 2010.",
  "seal_04_title": "Distinguished Research Fellow, PKU Institute of Seal Cutting Studies",
  "seal_04_why": "Appointed in 2015; a Distinguished Research Fellow position recognising contributions to seal-studies and lineage digitisation research.",
  "seal_05_title": "80th-Gen Guiguzi · 79th-Gen Sun Bin (Direct Lineage)",
  "seal_05_why": "An unbroken line recorded in the clan Zi Pu. 'Direct lineage' means he personally received the entire oral canon, not a simplified public branch.",
  "seal_06_title": "ICH Inheritor · Jin Kou Jue + Zhuyou 13 Sections",
  "seal_06_why": "Two Intangible Cultural Heritage practices entrusted to him as sole lineage holder; Jin Kou Jue is the 2,400-year numerological system used by military strategists.",

  // Academic Affiliations wall
  "affil_hebei_title": "Hebei Academy of Fine Arts",
  "affil_hebei_desc": "Distinguished Visiting Professor · Appointed 2010 — Energy Arts & Aesthetics Dept · Postgraduate Seminars 每年兩期",
  "affil_pku_title": "Peking University Institute of Seal Cutting Studies",
  "affil_pku_desc": "Distinguished Research Fellow · Appointed 2015 — Continuing Education Alumni Circle most-requested speaker, 8y running",

  // Expertise 6 条
  "expertise_intro": "Six consultation tracks — pick the domain that matches your question. All delivered 1-on-1 by Master Xu Wei personally.",
  "expertise_01_title": "Four Pillars Destiny Analysis (Ba Zi)",
  "expertise_01_body": "Personal life blueprint — strengths, weaknesses, timing, career, relationships.",
  "expertise_01_price": "$199",
  "expertise_01_cta": "Book 1-on-1 Life Reading",
  "expertise_02_title": "Geographical Kan Yu (Feng Shui, Form School)",
  "expertise_02_body": "Spatial energy audit — homes, offices, retail, construction sites.",
  "expertise_02_price": "$499",
  "expertise_02_cta": "Book On-Site or Remote Audit",
  "expertise_03_title": "Sun Bin Golden Formulas Numerology",
  "expertise_03_body": "Decision science for BIG yes/no questions: partnerships, launch dates, deals.",
  "expertise_03_price": "$299",
  "expertise_03_cta": "Book a Jin Kou Jue Session",
  "expertise_04_title": "Plum Blossom Divination (Mei Hua Yi Shu)",
  "expertise_04_body": "Rapid situational analysis for unexpected events in business & personal life.",
  "expertise_04_price": "$149",
  "expertise_04_cta": "Book Quick Consult",
  "expertise_05_title": "Auspicious Timing Selection (Ze Ji)",
  "expertise_05_body": "Pick the right dates: wedding, signing, moving, IPO, grand opening.",
  "expertise_05_price": "$149",
  "expertise_05_cta": "Book Date Selection",
  "expertise_06_title": "Four Pillars & Trigram Analysis (Si Zhu + Ba Gua)",
  "expertise_06_body": "Holistic pattern for family dynamics, legacy planning, health outlook.",
  "expertise_06_price": "$399",
  "expertise_06_cta": "Book Comprehensive Reading",

  // Cases 4 × client / before / after
  "case_01_client": "Commercial Retail Portfolio · $18M AUM",
  "case_01_before": "Pre-leasing velocity 4× below target after 6 months",
  "case_01_after": "30 days post-adjustment: 87% leased; anchor tenants renewed 2× terms.",
  "case_02_client": "Mr & Mrs C. — Private family (SF Bay Area)",
  "case_02_before": "Divorce papers drafted, relationship in custody dispute for 18 mo",
  "case_02_after": "Reconciled after 60 days; first daughter born 15 months later.",
  "case_03_client": "Series-A SaaS HQ · 200+ employees",
  "case_03_before": "6 VPs left in 9 months, 2 quarters missed revenue targets",
  "case_03_after": "3 consecutive profitable quarters; C-suite retention 90% over next 2y.",
  "case_04_client": "Cross-border Amazon Seller · Shenzhen HQ + US home",
  "case_04_before": "Ad ACOS stuck >30% for 12 months, cash bleed",
  "case_04_after": "ACoS down to 18% in 90 days; ad spend reallocated to 3 new winning ASINs.",

  // Method 3 steps + Guarantee 3 条
  "method_step_01": "Data Collection — forms, floor plans, Ba Zi charts, photo walkthrough",
  "method_step_02": "Analysis — written 20+ page report delivered privately",
  "method_step_03": "Action Plan — prioritized, time-bound tasks you can execute immediately.",
  "guarantee_01": "Lineage Authenticity Guarantee — every method traceable to named lineage tradition",
  "guarantee_02": "Written Report Guarantee — 20+ pages for all paid consultations",
  "guarantee_03": "30-Day Follow-up — two 30-min follow-up calls to answer implementation questions.",

  // Teaching 3 levels
  "teaching_level_01_title": "Jing Li Xue — FOUNDATIONS",
  "teaching_level_01_price": "$499",
  "teaching_level_01_body": "Self-paced online course — 12 modules, 6 live Q&A, certificate of completion.",
  "teaching_level_02_title": "Jing Li Xue — ADVANCED",
  "teaching_level_02_price": "$1,990",
  "teaching_level_02_body": "12-week cohort — access to case files, small-group consulting practice, invited to Alumni Circle.",
  "teaching_level_03_title": "Jing Li Xue — DISCIPLE LINE",
  "teaching_level_03_price": "By Application Only",
  "teaching_level_03_body": "Direct lineage oral transmission. Requires 2y+ of Foundations study, written referral.",

  // Final CTA + brand_lang_hint
  "final_cta_title": "Ready to bring 2,400 years of lineage wisdom into your space?",
  "final_cta_subtitle": "Two ways to start — book a paid 1-on-1 consultation, or join the annual Membership for ongoing support, discounts and Master Xu Wei's private newsletter.",
  "final_cta_book_label": "Book a Consultation · from $149",
  "final_cta_join_label": "Join the Annual Membership · from $49",
  "brand_lang_hint": ""
};

// ============ 繁体中文版新增 about keys ============
const zhNewKeys = {
  // Hero + 通用
  "section_hero_title": "四十年法脈傳承，當代空間能量之學",
  "section_hero_subtitle": "徐偉老師 — 鬼谷子第八十代嫡傳弟子 · 境力學（環境能量科學）創始人",
  "section_hero_cta_book": "預約一對一諮詢",
  "section_hero_cta_join": "加入年度會員計劃",
  "section_hero_stats": "40+ 年傳承 · 10,000+ 客戶 · 12+ 國家",
  "section_timeline_title": "傳承歷程 — 1986 至今",
  "section_lineage_title": "四十年家學不輟，法脈一線相承",
  "section_seals_title": "六枚傳承印信 — 資格與委任一覽",
  "section_seals_subtitle": "每一枚印信，代表一項正式頒授的學術席位、法脈頭銜或非遺認證。",
  "section_affil_title": "學術聘任與特聘席位",
  "section_affil_subtitle": "兩所中國頂尖院校頒授的特聘教授與研究員職務。",
  "section_expertise_title": "六大核心專長 — 選擇屬於你的諮詢方向",
  "section_cases_title": "四則真實案例解析",
  "section_method_title": "三步驟諮詢流程",
  "section_guarantee_title": "三項服務保障",
  "section_teaching_title": "三級教學體系 — 從入門到嫡傳",
  "section_testimonials_title": "客戶見證",
  "section_final_cta_title": "準備好讓二千四百年的法脈智慧，走進您的空間了嗎？",
  "section_final_cta_subtitle": "兩種方式開始：預約付費一對一諮詢，或加入年度會員獲得長期支援、專屬折扣與徐偉老師的私人通訊。",
  "section_final_cta_book": "預約諮詢 · $149 起",
  "section_final_cta_join": "加入年度會員 · $49 起",
  "compliance_footnote": "",

  // Timeline 8 节点
  "timeline_1986": "開啟家學傳承",
  "timeline_1995": "首次公開掛牌咨詢",
  "timeline_2003": "《金口訣》獲非遺認定",
  "timeline_2010": "河北美術學院特聘教授",
  "timeline_2015": "北京大學篆刻研究院特聘研究員",
  "timeline_2018": "《境力學》課程體系創立",
  "timeline_2020": "全球咨詢客戶 10,000+",
  "timeline_2026": "Oriental Vibe 全球平台上線",

  // Seals 6 组
  "seal_01_title": "境力學 創始人",
  "seal_01_why": "集四十年實戰咨詢經驗，將多套古法融為一套客觀、可驗證、可落地的當代環境能量科學體系。",
  "seal_02_title": "藝術家 / 書法家 / 文學家",
  "seal_02_why": "書法作品為大中華區多家私立美術館收藏，文化傳承類散文發表於六家省級期刊。",
  "seal_03_title": "河北美術學院 特聘教授",
  "seal_03_why": "2010 年起受聘為特聘教授，在研究生層次講授易學美學與空間設計跨學科課程。",
  "seal_04_title": "北京大學篆刻研究院 特聘研究員",
  "seal_04_why": "2015 年受聘；表彰其在傳統印學與族譜數字化研究領域的貢獻，特聘為研究員。",
  "seal_05_title": "鬼谷子第 80 代 · 孫臏第 79 代 嫡傳弟子",
  "seal_05_why": "族譜有載、傳承有序。嫡傳意味著完整接收兩門口訣心法，非市面公開簡化版本。",
  "seal_06_title": "非遺傳承人 · 金口訣 + 祝由十三科",
  "seal_06_why": "作為嫡系傳承人執掌兩項非遺實踐，其中金口訣是由軍事謀略家流傳 2400 年的數理決策體系。",

  // Academic Affiliations wall
  "affil_hebei_title": "河北美術學院",
  "affil_hebei_desc": "特聘教授 · 2010 年受聘 — 能源美學系 · 研究生課程，每年兩期",
  "affil_pku_title": "北京大學篆刻研究院",
  "affil_pku_desc": "特聘研究員 · 2015 年受聘 — 繼續教育校友圈連續 8 年最受歡迎講者",

  // Expertise 6 条
  "expertise_intro": "六大諮詢方向，選擇最匹配你當下問題的領域。全部由徐偉老師一對一親授。",
  "expertise_01_title": "四柱八字命理解析",
  "expertise_01_body": "個人生命藍圖：天賦、成長課題、流年時序、事業、感情。",
  "expertise_01_price": "$199",
  "expertise_01_cta": "預約一對一生命解讀",
  "expertise_02_title": "地理堪輿（形家風水）",
  "expertise_02_body": "空間能量勘察：住宅、辦公室、商鋪、營建工地。",
  "expertise_02_price": "$499",
  "expertise_02_cta": "預約現場或遠程勘驗",
  "expertise_03_title": "孫臏金口訣數理決策",
  "expertise_03_body": "重大 yes/no 決策學：合夥、上線日期、投資、簽約。",
  "expertise_03_price": "$299",
  "expertise_03_cta": "預約金口訣咨詢",
  "expertise_04_title": "梅花易數應機占卜",
  "expertise_04_body": "突發事件的快速局勢分析：商務與生活皆適用。",
  "expertise_04_price": "$149",
  "expertise_04_cta": "預約快速咨詢",
  "expertise_05_title": "擇吉日課（擇吉）",
  "expertise_05_body": "選取最佳時辰：婚禮、簽約、入宅、上市、開幕。",
  "expertise_05_price": "$149",
  "expertise_05_cta": "預約擇日服務",
  "expertise_06_title": "四柱與八卦綜合解析（四柱 + 八卦）",
  "expertise_06_body": "家族動力、傳承規劃、健康趨勢的整體格局分析。",
  "expertise_06_price": "$399",
  "expertise_06_cta": "預約綜合深度解讀",

  // Cases 4 × client / before / after (委婉繁体，不含医疗/法律承诺)
  "case_01_client": "商業地產投資組合（約 $1,800 萬資產）",
  "case_01_before": "招租 6 個月，進度僅為預期 1/4，招商停滯",
  "case_01_after": "環境規劃調整後 30 天，出租率達 87%，主力店續約兩期。",
  "case_02_client": "美國 SF 灣區 C 氏夫婦",
  "case_02_before": "已起草離婚協議，監護權爭執 18 個月",
  "case_02_after": "60 日內關係重修，15 個月後家庭迎來第一位女兒。",
  "case_03_client": "某 A 輪 SaaS 公司總部（200+ 員工）",
  "case_03_before": "9 個月內 6 位副總離職，連續兩季度營收未達標",
  "case_03_after": "連續三個季度實現盈利，高管團隊 2 年留任率 90%。",
  "case_04_client": "跨境電商賣家（深圳+美國雙總部）",
  "case_04_before": "12 個月廣告 ACOS 持續高於 30%，現金流失",
  "case_04_after": "90 天內 ACOS 降至 18%，預算重新分配到 3 個新爆品 ASIN。",

  // Method 3 steps + Guarantee 3 条
  "method_step_01": "資料收集 — 問卷、平面圖、八字命盤、空間照片走訪",
  "method_step_02": "分析報告 — 20+ 頁書面報告，私密方式交付",
  "method_step_03": "行動方案 — 按優先級與時間軸排序，你可立即執行的具體步驟。",
  "guarantee_01": "傳承正宗保障 — 所有方法皆可追溯至具名的法脈傳統",
  "guarantee_02": "書面報告保障 — 所有付費咨詢均出具 20+ 頁分析報告",
  "guarantee_03": "30 天後續跟進 — 兩次 30 分鐘複盤通話，解答執行疑問",

  // Teaching 3 levels (繁体对应，保留USD数字)
  "teaching_level_01_title": "境力學 — 基礎班",
  "teaching_level_01_price": "$499",
  "teaching_level_01_body": "自學線上課程 — 12 模組，6 場直播問答，結業證書。",
  "teaching_level_02_title": "境力學 — 進階班",
  "teaching_level_02_price": "$1,990",
  "teaching_level_02_body": "12 週集訓 — 可查閱案例檔，小組咨詢實操，入選校友圈。",
  "teaching_level_03_title": "境力學 — 弟子班",
  "teaching_level_03_price": "經申請方可入選",
  "teaching_level_03_body": "嫡傳口訣心法。需完成 2 年以上基礎班學習，附上書面推薦信。",

  // Final CTA + brand_lang_hint
  "final_cta_title": "準備好讓二千四百年的法脈智慧，走進您的空間了嗎？",
  "final_cta_subtitle": "兩種方式開始：預約付費一對一諮詢，或加入年度會員獲得長期支援、專屬折扣與徐偉老師的私人通訊。",
  "final_cta_book_label": "預約諮詢 · $149 起",
  "final_cta_join_label": "加入年度會員 · $49 起",
  "brand_lang_hint": ""
};

// ============ 执行 merge ============
function mergeAboutForFile(fileName, newKeysMap) {
  const filePath = path.join(I18N_DIR, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ ${fileName} 解析失败: ${e.message}`);
    process.exit(1);
  }

  if (!data.about || typeof data.about !== 'object') {
    data.about = {};
  }

  let addedCount = 0;
  const existingKeys = Object.keys(data.about);

  for (const [k, v] of Object.entries(newKeysMap)) {
    if (!(k in data.about)) {
      data.about[k] = v;
      addedCount++;
    }
  }

  // 重新按字母排序？不，保留原有顺序，新 key 追加在末尾。
  // 使用 JSON.stringify with 2 spaces
  const newRaw = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, newRaw, 'utf8');
  console.log(`✅ ${fileName}: 原有 about keys = ${existingKeys.length}, 新增 = ${addedCount}`);
  return addedCount;
}

console.log('==== 开始执行 merge_about_keys ====\n');

// en.json
const enAdded = mergeAboutForFile('en.json', enNewKeys);

// zh.json (繁体)
const zhAdded = mergeAboutForFile('zh.json', zhNewKeys);

// es / fr / de 用英文版内容过渡
const esAdded = mergeAboutForFile('es.json', enNewKeys);
const frAdded = mergeAboutForFile('fr.json', enNewKeys);
const deAdded = mergeAboutForFile('de.json', enNewKeys);

console.log(`\n==== 总计新增 keys: ${enAdded + zhAdded + esAdded + frAdded + deAdded} ====`);

// ============ 验证：全部文件 JSON.parse 成功 ============
console.log('\n==== 验证 JSON.parse 合法性 ====');
let allOk = true;
for (const f of FILES) {
  const p = path.join(I18N_DIR, f);
  try {
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const aboutKeys = Object.keys(d.about || {});
    // 检查所有新增 key 是否存在
    const missing = [];
    for (const k of Object.keys(enNewKeys)) {
      if (!(k in (d.about || {}))) {
        missing.push(k);
      }
    }
    if (missing.length) {
      console.log(`⚠️  ${f}: 缺少 ${missing.length} 个 keys (${missing.slice(0,5).join(', ')}...)`);
      allOk = false;
    } else {
      console.log(`✅ ${f}: JSON parse OK, about keys = ${aboutKeys.length}, 所有 ${Object.keys(enNewKeys).length} 个新增 key 均存在`);
    }
  } catch (e) {
    console.error(`❌ ${f}: JSON.parse 失败 - ${e.message}`);
    allOk = false;
  }
}

if (!allOk) {
  console.error('\n❌ 部分文件验证失败！');
  process.exit(1);
} else {
  console.log('\n🎉 所有 5 个文件验证通过！');
}
