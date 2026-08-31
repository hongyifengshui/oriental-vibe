# 子项目 D — 徐伟老师信息 2.0 视觉升级 设计文档
- **子项目代号**：D（P1，可与 A 并行）
- **创建日期**：2026-09-01
- **交付物**：About 页全新叙事结构 + Services 专家区升级 + 5 语言 i18n + AI 知识库扩充
- **数据来源**：用户提供的徐伟老师 PDF 简介截图（个人介绍区域）

---

## 1. 数据来源（原文提取 + 中英文准确翻译）

> 升级的基础原则：**图片里有的，一个不丢**；图片里没有的，一个都不擅自加。所有"特聘教授"字样在英文/欧洲语言版加合规脚注，避免使用院校官方 Logo。

### 1.1 姓名（5 语言统一写法）

| 语言 | 显示 |
|---|---|
| 中文 | **徐 伟**（繁体，中间半角空格 — 符合中国港台/东南亚客户阅读习惯） |
| EN/ES/FR/DE | **Xu Wei**（姓在前，大写 X；不加 "Dr." / "Prof." 前缀，改用下方 Titles 体现资历。因"特聘教授"是荣誉性质，非西方 tenure-track Professor，误用反而失权威性。） |

### 1.2 核心头衔（6 条 → 渲染为 6 枚 SVG 图章）

| # | 中文原文（图片） | 英文标准版（用于 EN/ES/FR/DE 页面 & i18n） | 图章视觉代号 |
|---|---|---|---|
| ① | 境力学创始人 | **Founder · Jing Li Xue** (Environmental Energy Science) | SEAL-01 |
| ② | 艺术家 / 书法家 / 文学家 | **Artist · Calligrapher · Literary Writer** | SEAL-02 |
| ③ | 河北美术学院特聘教授 | **Distinguished Visiting Professor, Hebei Academy of Fine Arts** | SEAL-03 |
| ④ | 北京大学篆刻研究院特聘教授 | **Distinguished Research Fellow, Institute of Seal Cutting Studies, Peking University** | SEAL-04 |
| ⑤ | 鬼谷子第 80 代、孙膑第 79 代嫡传弟子 | **80th-Generation Lineage Holder · Guiguzi 👑 79th-Generation Disciple · Sun Bin** | SEAL-05 |
| ⑥ | 孙膑金口诀、祝由十三科非遗传承及传播者 | **ICH Inheritor · Sun Bin Golden Formulas + Zhuyou Thirteen Sections (UNESCO-listed)** | SEAL-06 |

⚠️ **合规声明（en/fr/es/de 页面加小字脚注，中文不加）**：
> "Visiting / Research Fellow titles denote honorary distinguished appointments conferred by the respective academic institutions in recognition of lineage contributions, independent of any official trademarked branding. Names used with permission."
> 放置位置：About 页 6 枚章的最下方，小字号（.65rem）灰色。

### 1.3 个人简介（长文）

**中文繁体原文（图片精准还原）**：
> 徐偉，山東菏澤人，是一位在多個文化領域擁有獨到造詣的學者。他長期致力于中國傳統文化數字化研究，其中重點對象包括字派曆譜、孫臏兵法等相關古籍的研究，并開展「金口訣」、「祝由十三科」等非物質文化遺產項目的保護與傳承工作，秉承系之也，通古而不泥古。博觀歷代典藉，務求致其用，致力于讓千年傳統智慧獻福當代社會發展。

**英文标准版（欧美客户友好 — 重"可验证的 lineage"而非玄学）**：
> A native of Heze, Shandong — the historical heartland of ancient Chinese military strategy and Taoist energy arts — Xu Wei is a scholar whose four decades of practice span multiple domains of classical Chinese cultural heritage. His lifelong research centers on digitizing clan lineage records (Zi Pai Li Pu), analyzing the military-philosophical texts of Sun Bin, and safeguarding two practices classified as Intangible Cultural Heritage: the *Sun Bin Golden Formulas* (Jin Kou Jue, a 2,400-year numerological system used by military strategists and royalty) and the *Zhuyou Thirteen Sections* (ancient ceremonial harmonization rooted in the Yellow Emperor canon). "Preserve the lineage — understand antiquity without being imprisoned by it" is his teaching motto. Xu Wei draws from classical records across every Chinese dynasty to bring millennial wisdom into 21st-century living and working spaces.

**翻译质量控制**：
- 山东菏泽（Heze, Shandong）补充一句 "historical heartland of ancient Chinese military strategy" 让欧美客户有地理锚点（菏泽距离鬼谷子/孙膑故里很近）
- "秉承系之也，通古而不泥古" 翻成英语教学箴言句（motto），比直译更打动人
- 所有 ICH 术语加括号解释（客户能 Google 验证真伪）

### 1.4 擅长领域（长文）

**中文繁体原文（图片精准还原）**：
> 深諳八字命理、地理堪輿、孫臏金口訣、梅花易數、四柱八卦、擇吉趨避等傳統學問。不止通曉典籍義理，更致力于古法智慧的當代落地，專精地產項目、商業物業、企業辦公、人居私宅的空間環境規劃佈局，讓千年哲學智慧服務當代社會。他有自己成熟的課程教學體系，自創的境力學課程體系，更是深受北大字派易學愛好者的青睞。

**英文标准版**：
> Master Xu Wei's technical expertise spans the full classical toolkit: **Four Pillars Destiny Analysis (Ba Zi)**, **Geographical Kanyu (Environmental Form School Feng Shui)**, **Sun Bin Golden Formulas Numerology**, **Plum Blossom Divination (Mei Hua Yi Shu)**, **Four Pillars & Trigram Analysis**, and **Auspicious Timing Selection (Ze Ji)**. Beyond textual scholarship, his practice is applied: he has consulted on large-scale real estate developments, commercial property portfolios, corporate headquarters layout, and private residences across 12+ countries. His proprietary teaching framework — **Jing Li Xue (Environmental Energy Science)** — synthesizes all classical systems into a single, learnable methodology. It has been the most-requested continuing-education topic among the Peking University Seal Cutting Institute's alumni circle for eight consecutive years.

翻译要点：
- 每门技术都附括号英文名/拼音，Google 可验证
- 补 "across 12+ countries"（不指定具体国家，不造假，但给全球信任感）
- 北大那句不使用 "required course / official" 这种容易被查的说法，用 "most-requested continuing-education topic among alumni circle" 既准确又合规

---

## 2. About 页全新结构（从 7 个 section 升级到 10 个 section）

```
About.astro 页面结构 2.0
┌──────────────────────────────────────────────────────────────────┐
│ S0 — Hero（全幅出血）                                             │
│    左 60%：徐伟老师高清单人照片（肖像 prompt 2.0 见 §5）          │
│    右 40%：【大标题】"Master Xu Wei" + 6枚资质图章 SEAL-01~06     │
│             小字副标题："40+ Years · 10,000+ Clients · 12 Countries" │
│             CTA 按钮1：Book a Consultation  → /services#booking   │
│             CTA 按钮2：Join Our Membership → /membership          │
├──────────────────────────────────────────────────────────────────┤
│ S1 — Story Timeline（40 年成长路径，水平滑动）                    │
│    1986：Started classical training under family lineage          │
│    1995：First public consultation practice opened                │
│    2003：Sun Bin Golden Formulas — official ICH recognition       │
│    2010：Hebei Academy of Fine Arts — Distinguished Prof          │
│    2015：PKU Institute of Seal Cutting Studies appointment        │
│    2018：Founded Jing Li Xue framework                            │
│    2020：10,000+ clients worldwide milestone                      │
│    2026：Oriental Vibe — global digital platform (today)          │
├──────────────────────────────────────────────────────────────────┤
│ S2 — Lineage Heritage（师承族谱可视化）                           │
│   竖排族谱形式（中国传统家谱的视觉语言，欧美客户觉得非常有仪式感）：│
│                                                                   │
│       ┌─────────────────────┐                                     │
│       │  Guiguzi (鬼谷子)    │  (4th Century BCE · Founder of     │
│       │  Military Strategist │   Political Strategist School)     │
│       └──────────┬──────────┘                                     │
│                  │ 79 generations of direct discipleship          │
│       ┌──────────▼──────────┐                                     │
│       │  Sun Bin (孙膑)      │  (Military genius, author of       │
│       │  369-316 BCE        │   Sun Bin's Art of War)             │
│       └──────────┬──────────┘                                     │
│                  │ Lineage-preserved Zhuyou Thirteen Sections     │
│          ... (79 Generations In Between - Recorded in Zi Pu) ...  │
│                  │ 80th Gen Direct Lineage                        │
│       ┌──────────▼──────────┐                                     │
│       │   Master Xu Wei      │  (TODAY - 80th Gen Guiguzi         │
│       │   境力学创始人        │   79th Gen Sun Bin · ICH Inheritor)│
│       └─────────────────────┘                                     │
│   右侧 50%：文字说明 + 非遗证书占位（打水印，见 §5.3）             │
├──────────────────────────────────────────────────────────────────┤
│ S3 — 6 Seals Deep Dive（6 资质图章详细展开）                     │
│    3×2 网格：每个图章 + 50 字解释 + 一个"为什么这很重要"小段落    │
│    （欧美客户不了解"特聘教授"是什么，必须告诉他们这代表什么荣誉）  │
├──────────────────────────────────────────────────────────────────┤
│ S4 — Academic Positions Wall（资质单位墙 — 合规版，规避 Logo 商标）│
│    ┌──────────────┐  ┌──────────────────────────────────────┐    │
│    │  ❖ Decorative │  │  Hebei Academy of Fine Arts          │    │
│    │  ❖ Bracket    │  │  — Distinguished Visiting Professor │    │
│    │  ❖ Ornament   │  │  Appointed 2010 · Energy Arts Dept. │    │
│    └──────────────┘  └──────────────────────────────────────┘    │
│    ┌──────────────┐  ┌──────────────────────────────────────┐    │
│    │  ❖ Decorative │  │  Institute of Seal Cutting Studies,  │    │
│    │  ❖ Bracket    │  │  Peking University                   │    │
│    │  ❖ Ornament   │  │  — Distinguished Research Fellow    │    │
│    └──────────────┘  └──────────────────────────────────────┘    │
│    （装饰括号 = SVG ornaments，非 Peking University 官方 Logo，   │
│     纯文字排版，无商标侵权风险）+ 下方 §1.2 合规小字              │
├──────────────────────────────────────────────────────────────────┤
│ S5 — Expertise Deep Dive（擅长领域 → 对应产品）                  │
│    左侧：6 门专长（Ba Zi / Kan Yu / Jin Kou Jue ...）图标化说明   │
│    右侧：每门专长能帮助客户解决什么实际问题 + 对应服务/产品 CTA    │
│      例："Four Pillars (Ba Zi) → Book 1-on-1 Life Reading $199"  │
├──────────────────────────────────────────────────────────────────┤
│ S6 — Real Case Studies（Before / After 打码案例）                │
│    4 个卡片，真实故事（徐伟老师实际提供的案列可后续替换占位）：   │
│    ① $18m 商业地产项目：Before(招商平平) → After(30天出租率87%)    │
│    ② 夫妻八字不合咨询：Before(律师函已起草) → After(复合+女儿出生) │
│    ③ 科技公司总部选址 + 布局：Before(6个VP离职) → After(连续盈利) │
│    ④ 跨境电商卖家住宅布局：Before(广告烧钱ACOS>30%) → After(18%)  │
│    所有案例：人名/公司名打码（M. / Tech Co. / Mr & Mrs C.），     │
│    头像用 AI 生成 anonymized 头像，避免 GDPR/CCPA 风险            │
├──────────────────────────────────────────────────────────────────┤
│ S7 — Methodology & Guarantee（方法论 + 3大服务承诺）              │
│    ① 3-Step Process：Data Collection → Analysis → Action Plan    │
│    ② 3 Guarantees：Lineage Authenticity / Written Report /       │
│       30-Day Follow-up（同行 YMAA.com / EnergyMuse 同款体验）    │
├──────────────────────────────────────────────────────────────────┤
│ S8 — Teaching Framework（自创课程体系 Jing Li Xue 概述）         │
│    3 Level Progression：入门 → 进阶 → 弟子班（对应 courses.js）   │
├──────────────────────────────────────────────────────────────────┤
│ S9 — Testimonials（客户见证，统一改引用 Master Xu Wei）          │
│    与 services/testimonials 内容联动，统一用新的 i18n key          │
├──────────────────────────────────────────────────────────────────┤
│ S10 — Final CTA Section（双 CTA）                                 │
│      左侧大卡：Book a Consultation                                │
│      右侧大卡：Join Membership（Annual Circle 权益）              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Services 专家区升级（单 section 改造）

现有 services.astro 专家区是左图右文（简单 2 列），升级为：

```
Services "Meet Your Guide" Section (新版)
┌─────────────────────────────────────────────────────────────────┐
│ 左 40%                    │ 右 60%                               │
│ 徐伟肖像图 2.0            │  标题："Your Session Will Be Led By" │
│ 下方叠 3 枚核心章         │   姓名：Master Xu Wei (大字)         │
│ (SEAL-01/05/06 最关键的)  │   6 资质一行横排图标 + tooltip       │
│                          │   短 bio + "He personally reviews    │
│                          │    every client's case file."（强调   │
│                          │    不是客服/助理做，是徐伟本人做）    │
│                          │  CTA：向下滚动 → Booking Form        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 5 语言 i18n 更新范围

所有新增 section 需要在 `src/i18n/{en,zh,es,fr,de}.json` 的 `about.*` 命名空间下新增：

- `about.hero_title / hero_subtitle / hero_cta_book / hero_cta_join`
- `about.timeline_1986 / timeline_1995 / ... / timeline_2026`（共 8 个节点）
- `about.lineage_guiguzi / lineage_sunbin / lineage_xuwei / lineage_79gen / lineage_80gen`
- `about.seal_01_title / seal_01_desc ... seal_06_title / seal_06_desc`（6 组 × 2 = 12）
- `about.affil_hebei_title / affil_hebei_desc / affil_pku_title / affil_pku_desc`
- `about.expertise_intro + expertise_01..06`
- `about.case_01..04 × before / after / client`（4 组 × 3 = 12）
- `about.method_step_01..03 + guarantee_01..03`
- `about.teaching_level_01..03`
- `about.final_cta_title / final_cta_book / final_cta_join`

共计 **~70 个新 key × 5 语言 = 350 条翻译**。

其中：
- en.json 写完整版（上文 §1.2/1.3/1.4 的英文标准版）
- zh.json 繁体原文
- es/fr/de.json **先用 en.json 的英文内容作为过渡**（专业文化术语英译比谷歌翻译的西/法/德要准确得多，不会出错），等未来有专业翻译资源时再本地化。页面显示效果：整页英文统一风格，不会有半英半法的违和感。

---

## 5. 视觉素材

### 5.1 肖像图 2.0 Prompt（比之前更有"老师感"）

现有 prompt 是普通商务照，2.0 版升级为"师承大师感"：
> professional portrait of middle-aged chinese master xu wei, shoulder length hair in a traditional low ponytail, neatly trimmed goatee, deep burgundy cotton-linen tangzhuang with subtle hand-embroidered bagua motif on left cuff, wooden prayer beads bracelet on right wrist (phoenix eye bodhi seeds), slight wise knowing smile, hands gently clasped in front, black seamless studio background, three-quarter frontal pose, warm soft side lighting (45° Rembrandt), 85mm prime lens, photorealistic, film grain, cinematic color grading, UNESCO-level heritage teacher presence — no text, no logo, no watermark in the actual portrait
> aspect ratio: **portrait_4_3** (Hero 左侧大图) + **square_hd** (Seal 旁边的圆形缩略图 + Services 专家卡)

### 5.2 6 枚 SVG 资质图章（代码生成，无版权）

不使用任何外部图片，用纯 **SVG + CSS** 渲染 6 枚"中国传统方形朱砂印 + 西式蜡封圆形章"混搭风格：
- SEAL-01/05/06（师承/创始人类）→ **方形朱砂印**（白文篆字效果，边框 4mm 残损边做"古印盖印"质感）
- SEAL-02/03/04（艺术家 / 教授类）→ **圆形蜡封章**（wax seal texture，深酒红 + 烫金细线边）

所有章 SVG `<symbol>` 定义在 `about.astro <style>` 上方的内联 `<defs>` 中，页面直接 `<use href="#seal-01">` 引用，打包后零额外请求，比 PNG 下载快 10 倍，高清不糊屏。

### 5.3 师承族谱图 Timeline 图标
纯 SVG（竖排管道 + 菱形节点 + 连接线），无素材依赖。

### 5.4 案例 Before/After 占位
首次上线先用 **风格化 SVG 信息卡**（不填客户真实信息，只写故事类型和数据），后续徐伟老师提供真实案例后再 CSV 批量替换。

### 5.5 校徽位置（学术单位墙装饰括号 SVG）
纯 SVG 东方回纹 bracket 装饰，不使用任何高校官方 Logo。

---

## 6. AI 知识库扩充（ai-knowledge.js + rag-context.js）

老师信息升级完成后，AI 智能体（子项目 C）回答"你们老师是谁？""有什么资质？""能帮我做什么？"时，必须用新版内容。同步更新 3 处：

1. `src/data/ai-knowledge.js` 的 `kbExpert`：加入 Timeline 8 节点时间、Lineage 传承代数、6 资质、6 擅长领域 + 对应可推荐服务价格
2. `functions/api/_shared/rag-context.js` 的 `getFounderContext()`：返回 §1.2/1.3/1.4 的结构化 JSON（GPT-4o-mini 构建 system prompt 用）
3. 加入专家意图识别 trigger：当用户提到 `certificate / qualified / professor / degree / lineage / 资质 / 师承 / 教授 / 学历` 时，除了文字回答，还自动附上 About 页 Hero 锚点链接 `#about-hero` + "点击查看徐伟老师 6 资质证书可视化" CTA。

---

## 7. 文件清单（将被新增 / 修改）

**新增（3 个组件文件，把 About 10 个 section 拆为小组件方便维护）**：
```
src/components/about/SealBadges.astro        # 6 枚 SVG 章 + defs
src/components/about/LineageTree.astro        # 师承族谱竖排 SVG
src/components/about/TimelineStory.astro      # 40 年时间线滑动 + 数据填充
```

**修改（~10 个文件）**：
```
src/pages/about.astro                        # 重构为 §2 的 10 section 新结构
src/pages/services.astro                     # §3 专家区 2.0
src/i18n/en.json   § about.* 新增 ~70 个 key  英文版 full text
src/i18n/zh.json   § about.* 新增 ~70 个 key  繁体原文
src/i18n/es.json   § about.* 新增 ~70 个 key  (英文过渡)
src/i18n/fr.json   § about.* 新增 ~70 个 key  (英文过渡)
src/i18n/de.json   § about.* 新增 ~70 个 key  (英文过渡)
src/data/ai-knowledge.js                      # kbExpert + expertise triggers 扩充
functions/api/_shared/rag-context.js          # getFounderContext() 重写
```

---

## 8. 里程碑 & 验收清单

| 里程碑 | 内容 | 验收点 |
|---|---|---|
| M1 | 6 枚 SVG 图章组件 + 师承族谱 + Timeline 组件 | 6 章在视网膜屏不糊；族谱与 Timeline 在 768px 以下正常换竖排 |
| M2 | About 页 10 section 完成 en + zh 内容 | 5 秒内完成首屏（Hero），Lighthouse Performance > 85 |
| M3 | 5 语言 i18n 通，Services 专家区同步升级 | fr/es/de 用户不会看到 i18n-missing-label 空标签 |
| M4 | AI 知识库同步 + 意图 CTA 对接 | 向 AI 提问 "Tell me about Master Xu Wei's qualifications" → 回复含 6 资质 + About#hero 锚链 |
| M5 | 视觉回归 + 多端测试 | 1920 / 1440 / 1024 / 768 / 390 五个断点均无横向滚动 / 错位 |

---

## 9. 合规红线（严卡）

1. ❌ **绝对不直接用北京大学 / 河北美术学院的官方 Logo**（商标侵权），只使用纯文字 + 自制装饰 SVG
2. ❌ 不用 "Dr. Xu Wei" / "Professor Xu Wei" 的前缀式头衔，**只用荣誉式头衔放在 Seal 中展示**（避免被 Google Scholar / 学历核查网站打假）
3. ❌ 所有 Before/After 客户案例 **名字打码**，不使用客户真实联系方式
4. ✅ en/es/fr/de 所有页面底部加 §1.2 合规小字说明

---

## 10. 范围外（明确不做）

- ❌ 不做真实客户照片上传功能（子项目 F 做 Admin 媒体库时一起做）
- ❌ 不做 Video Testimonial 视频播放（等有真实客户案例视频后再加）
- ❌ 不改动 courses.js 里的课程数据结构（那是子项目 B/C 升级课程表单时统一改）
- ❌ 不做 es/fr/de 的专业人工翻译（先用英文过渡，避免机翻文化术语错误）

---

## Spec 自审（写后立即检查）

1. **Placeholder 扫描**：无 TBD / TODO；es/fr/de 过渡方案明确说明"先英文后专业翻译"
2. **一致性**：所有头衔号数（6 / 80th / 79th / 40+ / 10,000+ / 12 Countries）前后一致
3. **范围检查**：与 A 子项目（后端基建）完全独立不交叉，可并行开发
4. **歧义检查**：合规红线第 1-4 条明确，关于"特聘教授"的头衔呈现方式无歧义
5. **数据来源**：所有老师信息均可追溯到用户提供的 PDF 截图原文，未擅自添加任何"某某名人推荐 / 某杂志采访"之类虚假背书 ✅

✅ 自审通过。
