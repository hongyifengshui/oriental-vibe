/**
 * AI Knowledge Base - Consolidated for Oriental Vibe AI Assistant
 * Covers: Brand, Products, Services, Courses, FAQ, Policies, Expert Info
 * Used by ai-agent.js for intent matching + response generation
 */

// ======================== BRAND / ABOUT ========================
export const kbBrand = {
  id: "brand",
  keywords: ["about", "who", "company", "oriental vibe", "what is", "mission", "brand", "your name", "you are"],
  content: {
    title: "About Oriental Vibe",
    text: "Oriental Vibe is a modern spiritual wellness brand dedicated to making ancient Eastern energy wisdom accessible and practical for contemporary Western living. Our mission is to help people balance their living spaces, calm their minds, and upgrade their life vibe through authentic lineaged teachings, ethically sourced energy products, and personalized consultation services.",
    founded: "Built on 2,400+ years of Guiguzi lineage wisdom",
    clients: "10,000+ clients across US, EU, and Southeast Asia",
    markets: "Primary markets: United States, Canada, United Kingdom, Germany, France, Singapore, Malaysia, Thailand, Indonesia, Philippines, Australia",
    features: [
      "Certified lineaged consultancy led by Master Xu Wei (80th-gen Guiguzi disciple)",
      "100% authentic, ethically sourced crystals and wellness products",
      "Free Five Elements Test — discover your personal energy profile",
      "Worldwide shipping and remote consultation via Zoom",
      "30-Day satisfaction guarantee on all physical products"
    ]
  }
};

// ======================== EXPERT / XU WEI ========================
export const kbExpert = {
  id: "expert",
  keywords: ["xu wei", "master", "teacher", "consultant", "founder", "expert", "ming li", "dr li", "徐伟", "professor", "lineage", "guiguzi", "北大", "pku"],
  content: {
    title: "Master Xu Wei - Lead Consultant & Lineage Holder",
    subtitle: "80th-Generation Direct Disciple of Guiguzi · 40+ Years · 10,000+ Clients",
    bio: "Xu Wei (徐伟) is the 80th-generation direct disciple of Guiguzi (鬼谷子) — a 2,400-year unbroken esoteric lineage — and the 79th-generation disciple of Sun Bin. He is the founder of Jing Li Xue (Environmental Energy Science, 境理学) and a Distinguished Professor at Peking University. Master Xu Wei has dedicated over 40 years to helping more than 10,000 individuals and enterprises — from listed company CEOs to families in crisis — transform their lives through the ancient art of environmental energy harmonization. His lineage's core teachings, including the Sun Bin Golden Formulas and Zhuyou Thirteen Sections, are recognized as UNESCO Intangible Cultural Heritage.",
    credentials: [
      "80th-Generation Guiguzi Lineage Holder (2,400+ years)",
      "79th-Generation Sun Bin Disciple",
      "Founder of Jing Li Xue (Environmental Energy Science)",
      "Distinguished Professor, Peking University (北京大学特聘教授)",
      "40+ Years of Practical Experience · 10,000+ Clients Worldwide",
      "UNESCO Intangible Cultural Heritage Lineage (Sun Bin Golden Formulas / Zhuyou Thirteen Sections)"
    ],
    offerings: [
      "Personal BaZi (Four Pillars) Life Energy Blueprint Readings",
      "Home & Residential Space Energy Harmony Consultations",
      "Business & Commercial Office Full Energy Audits",
      "On-site VIP Premium Property Consultations (within 50 miles)",
      "Online course instructor for Face Reading, Name Analysis, and Guiguzi Advanced"
    ],
    cta: "To book a consultation with Master Xu Wei, visit the Services page or ask me about our consultation tiers.",
    link: "/services"
  }
};

// ======================== PRODUCTS ========================
export const kbProducts = [
  {
    id: "product_1",
    name: "Natural Amethyst Cluster (500g+)",
    price: "$68",
    keywords: ["amethyst", "cluster", "500g", "purple", "meditation", "stress", "protection", "spiritual"],
    category: "crystals",
    desc: "Premium-grade natural amethyst cluster for meditation, stress relief, and spiritual protection. Place in meditation corner or bedroom for calm energy. Each piece is unique and hand-selected.",
    elements: ["Water"],
    useCase: "Meditation, stress relief, spiritual protection, bedroom placement",
    link: "/shop"
  },
  {
    id: "product_2",
    name: "7 Chakra Crystal Set (7 Pcs)",
    price: "$45",
    keywords: ["chakra", "set", "seven", "7", "kit", "beginner", "complete", "am", "lapis", "aventurine", "citrine", "carnelian", "jasper"],
    category: "crystals",
    desc: "Complete 7-chakra healing set: Amethyst, Lapis Lazuli, Blue Aventurine, Green Aventurine, Citrine, Carnelian, Red Jasper. Includes velvet pouch. Great starter kit for energy balancing.",
    elements: ["Wood", "Fire", "Earth", "Metal", "Water"],
    useCase: "All-around energy balance, meditation, chakra alignment, beginner-friendly",
    link: "/shop"
  },
  {
    id: "product_3",
    name: "White Sage Smudge Kit (3 Sticks)",
    price: "$28",
    keywords: ["sage", "smudge", "white sage", "cleansing", "purification", "clearing", "space clearing", "incense"],
    category: "clearing",
    desc: "California white sage smudge sticks for space cleansing and energy purification. Ethically harvested. 3 sticks per pack. Use when moving into a new home, after arguments, or when energy feels stagnant.",
    elements: ["Fire", "Wood"],
    useCase: "Space clearing, energy purification, new home, post-conflict reset",
    link: "/shop"
  },
  {
    id: "product_4",
    name: "Rose Quartz Sphere (60-80mm)",
    price: "$55",
    keywords: ["rose quartz", "sphere", "ball", "love", "relationship", "heart", "romance", "pink", "emotional"],
    category: "crystals",
    desc: "Polished natural rose quartz sphere on wooden stand. Heart chakra stone for love, emotional healing, and relationship harmony. Place in bedroom southwest corner (relationship area).",
    elements: ["Earth", "Fire"],
    useCase: "Love, emotional healing, relationship harmony, self-love, bedroom",
    link: "/shop"
  },
  {
    id: "product_5",
    name: "Palo Santo Wood Sticks (10 Pcs)",
    price: "$22",
    keywords: ["palo santo", "holy wood", "wood", "sticks", "clearing", "meditation", "sacred", "peru"],
    category: "clearing",
    desc: "Sustainably harvested Palo Santo from Peru. Sacred wood for energy clearing, meditation, and creating a peaceful atmosphere. Gentle alternative to sage for smaller spaces.",
    elements: ["Wood", "Fire"],
    useCase: "Meditation, gentle space clearing, blessing, air purification",
    link: "/shop"
  },
  {
    id: "product_6",
    name: "Citrine Crystal Point (100-150g)",
    price: "$48",
    keywords: ["citrine", "point", "abundance", "wealth", "money", "prosperity", "merchant", "office", "yellow"],
    category: "crystals",
    desc: "Natural citrine crystal point — the merchant stone. Attracts abundance, prosperity, and positive energy. Ideal for office desk or southeast corner (wealth area). Also great for the home workspace.",
    elements: ["Earth", "Metal"],
    useCase: "Abundance, prosperity, wealth corner, office desk, career luck",
    link: "/shop"
  },
  {
    id: "product_7",
    name: "Selenite Charging Plate (15cm)",
    price: "$38",
    keywords: ["selenite", "charging", "plate", "cleanse", "cleansing", "purify", "white stone", "high vibration"],
    category: "crystals",
    desc: "Natural selenite plate for charging and cleansing crystals. Self-cleansing white stone for high-vibration energy work. Place other crystals on it overnight to recharge them.",
    elements: ["Metal", "Water"],
    useCase: "Charging other crystals, cleansing, altar, high-vibration space",
    link: "/shop"
  },
  {
    id: "product_8",
    name: "Brass Feng Shui Singing Bowl (10cm)",
    price: "$42",
    keywords: ["singing bowl", "brass", "sound", "healing", "meditation", "chakra", "sound healing", "tibetan", "nepal"],
    category: "decor",
    desc: "Hand-hammered brass singing bowl with wooden striker. Sound healing tool for meditation, space clearing, and chakra balancing. Produces a deep, resonant tone that clears stagnant energy.",
    elements: ["Metal", "Earth"],
    useCase: "Meditation, sound healing, space clearing, chakra balancing, altar decor",
    link: "/shop"
  },
  {
    id: "product_9",
    name: "Black Obsidian Guardian Statue",
    price: "$72",
    keywords: ["obsidian", "black", "guardian", "statue", "protection", "entrance", "negative energy", "shield", "grounding"],
    category: "decor",
    desc: "Carved natural black obsidian protective guardian. Powerful grounding stone for entrance protection and negative energy shielding. Place near front door facing outward.",
    elements: ["Water", "Metal"],
    useCase: "Entrance protection, negative energy shielding, grounding, protection from EMF",
    link: "/shop"
  },
  {
    id: "product_10",
    name: "Five Elements Crystal Bracelet",
    price: "$35",
    keywords: ["bracelet", "five elements", "wuxing", "wearable", "jewelry", "balance", "hand", "wood fire earth metal water"],
    category: "crystals",
    desc: "Hand-strung bracelet with 5 crystals representing Wood, Fire, Earth, Metal, and Water. Wearable energy balance for daily harmony. Supports all five elements for balance on the go.",
    elements: ["Wood", "Fire", "Earth", "Metal", "Water"],
    useCase: "Daily wear, all-around energy balance, portable protection",
    link: "/shop"
  },
  {
    id: "product_11",
    name: "Bamboo Charcoal Air Purifying Bag (3 Pcs)",
    price: "$25",
    keywords: ["charcoal", "bamboo", "air purify", "bag", "refresh", "bedroom", "closet", "car", "odor"],
    category: "clearing",
    desc: "Natural bamboo charcoal bags for air purification and energy refresh. Reusable for 2 years. Ideal for bedroom, closet, and car. Absorbs odors, moisture, and stale energy.",
    elements: ["Wood", "Earth"],
    useCase: "Air purification, energy refresh, bedroom, closet, car, odor removal",
    link: "/shop"
  },
  {
    id: "product_12",
    name: "Natural Crystal Tree of Life (15cm)",
    price: "$52",
    keywords: ["tree of life", "crystal tree", "amethyst tree", "growth", "abundance", "family", "decor", "wire"],
    category: "decor",
    desc: "Hand-wired crystal gem tree with amethyst chips on natural stone base. Symbol of growth, abundance, and family harmony. Place in East (family) or Southeast (wealth) area.",
    elements: ["Wood", "Earth"],
    useCase: "Family harmony, growth, abundance, home decor, gifting",
    link: "/shop"
  }
];

// Bundles
export const kbBundles = [
  {
    id: "bundle_1",
    name: "Space Clearing Starter Kit",
    price: "$42",
    original: "$72",
    savings: "30%",
    tag: "Starter Kit",
    keywords: ["starter", "beginner", "space clearing", "kit", "bundle", "cleanse", "new home", "first", "start"],
    includes: "White Sage Smudge Kit + Palo Santo Wood Sticks + Selenite Charging Plate",
    desc: "Perfect for beginners. Everything you need to clear and purify your space. Saves $30 (30%) vs buying individually.",
    bestFor: "New home buyers, renters, first-time space clearing",
    link: "/shop"
  },
  {
    id: "bundle_2",
    name: "Meditation Crystal Set",
    price: "$78",
    original: "$116",
    savings: "33%",
    tag: "Meditation Kit",
    keywords: ["meditation", "meditate", "zen", "practice", "yoga", "spiritual"],
    includes: "Natural Amethyst Cluster (500g+) + Brass Feng Shui Singing Bowl (10cm)",
    desc: "Deepen your meditation practice. The combination of amethyst's calming energy and the singing bowl's resonant sound creates the perfect atmosphere.",
    bestFor: "Meditation practitioners, yoga students, spiritual seekers",
    link: "/shop"
  },
  {
    id: "bundle_3",
    name: "Energy Balance Bundle",
    price: "$98",
    original: "$148",
    savings: "34%",
    tag: "Best Value",
    keywords: ["balance", "best", "value", "complete", "all", "gift", "chakra", "recommended"],
    includes: "7 Chakra Crystal Set + Rose Quartz Sphere + Citrine Crystal Point + Five Elements Crystal Bracelet",
    desc: "The ultimate all-in-one kit for complete energy balance. Covers chakras, love, abundance, and daily wear. Best value for money.",
    bestFor: "Energy enthusiasts, gift-givers, anyone seeking holistic balance",
    link: "/shop"
  }
];

// ======================== SERVICES ========================
export const kbServices = [
  {
    id: "service_1",
    name: "Basic BaZi Life Energy Blueprint",
    category: "Personal Energy Reading",
    price: "$199",
    keywords: ["basic", "bazi", "reading", "blueprint", "personal", "birth", "four pillars", "destiny", "cheap", "entry", "first"],
    features: [
      "Comprehensive energy analysis report",
      "Five element balance assessment",
      "Personal energy recommendations",
      "30-minute follow-up Q&A"
    ],
    desc: "Discover your personal energy blueprint based on your birth date. Understand your natural strengths and growth areas for a more aligned life.",
    bestFor: "First-time clients, self-discovery seekers, personal growth",
    format: "Written report + 30-min Q&A",
    link: "/services"
  },
  {
    id: "service_2",
    name: "Personal Life Energy Consult",
    category: "Personal Energy Reading",
    price: "$299",
    popular: true,
    keywords: ["personal", "consult", "deep", "full", "video", "comprehensive", "bazi", "career", "relationship", "most popular"],
    features: [
      "Complete BaZi Life Energy Blueprint reading",
      "Annual energy flow insights",
      "Relationship harmony insights",
      "60-minute video consultation",
      "Customized action plan"
    ],
    desc: "Deep dive into your life path and energy patterns. Get personalized guidance for career, relationships, and personal growth. Our most popular tier.",
    bestFor: "Career crossroads, relationship questions, life transitions",
    format: "60-min Zoom video call + written plan",
    link: "/services"
  },
  {
    id: "service_3",
    name: "Home Space Energy Harmony",
    category: "Home & Space Harmony",
    price: "$599",
    keywords: ["home", "house", "residential", "space", "feng shui", "layout", "furniture", "decor", "room", "virtual"],
    features: [
      "Virtual space assessment (photos + floor plan)",
      "Furniture placement guidance",
      "Color and material suggestions",
      "Energy flow optimization plan",
      "Decor and crystal recommendations"
    ],
    desc: "Optimize your living space for optimal energy flow. Create harmony and balance in your home environment with personalized recommendations.",
    bestFor: "Homeowners, renters, new home purchase, renovation",
    format: "Remote via Zoom — share photos/floor plan",
    link: "/services"
  },
  {
    id: "service_4",
    name: "Business Office Full Audit",
    category: "Business & Office",
    price: "$899",
    keywords: ["business", "office", "commercial", "company", "workplace", "audit", "entrepreneur", "boss", "ceo", "productivity", "team"],
    features: [
      "Complete office energy audit",
      "Desk and team placement optimization",
      "Meeting room energy optimization",
      "Energy cleansing recommendations",
      "Team productivity enhancement strategies"
    ],
    desc: "Enhance productivity and positive energy in your workplace. Optimize your office layout for team success, collaboration, and prosperity.",
    bestFor: "Small to medium businesses, startups, entrepreneurs, team leads",
    format: "Remote consultation + written audit report",
    link: "/services"
  },
  {
    id: "service_5",
    name: "Premium VIP Full Property Consult",
    category: "VIP Exclusive",
    price: "$1,999",
    vip: true,
    keywords: ["vip", "premium", "on-site", "visit", "elite", "full property", "luxury", "high-end", "architectural", "landscape"],
    features: [
      "On-site property inspection (within 50 miles)",
      "Complete energy mapping of entire property",
      "Architectural energy analysis",
      "Landscape design recommendations",
      "Personalized decor scheme",
      "Unlimited follow-up support (3 months)"
    ],
    desc: "Comprehensive on-site assessment for high-value properties. The ultimate personalized experience. Includes 3 months of unlimited follow-up.",
    bestFor: "High-value properties, luxury homes, major renovations, significant life investments",
    format: "On-site visit (50-mile radius) + extended support",
    link: "/services"
  }
];

// ======================== COURSES ========================
export const kbCourses = [
  {
    id: "course_1",
    name: "Space Energy Harmony for Beginners",
    price: "$49",
    level: "Foundation",
    modules: "8 Modules · 24 Lessons · 4h",
    keywords: ["beginner", "start", "space energy", "home", "harmony", "basic", "foundation", "learn"],
    desc: "Master the core principles of energy flow and space harmony. Learn how your environment shapes your well-being and how to create spaces that support your best life.",
    bestFor: "Beginners with no prior knowledge, home organization enthusiasts",
    link: "/courses"
  },
  {
    id: "course_2",
    name: "BaZi: Your Life Energy Blueprint",
    price: "$79",
    level: "Intermediate",
    modules: "12 Modules · 36 Lessons · 8h",
    keywords: ["bazi", "destiny", "four pillars", "birth", "personal", "astrology", "energy blueprint"],
    desc: "Discover your personal energy profile based on your birth date. Uncover your natural strengths, life patterns, and optimal timing for important decisions. Taught by Master Xu Wei's authentic lineage method.",
    bestFor: "Self-discovery seekers, career changers, anyone interested in BaZi",
    link: "/courses"
  },
  {
    id: "course_3",
    name: "Crystal Energy Mastery",
    price: "$69",
    level: "Practical",
    modules: "10 Modules · 30 Lessons · 5h",
    keywords: ["crystal", "mastery", "grids", "cleanse", "place", "select", "elemental", "practical"],
    desc: "Learn to select, cleanse, and place crystals for optimal energy flow. Master the art of crystal grids, elemental pairing, and energetic space design.",
    bestFor: "Crystal enthusiasts, energy workers, shop owners, space designers",
    link: "/courses"
  },
  {
    id: "course_4",
    name: "The Art of Face Reading",
    price: "$99",
    level: "Advanced",
    modules: "12 Modules · 36 Lessons · 10h",
    keywords: ["face reading", "mian xiang", "面相", "features", "character", "guiguzi", "lineage", "advanced"],
    desc: "Explore the ancient practice of face reading (Mian Xiang) passed down through Master Xu Wei's Guiguzi lineage. Learn to understand character, temperament, and life patterns through facial features.",
    bestFor: "HR professionals, counselors, advanced spiritual practitioners",
    link: "/courses"
  },
  {
    id: "course_5",
    name: "The Power of Names",
    price: "$59",
    level: "Wellness",
    modules: "6 Modules · 18 Lessons · 3h",
    keywords: ["name", "naming", "business name", "baby name", "rename", "sound", "energy of name"],
    desc: "Your name carries energy. Learn the art of name analysis — how sounds, characters, and elements within a name influence personal energy, relationships, and life direction. Includes practical guidance for personal and business naming.",
    bestFor: "Expecting parents, rebranding businesses, anyone curious about name energy",
    link: "/courses"
  },
  {
    id: "course_6",
    name: "Workspace Energy for Business Success",
    price: "$149",
    level: "Professional",
    modules: "12 Modules · 36 Lessons · 8h",
    keywords: ["office", "business", "workspace", "entrepreneur", "ceo", "productivity", "professional", "commercial"],
    desc: "Apply environmental energy principles to business environments. Learn to optimize office layouts, assess profitability through spatial indicators, and create workspaces that attract collaboration and prosperity.",
    bestFor: "Business owners, managers, entrepreneurs, startup founders",
    link: "/courses"
  },
  {
    id: "course_7",
    name: "Bedroom Harmony & Restful Sleep",
    price: "$39",
    level: "Wellness",
    modules: "6 Modules · 18 Lessons · 3h",
    keywords: ["bedroom", "sleep", "rest", "bed", "relax", "insomnia", "wellness", "recovery"],
    desc: "Create the optimal sleep sanctuary using energy principles. Learn color therapy, furniture placement, and elemental balancing specifically for the bedroom — your most important space for rejuvenation.",
    bestFor: "Anyone with sleep issues, new parents, relationship harmony seekers",
    link: "/courses"
  },
  {
    id: "course_8",
    name: "Guiguzi Secret Teachings: Advanced",
    price: "$399",
    level: "Mastery",
    modules: "20 Modules · 60 Lessons · 20h",
    keywords: ["guiguzi", "advanced", "mastery", "elite", "secret", "lineage", "destiny analysis", "energy field", "by application"],
    desc: "The most exclusive offering — direct transmission of Master Xu Wei's Guiguzi lineage wisdom. Covers advanced environmental diagnostics, destiny analysis, and energy field mastery. By application only.",
    bestFor: "Serious practitioners, energy consultants, existing students, certified professionals",
    note: "BY APPLICATION ONLY. Contact us to apply.",
    link: "/courses"
  }
];

// ======================== FIVE ELEMENTS TEST ========================
export const kbTest = {
  id: "test",
  keywords: ["five elements", "test", "wuxing", "bazi test", "birth date", "report", "free test", "element", "wood fire earth metal water", "day master"],
  content: {
    title: "Free BaZi Five Elements Test",
    desc: "Discover your personal energy profile through our free Five Elements Test. Based on BaZi (Four Pillars of Destiny), a 2,000+ year-old Chinese astrological system.",
    what: "Enter your birth date and time to get your Day Master, element distribution, wealth, career, relationship, health insights, and 10-year luck cycles.",
    cost: "FREE for registered users (sign up in seconds). Full detailed report unlock for $9.99.",
    process: [
      "Enter your name and gender",
      "Enter your birth date (and optional birth time for 100% accuracy)",
      "Enter email to receive your report",
      "Get instant elemental profile + unlock full report for complete analysis"
    ],
    includesFree: "Day Master, Element Distribution, Chart Strength, Dominant Element, Lucky Colors/Directions/Numbers",
    includesFull: "Wealth Analysis, Career Direction, Relationship Pattern, Health Suggestions, 10-Year Luck Cycles, Crystal Product Recommendations",
    cta: "Take the test now — it takes less than 2 minutes.",
    link: "/element-test"
  }
};

// ======================== FAQ / POLICIES ========================
export const kbFAQ = [
  {
    id: "faq_shipping",
    keywords: ["shipping", "delivery", "international", "ship", "worldwide", "time", "cost", "free shipping", "send"],
    q: "Do you ship internationally?",
    a: "Yes, we ship worldwide. We deliver to the United States, Canada, United Kingdom, European Union, Australia, New Zealand, Singapore, Malaysia, Thailand, and most other countries. Standard shipping is 5-14 business days depending on location. Free standard shipping on orders over $150 (continental US only). Shipping costs calculated at checkout based on your location."
  },
  {
    id: "faq_return",
    keywords: ["return", "refund", "exchange", "policy", "guarantee", "30 day", "money back"],
    q: "What is your return policy?",
    a: "We offer a 30-Day Satisfaction Guarantee on most physical products. Items must be unused, in original packaging, and in the same condition as received. Opened space clearing kits (sage, palo santo, charcoal) and personalized consultation reports/course enrollments are non-returnable. Please visit our Shipping & Return Policy page for full details. Courses: All-Access Pass is refundable within 7 days if less than 20% of content completed."
  },
  {
    id: "faq_crystals_authentic",
    keywords: ["crystal real", "genuine", "authentic", "synthetic", "fake", "natural", "ethically sourced", "ethical", "mine"],
    q: "Are crystals genuine and ethically sourced?",
    a: "Yes, 100%. Every crystal is natural, untreated, and ethically sourced from trusted mines in Brazil, Uruguay, Madagascar, and China. We work directly with small-scale miners and artisan workshops ensuring fair labor and environmental responsibility. No synthetic, dyed, or heat-treated stones unless explicitly labeled. Backed by our 30-day guarantee — if not satisfied, return for full refund."
  },
  {
    id: "faq_choose_crystal",
    keywords: ["choose crystal", "which crystal", "right crystal", "pick crystal", "recommend", "for me"],
    q: "How do I choose the right crystal for me?",
    a: "Start with your intention — what do you want to bring into your life? Take our FREE Five Elements Test to discover your elemental profile. This instantly reveals which crystals balance your energy. Quick guide: Love → Rose Quartz. Wealth → Citrine. Protection → Black Obsidian. Calm → Amethyst. Balance → 7 Chakra Set or 5 Elements Bracelet. Or tell me your goal and I'll recommend products!"
  },
  {
    id: "faq_what_is_space_energy",
    keywords: ["what is space energy", "feng shui", "qi", "chi", "energy flow", "how does it work"],
    q: "What is space energy / Feng Shui?",
    a: "Space energy, or Feng Shui, is a 3,000+ year-old Chinese practice that harmonizes individuals with their surrounding environment by examining the flow of Qi (vital energy). It considers factors like layout, orientation, colors, elements, and furniture placement to create balanced, harmonious spaces that support well-being, relationships, and success. Our Western-adapted approach focuses on practical, actionable guidance — no superstition, just results."
  },
  {
    id: "faq_bazi_how",
    keywords: ["how does bazi work", "bazi reading", "four pillars", "destiny reading", "birth date reading"],
    q: "How does a BaZi reading work?",
    a: "BaZi (Four Pillars of Destiny) analyzes your birth date and time to construct four pillars (year, month, day, hour), each with a Heavenly Stem and Earthly Branch. This reveals your elemental composition (Wood/Fire/Earth/Metal/Water), Day Master (your core self), chart strength, wealth/career/relationship patterns, and 10-year luck cycles. Our certified consultants (led by Master Xu Wei) provide detailed written reports + personalized guidance."
  },
  {
    id: "faq_remote_consult",
    keywords: ["remote", "virtual", "zoom", "international", "outside us", "online", "video", "skype"],
    q: "Can consultations be done remotely?",
    a: "Absolutely! All services are available worldwide via Zoom. Whether you're in London, Berlin, Singapore, Sydney, or NYC — Master Xu Wei provides the same comprehensive energy readings. For home consultations: simply share photos or a video walkthrough of your space. Over 60% of our clients are international. Distance is never a barrier to transformation."
  },
  {
    id: "faq_western_adapted",
    keywords: ["western", "modern", "apply to western", "traditional", "different", "adapted"],
    q: "Do Eastern energy principles apply to Western homes?",
    a: "Yes — they are based on universal natural laws of balance, flow, and harmony. We specifically adapt them for Western architecture, open-plan layouts, and modern lifestyles. Instead of rigid traditional rules, we focus on practical, actionable guidance: optimal furniture placement, color/material selection, crystal positioning, and energy flow optimization that works with your existing decor."
  },
  {
    id: "faq_course_pace",
    keywords: ["course self-paced", "lifetime", "learn anytime", "online course", "access"],
    q: "Are courses self-paced?",
    a: "Yes, all online courses are 100% self-paced. Once you enroll, you have LIFETIME access to all course materials — video lessons, worksheets, guides, and any future updates. Learn at your own convenience. Pause and resume anytime. Revisit modules as often as you need. Community support included."
  },
  {
    id: "faq_membership",
    keywords: ["member", "membership", "join", "tier", "benefit", "discount", "subscription", "premium"],
    q: "How do I become a member?",
    a: "Visit the Membership page to select your tier. We offer 3 tiers: Starter (basic benefits), Harmony (most popular — better discounts + priority booking), and Premium (VIP perks). Benefits include member-exclusive discounts on products and services, early access to new products, priority booking for consultations with Master Xu Wei, free Five Elements Test reports, and member-only content."
  },
  {
    id: "faq_cleanse_crystals",
    keywords: ["cleanse", "clean crystal", "purify", "charge", "how often", "selenite", "sage", "moonlight"],
    q: "How often to cleanse/charge crystals?",
    a: "Every 2-4 weeks, or whenever the energy feels heavy. Quick methods: 1) Selenite plate — place crystals on it overnight (never needs cleansing itself), 2) Smudge with White Sage or Palo Santo, 3) Leave in moonlight overnight, 4) Bury in sea salt for 24h (note: avoid water for selenite, it dissolves). Our Space Clearing Starter Kit has everything you need."
  },
  {
    id: "faq_payment",
    keywords: ["payment", "currency", "dollar", "usd", "pay", "credit", "card", "paypal", "method"],
    q: "What currencies and payments do you accept?",
    a: "All prices and transactions are in USD ($). We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover), PayPal, Apple Pay, and Google Pay. Checkout is secured with 256-bit SSL encryption. For consultations and courses, we also support payment plans on request."
  }
];

// ======================== COMPLIANCE DISCLAIMERS ========================
export const kbCompliance = {
  general: "* Individual experiences vary. Our services and products are for spiritual wellness, personal reflection, cultural enrichment, and aesthetic enjoyment only. Energetic properties are based on traditional cultural beliefs and are not scientifically proven. Not a substitute for professional medical, psychological, legal, or financial advice. No specific outcomes are guaranteed.",
  health: "If you have medical or psychological concerns, please consult a licensed healthcare professional. Crystal and energy healing are complementary practices, not alternatives to medical treatment.",
  finance: "For financial or investment decisions, consult a licensed financial advisor. Traditional energy-based guidance is for cultural exploration purposes only.",
  legal: "For legal matters, consult a licensed attorney.",
  predictions: "BaZi and other forms of destiny analysis are tools for self-reflection and pattern recognition. They do not predict the future with certainty. Free will and personal effort always play the greatest role."
};

// ======================== CRYSTAL → ELEMENT REFERENCE ========================
export const elementCrystalMap = {
  Wood: { crystal: "Green Aventurine", color: "Green, Cyan", direction: "East", season: "Spring", product_ids: [2, 10] },
  Fire: { crystal: "Carnelian", color: "Red, Purple", direction: "South", season: "Summer", product_ids: [2, 10] },
  Earth: { crystal: "Tiger's Eye", color: "Yellow, Brown", direction: "Center/Southwest", season: "Late Summer", product_ids: [4, 6, 10, 11] },
  Metal: { crystal: "Clear Quartz", color: "White, Gold", direction: "West", season: "Autumn", product_ids: [7, 8, 10] },
  Water: { crystal: "Lapis Lazuli", color: "Black, Blue", direction: "North", season: "Winter", product_ids: [1, 2, 10] }
};

// ======================== INTENTION → PRODUCT RECOMMENDATION ========================
export const intentionRecommendations = [
  { intention: "love", keywords: ["love", "attract love", "relationship", "romance", "heartbreak", "dating", "marriage"], products: ["product_4", "product_10"], bundle: "bundle_3", service: "service_2" },
  { intention: "wealth", keywords: ["money", "wealth", "abundance", "prosperity", "rich", "career", "business", "success", "promotion"], products: ["product_6", "product_12"], bundle: "bundle_3", service: "service_4", course: "course_6" },
  { intention: "protection", keywords: ["protect", "protection", "negative energy", "evil eye", "shield", "entrance", "safety"], products: ["product_9", "product_10"], bundle: "bundle_1", service: "service_3" },
  { intention: "calm", keywords: ["calm", "stress", "anxiety", "peace", "sleep", "relax", "meditation", "quiet"], products: ["product_1", "product_3"], bundle: "bundle_2", course: "course_7" },
  { intention: "balance", keywords: ["balance", "chakra", "harmony", "aligned", "all", "rebalance", "center"], products: ["product_2", "product_10"], bundle: "bundle_3", service: "service_1" },
  { intention: "cleansing", keywords: ["cleanse", "clear", "purify", "new home", "move", "after argument", "smudge"], products: ["product_3", "product_5", "product_7"], bundle: "bundle_1" },
  { intention: "beginner", keywords: ["beginner", "new", "start", "first time", "starter", "getting started"], products: [], bundle: "bundle_1", course: "course_1", test: true },
  { intention: "meditation", keywords: ["meditate", "meditation", "zen", "yoga", "practice", "spiritual practice"], products: ["product_1", "product_8"], bundle: "bundle_2", course: "course_3" },
  { intention: "gift", keywords: ["gift", "present", "birthday", "christmas", "wedding", "housewarming", "surprise", "anniversary"], products: ["product_12"], bundle: "bundle_3" },
  { intention: "home", keywords: ["home", "house", "apartment", "rental", "living room", "bedroom", "layout", "furniture"], products: ["product_9", "product_12"], bundle: "bundle_1", service: "service_3", course: "course_1" },
  { intention: "office", keywords: ["office", "work", "desk", "business", "company", "workspace", "team", "productivity"], products: ["product_6", "product_11"], bundle: "bundle_3", service: "service_4", course: "course_6" },
  { intention: "self_discovery", keywords: ["self", "discover", "who am i", "purpose", "path", "meaning", "destiny", "direction"], products: [], bundle: "", service: "service_1", course: "course_2", test: true },
  { intention: "sleep", keywords: ["sleep", "insomnia", "rest", "night", "bedroom", "recover", "tired"], products: ["product_1", "product_11"], bundle: "bundle_2", course: "course_7" }
];

// ======================== HUMAN ESCALATION CONTACT ========================
export const kbContact = {
  email: "support@orientalvibe1314.com",
  whatsapp: "+1-555-ORIENTAL",
  responseTime: "Within 24 hours (usually faster during US business hours 9am-6pm EST)",
  contactLink: "/contact",
  humanKeywords: ["talk to human", "human", "person", "agent", "real person", "speak to someone", "live chat", "客服", "人工", "投诉", "complaint", "problem", "not helpful", "bad answer", "wrong", "unacceptable"]
};

// ======================== QUICK LINKS (for navigation suggestions) ========================
export const quickLinks = {
  home: "/",
  shop: "/shop",
  services: "/services",
  courses: "/courses",
  blog: "/blog",
  membership: "/membership",
  test: "/element-test",
  faq: "/faq",
  contact: "/contact",
  about: "/about",
  shipping: "/shipping",
  privacy: "/privacy",
  terms: "/terms"
};
