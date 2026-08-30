/**
 * Oriental Vibe AI Assistant Core Engine
 * Features:
 * - Intent recognition (rule-based + keyword + cosine-lite token match)
 * - Knowledge Retrieval (products/services/courses/faq/expert/test)
 * - Intention-based product recommendation engine
 * - Compliance auto-append filter
 * - Human handoff escalation
 * - Multi-turn context memory
 * - Quick reply suggestions
 *
 * Pure JS, runs in browser (no server required for MVP). 
 * Can be swapped to real LLM later by replacing ai_answer() implementation.
 */

import {
  kbBrand,
  kbExpert,
  kbProducts,
  kbBundles,
  kbServices,
  kbCourses,
  kbTest,
  kbFAQ,
  kbCompliance,
  intentionRecommendations,
  kbContact,
  quickLinks,
  elementCrystalMap
} from "../data/ai-knowledge.js";

/* =========================================================
   UTILITIES
   ========================================================= */

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should","may",
  "might","can","i","you","he","she","it","we","they","them","my","your","his",
  "her","our","their","me","him","us","to","of","in","on","at","by","for",
  "with","about","against","between","into","through","during","before","after",
  "above","below","from","up","down","out","off","over","under","again","further",
  "then","once","here","there","when","where","why","how","all","any","both",
  "each","few","more","most","other","some","such","no","nor","not","only",
  "own","same","so","than","too","very","just","also","now","am","what","which",
  "who","whom","this","that","these","those","if","because","as","until","while",
  "please","thanks","thank","want","need","get","help","tell","know","think",
  "looking","looking for","find","show","give","recommend","suggest","hi","hello",
  "hey","greeting","start","good","bye","ok","okay","yes","no","well","much",
  "many","like","love","make","way","go","come","take","see","well","back",
  "even","still","new","old","different","thing","things","kind","type","way",
  "right","wrong","nice","great","one","two","three","first","second","third",
  "next","last","best","better","really","actually","even","always","never",
  "already","often","sometimes","usually","however","though","although","almost"
]);

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const n = normalize(text);
  if (!n) return new Set();
  const tokens = new Set();
  // English word tokens
  n.split(" ").forEach(w => {
    if (!w) return;
    if (STOP_WORDS.has(w)) return;
    if (w.length < 2) return;
    tokens.add(w);
    // Add singular form for simple english plurals
    if (w.endsWith("ies")) tokens.add(w.slice(0, -3) + "y");
    else if (w.endsWith("es") && w.length > 3) tokens.add(w.slice(0, -2));
    else if (w.endsWith("s") && w.length > 2) tokens.add(w.slice(0, -1));
  });
  // Chinese character n-grams (2-gram)
  const chineseOnly = n.replace(/[a-z0-9\s-]/g, "");
  for (let i = 0; i < chineseOnly.length - 1; i++) {
    tokens.add(chineseOnly.substr(i, 2));
  }
  if (chineseOnly.length > 0 && chineseOnly.length <= 2) tokens.add(chineseOnly);
  return tokens;
}

function keywordScore(queryTokens, itemKeywords) {
  if (!itemKeywords || !itemKeywords.length) return 0;
  let score = 0;
  itemKeywords.forEach(kw => {
    const kwTokens = tokenize(kw);
    kwTokens.forEach(t => {
      if (queryTokens.has(t)) score += 1;
      // partial match: token is substring of a query word (catch stems)
      for (const qt of queryTokens) {
        if (qt.length >= 4 && t.length >= 4 && (qt.includes(t) || t.includes(qt))) {
          score += 0.5;
        }
      }
    });
  });
  return score;
}

function fieldMatchScore(queryTokens, text) {
  if (!text) return 0;
  const textTokens = tokenize(text);
  let hits = 0;
  queryTokens.forEach(t => {
    if (textTokens.has(t)) hits += 1;
    else {
      // partial
      for (const tt of textTokens) {
        if (tt.length >= 4 && t.length >= 4 && (tt.includes(t) || t.includes(tt))) {
          hits += 0.3;
          break;
        }
      }
    }
  });
  return hits;
}

/* =========================================================
   INTENT CLASSIFIER
   ========================================================= */

function detectIntent(message) {
  const q = normalize(message);
  const tokens = tokenize(message);

  // ------ Human handoff (highest priority) ------
  for (const kw of kbContact.humanKeywords) {
    if (q.includes(kw.toLowerCase())) return { intent: "human", confidence: 0.98 };
  }
  if (tokens.has("complain") || tokens.has("complaint") || tokens.has("unhappy") ||
      tokens.has("angry") || tokens.has("refund")) return { intent: "human", confidence: 0.9 };

  // ------ Greeting / Small talk ------
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|嗨|你好|您好)$/.test(q) ||
      q.length < 4 && (tokens.has("hi") || tokens.has("hello") || tokens.has("hey"))) {
    return { intent: "greeting", confidence: 0.9 };
  }
  if (/^(thanks?|thankyou|thank you|bye|goodbye|good bye|appreciate|谢谢|感谢|再见)$/.test(q) ||
      /thank you|thanks a lot|appreciate it/.test(q) ||
      tokens.has("thanks") || tokens.has("thank") || tokens.has("bye") || tokens.has("goodbye")) {
    return { intent: "thanks", confidence: 0.9 };
  }

  // ------ About / Brand / Who are you ------
  const brandScore = keywordScore(tokens, kbBrand.keywords);
  if (brandScore >= 1) return { intent: "about", confidence: Math.min(0.95, 0.6 + brandScore * 0.1) };
  if (/(who are you|what is this site|about (your|the) company|tell me about oriental vibe|what do you do)/.test(q)) {
    return { intent: "about", confidence: 0.95 };
  }

  // ------ Expert / Master Xu Wei ------
  const expertScore = keywordScore(tokens, kbExpert.keywords);
  if (expertScore >= 1) return { intent: "expert", confidence: Math.min(0.98, 0.6 + expertScore * 0.1) };
  if (/(who is.*teacher|teacher.*bio|master.*consultant|xu.*wei|徐伟)/.test(q)) {
    return { intent: "expert", confidence: 0.95 };
  }

  // ------ Five Elements Test ------
  const testScore = keywordScore(tokens, kbTest.keywords);
  if (testScore >= 1) return { intent: "test", confidence: Math.min(0.95, 0.6 + testScore * 0.1) };
  if (/(five.*element|what.*element am i|element.*test|bazi.*test|八字|五行.*测试|測試)/.test(q)) {
    return { intent: "test", confidence: 0.95 };
  }

  // ------ Services / Consultation ------
  if (tokens.has("service") || tokens.has("consultation") || tokens.has("consult") ||
      tokens.has("booking") || tokens.has("book") || tokens.has("appointment") ||
      tokens.has("schedule") || /(consult|session|reading|feng shui.*consult|bazi.*reading)/.test(q)) {
    return { intent: "services", confidence: 0.8 };
  }

  // ------ Courses / Learn ------
  if (tokens.has("course") || tokens.has("learn") || tokens.has("lesson") ||
      tokens.has("class") || tokens.has("enroll") || tokens.has("study") ||
      /(online.*course|self.*paced|take.*class|guiguzi.*course)/.test(q)) {
    return { intent: "courses", confidence: 0.8 };
  }

  // ------ Shop / Products (general) ------
  if (tokens.has("shop") || tokens.has("store") || tokens.has("product") || tokens.has("products") ||
      tokens.has("buy") || tokens.has("purchase") || tokens.has("catalog") || tokens.has("browse")) {
    return { intent: "shop_general", confidence: 0.8 };
  }

  // ------ Policy / FAQ ------
  for (const faq of kbFAQ) {
    const sc = keywordScore(tokens, faq.keywords);
    if (sc >= 2) return { intent: "faq", confidence: Math.min(0.95, 0.7 + sc * 0.05), faqId: faq.id };
  }
  if (/(shipping|return|refund|policy|payment|cancellation)/.test(q)) return { intent: "faq", confidence: 0.75 };

  // ------ Intention-based recommendation (weighted) ------
  let bestIntention = null;
  let bestIntentionScore = 0;
  for (const rec of intentionRecommendations) {
    const sc = keywordScore(tokens, rec.keywords);
    if (sc > bestIntentionScore) {
      bestIntentionScore = sc;
      bestIntention = rec;
    }
  }
  if (bestIntentionScore >= 1) {
    return {
      intent: "recommend",
      confidence: Math.min(0.9, 0.5 + bestIntentionScore * 0.15),
      intention: bestIntention
    };
  }

  // ------ Catch-all: "crystal" + something = product search ------
  if (tokens.has("crystal") || tokens.has("crystals") || tokens.has("stone") ||
      tokens.has("stones") || tokens.has("jewelry") || tokens.has("bracelet") ||
      tokens.has("decor") || tokens.has("bundle") || tokens.has("kit") ||
      tokens.has("amethyst") || tokens.has("citrine") || tokens.has("quartz") ||
      tokens.has("selenite") || tokens.has("obsidian") || tokens.has("chakra")) {
    return { intent: "product_query", confidence: 0.7 };
  }

  // ------ Element specific ------
  for (const el of Object.keys(elementCrystalMap)) {
    if (tokens.has(el.toLowerCase())) {
      return { intent: "element", confidence: 0.8, element: el };
    }
  }
  if (/(wood|fire|earth|metal|water).*(element|crystal)/.test(q)) {
    return { intent: "element", confidence: 0.7 };
  }

  // ------ Navigation ------
  if (/(go to|navigate to|show me|open|visit|where is|page for).*(home|shop|services|courses|blog|membership|faq|contact|about|test|element)/.test(q)) {
    return { intent: "navigate", confidence: 0.85 };
  }

  // ------ FAQ / generic question ------
  if (q.startsWith("what") || q.startsWith("how") || q.startsWith("why") ||
      q.startsWith("when") || q.startsWith("where") || q.startsWith("who") ||
      q.startsWith("can i") || q.startsWith("do you") || q.startsWith("is it") ||
      q.startsWith("are") || q.startsWith("does") || q.includes("?")) {
    return { intent: "generic_faq", confidence: 0.6 };
  }

  return { intent: "unknown", confidence: 0.4 };
}

/* =========================================================
   KNOWLEDGE RETRIEVAL HELPERS
   ========================================================= */

function scoreAndSortItems(queryTokens, items, keywordField = "keywords", extraFields = []) {
  return items.map(item => {
    let score = keywordScore(queryTokens, item[keywordField] || []);
    extraFields.forEach(f => {
      score += fieldMatchScore(queryTokens, item[f]);
    });
    return { item, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function findProductsByQuery(queryTokens) {
  return scoreAndSortItems(queryTokens, kbProducts, "keywords", ["name", "desc", "category", "useCase"]);
}

function findBundlesByQuery(queryTokens) {
  return scoreAndSortItems(queryTokens, kbBundles, "keywords", ["name", "desc", "includes"]);
}

function findServicesByQuery(queryTokens) {
  return scoreAndSortItems(queryTokens, kbServices, "keywords", ["name", "category", "desc"]);
}

function findCoursesByQuery(queryTokens) {
  return scoreAndSortItems(queryTokens, kbCourses, "keywords", ["name", "level", "desc"]);
}

function findFAQByQuery(queryTokens) {
  return scoreAndSortItems(queryTokens, kbFAQ, "keywords", ["q", "a"]);
}

/* =========================================================
   RESPONSE BUILDERS
   ========================================================= */

function html(s) { return s; } // no-op marker

function buildButtons(links) {
  // returns array of button objects for UI
  return links.filter(Boolean).map(l => ({
    label: l.label,
    url: l.url,
    action: l.action || "link"
  }));
}

function formatProductsForChat(products, limit = 3) {
  if (!products || !products.length) return { text: "", products: [] };
  const items = products.slice(0, limit).map(r => r.item ? r.item : r);
  const text = items.map(p =>
    `• **${p.name}** — ${p.price}\n  ${p.desc || p.descEn || ""}\n  _Best for: ${p.useCase || ""}_`
  ).join("\n\n");
  return { text, products: items };
}

function formatServicesForChat(services) {
  if (!services || !services.length) return { text: "", services: [] };
  const items = services.slice(0, 4).map(r => r.item || r);
  const text = items.map(s => {
    const badge = s.vip ? " 👑 VIP" : (s.popular ? " ⭐ Most Popular" : "");
    return `• **${s.name}**${badge} — ${s.price}\n  ${s.desc}\n  _Format: ${s.format || "See services page"}_`;
  }).join("\n\n");
  return { text, services: items };
}

function formatCoursesForChat(courses) {
  if (!courses || !courses.length) return { text: "", courses: [] };
  const items = courses.slice(0, 5).map(r => r.item || r);
  const text = items.map(c =>
    `• **${c.name}** [${c.level}] — ${c.price}\n  ${c.desc}\n  _${c.modules}_`
  ).join("\n\n");
  return { text, courses: items };
}

/* =========================================================
   MAIN AI ENGINE
   ========================================================= */

export class AIAssistant {
  constructor(opts = {}) {
    this.history = []; // [{role: "user"|"assistant", text, ...meta}]
    this.maxHistory = 10;
    this.context = {}; // mutable context for multi-turn
    this.opts = opts;
    this.complianceLevel = opts.complianceLevel || "medium"; // low|medium|full
  }

  remember(role, text, meta = {}) {
    this.history.push({ role, text, time: Date.now(), ...meta });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  /**
   * Main public method. Takes user message → returns structured answer.
   */
  async answer(userMessage) {
    const msg = userMessage.trim();
    if (!msg) return this._toResult("I didn't catch that. Could you rephrase?", [], []);

    this.remember("user", msg);
    const tokens = tokenize(msg);

    // 1) Detect intent
    const intent = detectIntent(msg);

    // 2) Dispatch to handler
    let response;
    switch (intent.intent) {
      case "greeting":        response = this._h_greeting(); break;
      case "thanks":          response = this._h_thanks(); break;
      case "about":           response = this._h_about(); break;
      case "expert":          response = this._h_expert(); break;
      case "test":            response = this._h_test(); break;
      case "services":        response = this._h_services(tokens); break;
      case "courses":         response = this._h_courses(tokens); break;
      case "shop_general":    response = this._h_shop_general(tokens); break;
      case "product_query":   response = this._h_product_search(tokens); break;
      case "recommend":       response = this._h_recommend(intent.intention, tokens); break;
      case "faq":             response = this._h_faq(intent.faqId, tokens); break;
      case "generic_faq":     response = this._h_generic_faq(tokens); break;
      case "element":         response = this._h_element(intent.element); break;
      case "navigate":        response = this._h_navigate(msg); break;
      case "human":           response = this._h_human(msg); break;
      case "unknown":
      default:                response = this._h_fallback(tokens, msg);
    }

    // 3) Apply compliance filter (append disclaimer where relevant)
    response.text = this._applyCompliance(response.text, intent);

    // 4) Remember answer and return
    this.remember("assistant", response.text, { intent: intent.intent });
    return response;
  }

  /* ---------- Handlers ---------- */

  _h_greeting() {
    const buttons = buildButtons([
      { label: "🧪 Free Five Elements Test", url: "/element-test" },
      { label: "🛍️ Shop Crystals", url: "/shop" },
      { label: "📚 Browse Courses", url: "/courses" }
    ]);
    return this._toResult(
      "Hello! I'm the **Oriental Vibe AI Assistant** ✨\n\n" +
      "I'm here to help you with:\n" +
      "• 📦 **Products & recommendations** — tell me your goal (calm, love, wealth, etc.)\n" +
      "• 🔮 **Consultations & services** — prices, formats, booking\n" +
      "• 🧘 **Online courses** — self-paced learning by Master Xu Wei\n" +
      "• 🧪 **Free Five Elements Test** — discover your energy profile\n" +
      "• ❓ **Any question** — shipping, returns, crystal tips\n\n" +
      "What brings you here today?",
      buttons,
      [{ type: "typing", delay: 600 }]
    );
  }

  _h_thanks() {
    return this._toResult(
      "You're very welcome! 💜 Remember — you can always:\n" +
      "• Take the **Free Five Elements Test** to get personalized crystal recommendations\n" +
      "• Browse our **Shop** for 100% authentic crystals\n" +
      "• Book a **Consultation** with Master Xu Wei for deep, personalized guidance\n\n" +
      "Anything else I can help with?",
      buildButtons([
        { label: "❓ I have another question", action: "prompt" },
        { label: "💬 Talk to a human", action: "human" }
      ])
    );
  }

  _h_about() {
    const b = kbBrand.content;
    return this._toResult(
      `**${b.title}**\n\n${b.text}\n\n` +
      `🌍 **Markets served:** ${b.markets}\n` +
      `👥 **Happy clients:** ${b.clients}\n\n` +
      `✨ What makes us different:\n` +
      b.features.map(f => `• ${f}`).join("\n"),
      buildButtons([
        { label: "👨‍🏫 Meet Master Xu Wei", url: "/services" },
        { label: "🧪 Take the Free Test", url: "/element-test" },
        { label: "🛍️ Shop Now", url: "/shop" }
      ])
    );
  }

  _h_expert() {
    const e = kbExpert.content;
    return this._toResult(
      `**${e.title}**\n\n${e.subtitle}\n\n${e.bio}\n\n` +
      `🎓 **Credentials:**\n${e.credentials.map(c => `• ${c}`).join("\n")}\n\n` +
      `💼 **Consultation services:**\n${e.offerings.map(o => `• ${o}`).join("\n")}\n\n` +
      `${e.cta}`,
      buildButtons([
        { label: "📅 Book a Consultation", url: "/services" },
        { label: "📚 His Online Courses", url: "/courses" },
        { label: "ℹ️ About Oriental Vibe", url: "/about" }
      ])
    );
  }

  _h_test() {
    const t = kbTest.content;
    return this._toResult(
      `**${t.title}** ✨\n\n${t.desc}\n\n` +
      `🎯 **What you'll discover:**\n${t.includesFree.map(x => `• ${x}`).join("\n")}\n` +
      `🔓 **Unlock full report ($9.99):**\n${t.includesFull.map(x => `• ${x}`).join("\n")}\n\n` +
      `⏱️ **Takes less than 2 minutes** — and it's FREE for registered users.\n\n${t.cta}`,
      buildButtons([
        { label: "🧪 Take the Test Now", url: "/element-test" },
        { label: "❓ How does BaZi work?", action: "ask", payload: "How does a BaZi reading work?" }
      ])
    );
  }

  _h_services(tokens) {
    const ranked = findServicesByQuery(tokens);
    const { text, services } = formatServicesForChat(
      ranked.length ? ranked : kbServices.map(s => ({ item: s, score: 0 }))
    );
    return this._toResult(
      "Here are our **Consultation Services** with Master Xu Wei:\n\n" +
      text + "\n\n" +
      "💡 **All services are available worldwide via Zoom.** On-site VIP service available within 50 miles.\n\n" +
      "**Not sure which one?** Tell me your goal (career, home, relationship, business) and I'll recommend!",
      buildButtons([
        { label: "📅 Book Consultation", url: "/services" },
        { label: "💬 Help me choose →", action: "prompt" }
      ]),
      [],
      { services }
    );
  }

  _h_courses(tokens) {
    const ranked = findCoursesByQuery(tokens);
    const { text, courses } = formatCoursesForChat(
      ranked.length ? ranked : kbCourses.map(c => ({ item: c, score: 0 }))
    );
    return this._toResult(
      "Explore our **Online Wisdom Courses** (taught by Master Xu Wei's lineage method). " +
      "100% self-paced, lifetime access, community support.\n\n" +
      text + "\n\n" +
      "💸 Save 40% with the **All-Access Pass** — enroll in everything!",
      buildButtons([
        { label: "📚 Browse All Courses", url: "/courses" },
        { label: "🎯 Not sure? Tell me your goal", action: "prompt" }
      ]),
      [],
      { courses }
    );
  }

  _h_shop_general(tokens) {
    const { text, products } = formatProductsForChat(
      findProductsByQuery(tokens).length ? findProductsByQuery(tokens) :
        kbProducts.filter(p => [1, 6, 4, 3, 10].includes(parseInt(p.id.split("_")[1]))).map(p => ({ item: p, score: 1 }))
    );
    const bundleText = kbBundles.map(b => `• **${b.name}** — ${b.price} (was ${b.original}, save ${b.savings}) · ${b.tag}`).join("\n");
    return this._toResult(
      "Welcome to our **Energy-Enhanced Collection** 🛍️ — all 100% natural, ethically sourced, USD pricing, global shipping.\n\n" +
      "**Featured products:**\n" + text + "\n\n" +
      "**💎 Money-saving Bundles:**\n" + bundleText + "\n\n" +
      "💡 Tip: Tell me *your intention* (e.g. 'I need crystals for love' or 'wealth' or 'sleep') and I'll recommend the perfect match!",
      buildButtons([
        { label: "🛒 Open Full Shop", url: "/shop" },
        { label: "❤️ For Love", action: "ask", payload: "Recommend crystals for love and relationships" },
        { label: "💰 For Wealth", action: "ask", payload: "Recommend crystals for wealth and career" }
      ]),
      [],
      { products }
    );
  }

  _h_product_search(tokens) {
    const ranked = findProductsByQuery(tokens);
    const rankedBundles = findBundlesByQuery(tokens);
    if (!ranked.length && !rankedBundles.length) {
      return this._h_recommend_fallback(tokens);
    }
    const { text, products } = formatProductsForChat(ranked);
    const bundleSection = rankedBundles.length
      ? `\n\n**Matching Bundles:**\n` + rankedBundles.slice(0, 2).map(r => {
          const b = r.item;
          return `• **${b.name}** — ${b.price} (save ${b.savings}) · Includes: ${b.includes}`;
        }).join("\n")
      : "";
    return this._toResult(
      `I found these matching items ✨\n\n` + text + bundleSection + "\n\n" +
      "Would you like me to add these recommendations and show you the shop?",
      buildButtons([
        { label: "🛒 View in Shop", url: "/shop" },
        { label: "🧪 Take Five Elements Test → personalized picks", url: "/element-test" },
        { label: "❓ Something different?", action: "prompt" }
      ]),
      [],
      { products }
    );
  }

  _h_recommend(intentionObj, tokens) {
    const intentObj = intentionObj;
    // Compile recommendation sets
    let recText = "";
    let cards = { products: [], services: [], courses: [] };

    // Products
    if (intentObj.products && intentObj.products.length) {
      const items = intentObj.products.map(id => kbProducts.find(p => p.id === id)).filter(Boolean);
      if (items.length) {
        cards.products = items;
        recText += "**🧘 Recommended products:**\n";
        recText += items.map(p => `• **${p.name}** — ${p.price}\n  ${p.desc}`).join("\n") + "\n\n";
      }
    }

    // Bundle
    if (intentObj.bundle) {
      const b = kbBundles.find(x => x.id === intentObj.bundle);
      if (b) {
        recText += `**🎁 Perfect bundle (SAVE ${b.savings}):**\n`;
        recText += `• **${b.name}** — ${b.price} (was ${b.original})\n  _${b.includes}_\n\n`;
      }
    }

    // Service
    if (intentObj.service) {
      const s = kbServices.find(x => x.id === intentObj.service);
      if (s) {
        cards.services = [s];
        recText += `**💼 Take it deeper — Consultation:**\n`;
        recText += `• **${s.name}** — ${s.price}${s.popular ? " ⭐ Most Popular" : (s.vip ? " 👑 VIP" : "")}\n  ${s.desc}\n`;
        recText += `  _Format: ${s.format || "See services page"}_\n\n`;
      }
    }

    // Course
    if (intentObj.course) {
      const c = kbCourses.find(x => x.id === intentObj.course);
      if (c) {
        cards.courses = [c];
        recText += `**📚 Learn more — Course:**\n`;
        recText += `• **${c.name}** [${c.level}] — ${c.price}\n  ${c.desc}\n  _${c.modules}_\n\n`;
      }
    }

    // Test
    if (intentObj.test) {
      recText += `**🧪 Want a truly personalized recommendation?** Take the Free Five Elements Test (~2 min) — it reveals your unique energy profile and recommends crystals accordingly!\n\n`;
    }

    const btns = [
      { label: "🛒 Shop Now", url: "/shop" },
      intentObj.service ? { label: "📅 Book Consultation", url: "/services" } : null,
      intentObj.test ? { label: "🧪 Free Five Elements Test", url: "/element-test" } : null,
      intentObj.course ? { label: "📚 View Course", url: "/courses" } : null
    ];

    const intentionName = Object.keys(Object.fromEntries(
      Object.entries({
        love: "Love & Relationships",
        wealth: "Wealth & Career",
        protection: "Protection & Grounding",
        calm: "Calm, Stress & Sleep",
        balance: "Energy Balance",
        cleansing: "Space Clearing & Purification",
        beginner: "Beginner Starter",
        meditation: "Meditation & Spiritual Practice",
        gift: "Gifting",
        home: "Home & Living Space",
        office: "Business & Office",
        self_discovery: "Self-Discovery",
        sleep: "Restful Sleep"
      }).filter(([k]) => intentObj.keywords.includes(k) || intentObj.keywords.some(kw => kw.includes(k)))
    ))[0] || "";

    return this._toResult(
      (intentionName ? `Great question — for **${intentionName}**, I'd recommend:\n\n` : "") +
        recText +
        "💡 All products are USD priced, globally shipped, and backed by our 30-day guarantee.",
      buildButtons(btns),
      [],
      cards
    );
  }

  _h_faq(faqId, tokens) {
    let faq = faqId ? kbFAQ.find(f => f.id === faqId) : null;
    if (!faq) {
      const ranked = findFAQByQuery(tokens);
      if (ranked.length) faq = ranked[0].item;
    }
    if (faq) {
      return this._toResult(
        `**Q: ${faq.q}**\n\n${faq.a}`,
        buildButtons([
          { label: "📖 More FAQs", url: "/faq" },
          { label: "🙋 Still unclear? Talk to a human", action: "human" }
        ])
      );
    }
    return this._h_generic_faq(tokens);
  }

  _h_generic_faq(tokens) {
    // Search all FAQ + blog + other KB for best hit
    const ranked = findFAQByQuery(tokens);
    if (ranked.length) {
      const top = ranked.slice(0, 2).map(r => r.item);
      const text = top.map(f => `**Q: ${f.q}**\n${f.a}`).join("\n\n---\n\n");
      return this._toResult(
        "Here are the closest matches I found:\n\n" + text,
        buildButtons([
          { label: "📖 Full FAQ Page", url: "/faq" },
          { label: "💬 Talk to a human", action: "human" }
        ])
      );
    }
    // If not FAQ, try product search
    const prodRanked = findProductsByQuery(tokens);
    if (prodRanked.length) return this._h_product_search(tokens);
    return this._h_fallback(tokens);
  }

  _h_element(element) {
    const info = elementCrystalMap[element];
    if (!info) return this._h_fallback(tokenize(element));
    const products = kbProducts.filter(p => info.product_ids.includes(parseInt(p.id.split("_")[1]))).slice(0, 2);
    return this._toResult(
      `**${element} Element** — Traits & Recommendations\n\n` +
      `🔮 **Key crystal:** ${info.crystal}\n` +
      `🎨 **Lucky colors:** ${info.color}\n` +
      `🧭 **Auspicious direction:** ${info.direction}\n` +
      `🌸 **Prosperous season:** ${info.season}\n\n` +
      `**Recommended products:**\n` +
      products.map(p => `• **${p.name}** — ${p.price}\n  ${p.desc}`).join("\n"),
      buildButtons([
        { label: "🧪 Find your element (Free Test)", url: "/element-test" },
        { label: "🛒 ${element} Crystal Collection", url: "/shop" }
      ])
    );
  }

  _h_navigate(msg) {
    const q = normalize(msg);
    let target = null;
    let label = null;
    if (q.includes("home")) { target = quickLinks.home; label = "Home"; }
    else if (q.includes("shop") || q.includes("store") || q.includes("product")) { target = quickLinks.shop; label = "Shop"; }
    else if (q.includes("service") || q.includes("consult")) { target = quickLinks.services; label = "Services"; }
    else if (q.includes("course") || q.includes("learn") || q.includes("class")) { target = quickLinks.courses; label = "Courses"; }
    else if (q.includes("blog")) { target = quickLinks.blog; label = "Blog"; }
    else if (q.includes("member")) { target = quickLinks.membership; label = "Membership"; }
    else if (q.includes("test") || q.includes("element")) { target = quickLinks.test; label = "Five Elements Test"; }
    else if (q.includes("faq")) { target = quickLinks.faq; label = "FAQ"; }
    else if (q.includes("contact")) { target = quickLinks.contact; label = "Contact Us"; }
    else if (q.includes("about")) { target = quickLinks.about; label = "About"; }
    else if (q.includes("shipping") || q.includes("return")) { target = quickLinks.shipping; label = "Shipping & Returns"; }

    if (target) {
      return this._toResult(
        `Sure! Taking you to the **${label}** page →`,
        buildButtons([{ label: `➡️ Go to ${label}`, url: target }])
      );
    }
    return this._h_fallback(tokenize(msg));
  }

  _h_human(msg) {
    const c = kbContact;
    return this._toResult(
      `I understand — let me connect you with a human. Our support team is here to help 💙\n\n` +
      `📧 **Email:** ${c.email}\n` +
      `💬 **WhatsApp:** ${c.whatsapp}\n` +
      `⏱️ **Response time:** ${c.responseTime}\n\n` +
      `If you prefer, you can also use our Contact Form for a detailed inquiry.`,
      buildButtons([
        { label: "📋 Contact Form", url: c.contactLink },
        { label: "🧾 FAQ — Quick answers", url: "/faq" }
      ])
    );
  }

  _h_recommend_fallback(tokens) {
    // no match found - suggest bundles + test
    return this._toResult(
      "I wasn't able to find an exact match for that. Let me share a few suggestions instead:\n\n" +
      "**💡 For beginners:** Space Clearing Starter Kit — everything to purify your space ($42, save 30%)\n" +
      "**💎 Best value:** Energy Balance Bundle — 4 products for holistic balance ($98, save 34%)\n" +
      "**🎯 Truly personalized:** Take the **Free Five Elements Test** to get crystal recommendations based on YOUR energy.\n\n" +
      "Or tell me your *goal* — 'I need crystals for sleep' / 'business success' / 'love' — I'll find the perfect fit!",
      buildButtons([
        { label: "🛒 Browse Shop", url: "/shop" },
        { label: "🧪 Free Five Elements Test", url: "/element-test" },
        { label: "💬 Talk to a human", action: "human" }
      ])
    );
  }

  _h_fallback(tokens, msg) {
    // Last resort: try to find something useful from KB
    // Search products
    const prodHits = findProductsByQuery(tokens).slice(0, 2);
    const faqHits = findFAQByQuery(tokens).slice(0, 1);
    if (prodHits.length || faqHits.length) {
      let extra = "";
      if (faqHits.length) extra += `\n\n**📖 Related:** ${faqHits[0].item.q}\n${faqHits[0].item.a}`;
      if (prodHits.length) {
        const { text } = formatProductsForChat(prodHits);
        extra += `\n\n**🛒 Matching products:**\n${text}`;
      }
      return this._toResult(
        `Let me see what I can find for you...\n` + extra +
          (extra ? "\n\n" : "") +
          `If this isn't what you were looking for, try rephrasing. Or:\n` +
          `• Take the **Free Five Elements Test** for personalized guidance\n` +
          `• Talk to a human if you'd prefer a personal conversation 💙`,
        buildButtons([
          { label: "🧪 Five Elements Test", url: "/element-test" },
          { label: "💬 Human support", action: "human" },
          { label: "❓ Try again", action: "prompt" }
        ])
      );
    }

    return this._toResult(
      `I'm still learning! Could you rephrase your question? 🤔\n\n` +
      `Some things I can help with:\n` +
      `• Product recommendations (tell me your intention: love, wealth, calm, sleep...)\n` +
      `• Consultation & services info & pricing\n` +
      `• Online courses by Master Xu Wei\n` +
      `• Shipping, returns, payments policies\n` +
      `• The Free Five Elements Test — what it is & how it works\n` +
      `• Crystal cleansing and care tips\n\n` +
      `Or connect you directly with a human on our team 💙`,
      buildButtons([
        { label: "💬 Human support", action: "human" },
        { label: "🧪 Take Free Test", url: "/element-test" },
        { label: "🛒 Browse Shop", url: "/shop" }
      ])
    );
  }

  /* ---------- Compliance ---------- */

  _applyCompliance(text, intent) {
    const needsDisclaimer =
      ["about","expert","services","courses","recommend","element","product_query",
        "shop_general","faq","generic_faq","test"].includes(intent.intent);

    if (!needsDisclaimer) return text;

    // Level logic
    if (this.complianceLevel === "low") return text;

    if (this.complianceLevel === "full") {
      return text + "\n\n---\n⚠️ " + kbCompliance.general;
    }

    // medium (default): attach only if product/service/test mentioned, otherwise lightweight
    return text + "\n\n_* For spiritual wellness and personal reflection only. Not a substitute for professional advice._";
  }

  /* ---------- Helpers ---------- */

  _toResult(text, buttons = [], typing = [], cards = {}) {
    return {
      text: text.trim(),
      buttons,
      typing,
      cards: {
        products: cards.products || [],
        services: cards.services || [],
        courses: cards.courses || []
      }
    };
  }
}

/* =========================================================
   Convenience singleton factory
   ========================================================= */

export function createAIAssistant(opts) {
  return new AIAssistant(opts);
}

// Also expose key data to UI layer
export const AI_KNOWLEDGE = {
  kbProducts,
  kbBundles,
  kbServices,
  kbCourses,
  kbTest,
  kbFAQ,
  kbContact,
  quickLinks
};
