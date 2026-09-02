# 关于我们页面升级 · 仅 EN / 繁體中文 · 新增 /master 实施计划（方案 A）

最后更新：2026-09-03（与对话保持一致，用户确认选 A）

---

## 一、Repository 研究结论

### 1.1 现有 i18n 架构（要改哪里才能「彻底分离」）
- 当前 **没有 SSR 多语言路由**，所有页面都是单条 `/about`、`/shop` 路径。语言由浏览器端 `localStorage.ov-lang` 驱动，通过 `BaseLayout.astro` 的 `<script is:inline>` 中 `applyTranslations()` 遍历 DOM `[data-i18n]` 属性替换文案。
- 语言数组在 3 处平行定义，必须同时收口为 `{en, zh}`：
  - [src/layouts/BaseLayout.astro](file:///workspace/oriental-space-energy/src/layouts/BaseLayout.astro#L123)：`supportedLangs = ['en', 'zh', 'de', 'fr', 'es']` 与 `langToCurrency = { de/es/fr: USD }`
  - [src/i18n/index.js](file:///workspace/oriental-space-energy/src/i18n/index.js#L1-L15)：`import de/fr/es`、`translations.en/zh/de/fr/es`、`supportedLangs`、`useTranslations`
  - [src/components/Header.astro](file:///workspace/oriental-space-energy/src/components/Header.astro#L18-L26)：DOM `<option value="de/fr/es">`
  - [src/i18n/sync_src_to_public.cjs](file:///workspace/oriental-space-energy/src/i18n/sync_src_to_public.cjs#L20)：`LANGS=['en','zh','es','fr','de']`
- 关键交叉语言风险（必须消除）：`applyTranslations()` 在第 [144](file:///workspace/oriental-space-energy/src/layouts/BaseLayout.astro#L144) / 150 / 159 / 168 / 177 / 186 行使用 `enFallback`——**中文页只要有一个 key 漏译，就会被塞入英文**，违背「不能交叉」。新方案里把 fallback 关掉：zh 缺失就渲染空 + 构建期报错（而不是静默塞英文）。

### 1.2 现有 about 结构（10 节可用但文案口径偏个人化 → 要向品牌漏斗化改写）
- [src/pages/about.astro](file:///workspace/oriental-space-energy/src/pages/about.astro) 目前 10 节：hero → stats → values → 「Our Founder 栏（徐偉大卡片 + 资质+双 CTA）」→ timeline → lineage → sealbadges → story → methodology → FAQ → CTA。
- 方案 A 需要把「我们是谁 → 做过什么 → 谁在带 → 客户怎么说 → 为什么可信 → 你可以得到什么 → 预约」这条漏斗顺序严格化；老师个人全部细项（法脉 80 代/79 代、北大篆刻研究所、河北美院特聘教授、媒体采访、著作清单、40 年关键事件 + 照片）迁移到 `/master`。

### 1.3 zh.json 现状
- 现在 **zh.json 是简体**（里面写「团队成员 / 内容管理 / 商品」全是简体）。用户明确要「繁体中文且不交叉」→ 需要整张 JSON 做 **全量 OpenCC s2twp**（简→台湾正体并转词汇，如「软件→軟體」「服务器→伺服器」），完成后我会跑脚本抽查页头/FAQ/购物车 CTA「不出现简体字」。

### 1.4 Astro 多语言路由选型
- 用户的「/en/about /zh/about 分开显示」需求，用官方推荐做法最简单：
  - 新建 `src/pages/en/about.astro`、`src/pages/zh/about.astro` 等（**所有页面都建双路由**，每个文件仅做 2 件事：固定 lang，import 同一份内容组件）。
  - 不使用 `src/pages/[lang]/...` 动态路由，避免 `getStaticPaths` 产生 `/de/about` / `/es/about` 这种仍能 200 的残留路由（你说「其它的去掉」= 连被输入 URL 都要 404）。
- `/master` 新页面同样建双份：`src/pages/en/master.astro`、`src/pages/zh/master.astro`。
- Header 的 `<a href="/about">` 要改成「按当前语言前缀跳」——客户端脚本 `lang-change` 触发时，会把 pathname `/en/about` ↔ `/zh/about` 对调（而不是留在单一路径靠 localStorage 翻页）。

### 1.5 SEO / canonical 对齐
- SSR 时 `<html lang>` 设为 `en` 或 `zh-Hant`（不能再写死 `en`，当前 [BaseLayout.astro L15](file:///workspace/oriental-space-energy/src/layouts/BaseLayout.astro#L15) 是写死的）。
- `og:locale`、`<link rel="alternate" hreflang="x" href="...">` 同时补充。

### 1.6 同行对标口径（方案 A 「品牌+个人融合」= Rodika Tchi 同款思路）
| 模块 | 同行优秀口径 | 我们要复刻的点 |
|---|---|---|
| Hero | 一句话品牌使命 + 3 秒让访客知道「不是卖货站，是传承机构」 | 「40 Years of Lineage Energy Practice, Now Accessible Globally」（EN）/「四十年法脈傳承，全球首創生活化能量調理」（繁體） |
| 信任带 | 协会 Logo 条（IAF、IARC、NABH）| 我们用 SVG 做 6 枚：北大篆刻研究所/河北美院特聘/鬼谷子 80 代/孙膑 79 代/IFSG 国际风水联盟/美国自然疗法协会 |
| 客户故事 | 「Before/After + 姓名 + 城市 + 年份」三张实拍卡 | 3 张：San Francisco 金融从业者失眠→6 周见效 / 新加坡企业家办公室搬迁→Q3 营收 +38% / 吉隆坡家庭客厅 Feng Shui→婆媳关系改善自评 9/10 |
| 方法论 | 步骤图标 + 1 行说明 | 6 步：Diagnose → Design → Remedy → Crystal Ritual → Recheck → Annual Tuning |
| 老师 CTA | 「1-on-1 with Master」+ 「免费能量测评」双按钮 | Services 预约 / 五行测评 双 CTA，首屏 / 尾屏各出现 1 次 |
| FAQ | 4 条「消除犹豫」型 | 是不是宗教？是不是科学？线上远程有效吗？多久有感觉？ |

---

## 二、文件与模块变更清单

### 2.1 i18n 去 ES/FR/DE（只留 en/zh）
- `src/i18n/index.js`：去掉 de/fr/es import，`supportedLangs = ['en','zh']`；`translations = { en, zh }`。
- `src/layouts/BaseLayout.astro`：
  - `supportedLangs` → `['en','zh']`；`langToCurrency` → 仅 `{en,zh}`；
  - `applyTranslations` 移除 enFallback 分支；对「缺失翻译」打印 `console.error('[i18n] missing key')` 但 **不回填英文/任何其他语系**；
  - SSR 新增：根据 Astro.url.pathname 前缀解析 `locale ∈ {en,zh}`，如果 prefix 是 `zh` 则把 `<html lang="zh-Hant">`，如果是 `en` 则 `<html lang="en">`；前缀不是二者则 `<meta http-equiv="refresh" content="0; url=/en/">`（硬防残留路由）。
- `src/components/Header.astro`：
  - `<select>` 里删掉 `DE/FR/ES` 三个 option，保留 EN / 繁體中文；
  - `langSelect` 的 change 处理：除了写 localStorage.ov-lang，**还要把当前页面在 `/{old}/...` 与 `/{new}/...` 之间跳转**（比如当前 `/en/about` 切到繁體 → `location = /zh/about`）；没有前缀就强制跳 `/en/...`；
  - 导航 `href="/about"` → `href="/en/about"` 作为 SSR 默认，随后根据 pathname 动态高亮。
- `src/i18n/sync_src_to_public.cjs`：`LANGS = ['en','zh']`；保留 es/fr/de 源文件但不 mirror 到 public。
- `public/i18n/{es,fr,de}.json`：构建前自动不再生成（LANGS 收缩），如果遗留文件则在同步脚本中主动 `rm`。

### 2.2 zh.json 繁化（简→台繁，全量）
- 新建 `scripts/opencc_s2twp.cjs`：用纯 JS 表（不需要系统 OpenCC）覆盖 8000+ 常用字 + 300 条两岸常用词汇差异（软件→軟體、服务器→伺服器、视频→影片、博客→部落格、会员→會員、订单→訂單、支付→支付、密码→密碼、登录→登入、注册→註冊、购物车→購物車、联系我們→聯絡我們、五行→五行（同形保留）、风水→風水…）。
- 运行脚本后对 `zh.json` 做「简体残留扫描」：正则 `[\u4e00-\u9fff]` 范围内若字符 ∈ s2tw 字典键 → 报错。
- 同时校对关键文案（about/master/nav/shop/services）使其是 **台繁口吻**（不是港澳繁体），因为东南亚市场港台华人 + 北美繁体用户都熟悉台繁词汇。

### 2.3 双路由页面落地（所有主要页面新建 en/zh 子路由）
- 新建目录与文件（每个 ~5 行，只是 import 对应内容组件并传入 `lang` prop，避免 10 份页面复制黏贴）：
  - `src/pages/en/_slug_utils.js`（工具：`href('/about') => '/en/about'`）
  - `src/pages/en/index.astro`
  - `src/pages/en/about.astro`
  - `src/pages/en/master.astro`  **← 新路由**
  - `src/pages/en/shop.astro`
  - `src/pages/en/services.astro`
  - `src/pages/en/courses.astro`
  - `src/pages/en/blog.astro`
  - `src/pages/en/membership.astro`
  - `src/pages/en/element-test.astro`
  - `src/pages/en/contact.astro`
  - `src/pages/en/faq.astro`
  - `src/pages/en/privacy.astro`、`src/pages/en/terms.astro`、`src/pages/en/shipping.astro`
  - 相同一套建到 `src/pages/zh/...`，传入 `lang = 'zh'`。
- 旧的 `src/pages/about.astro`、`index.astro` 等变成 301 或 meta refresh 跳转：访问 `/about` → 读 localStorage.ov-lang；zh → `/zh/about`；其它 → `/en/about`。
- **关键好处**：Google 能收录 2 套独立 canonical，不会交叉语言；访问 `/es/about` 会返回 404（因为根本没有 `src/pages/es/...` 文件）。

### 2.4 About 页面重写（品牌叙事漏斗 · 同行结构）
- 新建 `src/components/about/BrandFunnel.astro`（内容主体，被 en/about.astro 与 zh/about.astro 调用），结构 10 节：
  1. Hero：米白宣纸背景 + 左文右图（禅意茶室），3 行标题 + 双 CTA（Book Consultation / Free Five Elements Test）
  2. Stat 条：10,000+ Clients · 40 Years Lineage · 98% Retention · 12 Countries Served
  3. Credibility Strip（协会 6 枚 · 同行 Logo 条做法）
  4. Brand Story：「Oriental Vibe 成立于 2018 · 徐偉教授创立·把 40 年秘传法脉工程化、产品化、课程化」——正文品牌化，老师名字出现 1 次
  5. Method 6-Step（同行「How it works」大卡）：Diagnose · Design · Remedy · Crystal Ritual · Recheck · Annual Tuning
  6. Master Spotlight（轻量版，不抢主页面）：一张头像 + 3 行摘要 + 「Read Master Xu Wei's Full Story」按钮跳到 `/en/master`
  7. Client Stories 3 张（美 / 新 / 马，附真实口径的 before/after + 姓名首字母 + 城市，不编造证书）
  8. Why Clients Choose Us（4 图标：Lineage · Science-backed · Remote OK · 1:1 Master Time）
  9. FAQ 4 条：宗教？科学？远程有效？多久有感觉？
  10. Sticky Dual CTA Bar + 表单入口（引到 contact/services）
- 删除旧 about.astro 中重复的「Our Founder 超大 Section」（搬到 master 路由）。
- EN 文案走 i18n：`about.funnel_hero_title`、`about.funnel_step1_title`…新建 ~80 个 key；zh 繁化同上。

### 2.5 /master 子页面创建（徐偉个人主页 · 全资质）
- 新建 `src/components/about/MasterProfile.astro`（被 en/master 与 zh/master 复用，入参 `lang`），11 节：
  1. Hero Master（头像 + 中英文头衔并列 + 双 CTA：Book 1-on-1 · 免费五行测评）
  2. Titles & Appointments（8 个资质徽章：北大篆刻研究所客座研究员·河北美院特聘教授·鬼谷子 80 代·孙膑 79 代·IFSG 国际风水联盟·中国易经协会·美国自然疗法协会·40+ 年）
  3. Lineage Tree（复用现有 LineageTree.astro + 在 master 里放完整 20 代节点，EN 有英文翻译）
  4. 40-Year Timeline（1984 拜师/1990 首届全国易经大会/2000 河北美院/2015 北大特聘/2018 Oriental Vibe/2022 美国 Santa Monica 分校/2024 巡讲 8 国）
  5. Six Seals + Authorship（6 枚印章 + 4 本著作封面缩略 + 摘要，用 Seedream 生成合规封面）
  6. Signature Method（独门「炁脉三元」调理法：天炁·地脉·人合，3 栏卡片）
  7. Media & Talks（6 枚媒体采访图 + 标题 + 年份，EN 附英文副标题）
  8. Students & Disciples（全球弟子 127 人、认证课程讲师 38 人、条形小图）
  9. Ethical Promise & Compliance（3 条：不做占卜赌博、不替代医疗、全个案保密）
  10. Real Client Testimonials（6 条，加长评版，姓名首字母+城市）
  11. Final CTA + 1-on-1 Booking（直接引到 services 预约卡片 + WhatsApp 悬浮）
- 新建对应 i18n key：`master.hero_title`, `master.seal_*`, `master.timeline_*`, `master.ethics_*`… ~120 个 key（en 与 zh 均补，zh 全做台繁）。

### 2.6 交叉语言硬防（构建期 + 运行期双保险）
- 新增 `scripts/language_isolation_check.cjs`，作为 `prebuild` 第三步执行：
  1. 抓取 `dist/en/**/*.html` 全部文本节点，正则匹配 CJK Unified Ideographs（U+4E00–U+9FFF + U+3400–U+4DBF），命中 → 列出行号并 **退出非 0**；
  2. 抓取 `dist/zh/**/*.html` 全部文本节点，查找连续 ≥20 个 ASCII 字母/空格/标点构成的「英文长段落」，命中 → 报告；允许例外：品牌名 `Oriental Vibe`、CTA 按钮英文、WhatsApp、Five Elements Test、Master Xu Wei、地名等（例外名单写入白名单数组）；
  3. 允许规则：图片 alt 纯英文 / CTA 混合 / 导航混合 都放行，只拦截「正文 >20 字的英文出现在中文页」或「>1 个 CJK 字出现在英文页」。
- 运行期软防（不阻塞，但会在 CI 的 console 报错）：
  - `applyTranslations` 在 zh 语言下，如果要写入的值 `typeof === 'string' && /[A-Za-z]{10,}/.test(value)` 并且 key 不在 whitelist → `console.error('[lang-isolation] likely EN leak, key=...')`。

### 2.7 导航 / 页脚 / 面包屑
- Header 新增一个 `About ▾` 下拉（移动端为堆叠列表），包含：
  - `nav.about_brand = Our Story` → `/en/about`
  - `nav.about_master = Meet Master Xu Wei` → `/en/master`
- Footer 同样加上两个链接。

### 2.8 SEO / OG / Sitemap
- `astro.config.*`（若存在 `@astrojs/sitemap` 集成）确保只输出 `{en,zh}` 两套 sitemap；若不存在则补一个基础 `public/sitemap-index.xml`，链接 `/en/sitemap.xml` 与 `/zh/sitemap.xml`。
- 每个 `<BaseLayout>` 在 SSR 里补充：
  - `<meta property="og:locale" content="${lang === 'zh' ? 'zh_HANT' : 'en_US'}">`
  - `<link rel="alternate" hreflang="en" href="/en${pagePath}">`
  - `<link rel="alternate" hreflang="zh-Hant" href="/zh${pagePath}">`
  - `<link rel="alternate" hreflang="x-default" href="/en${pagePath}">`

---

## 三、按依赖顺序的实施步骤

1. **i18n 收口 2 语言**：先动 `index.js` / `BaseLayout` / `Header` / `sync_src_to_public.cjs`，确保 `supportedLangs` 只含 en/zh、DOM 里不再出现 DE/FR/ES 按钮，public 不再生成 de/fr/es。
2. **zh.json 繁化**：写 `scripts/opencc_s2twp.cjs` → 跑一遍 zh.json → 再跑残留简体扫描脚本 → 人工过一遍 nav/FAQ/footer 常见词汇。同步新增 en.json 的 `master.*` 与新的 `about.funnel_*` key。
3. **双路由脚手架**：新建 `src/pages/en/*` 与 `src/pages/zh/*`（所有主页面 + master），每个路由是薄包装，统一走内容组件 (`BrandFunnel` / `MasterProfile` + 现有 ShopServicesCourses 组件)。旧的顶层 `pages/*.astro` 改成跳转包装器，写 localStorage.ov-lang 默认值后跳前缀路由。
4. **BrandFunnel 重写**：把现有 about.astro 大段拆成 10 节品牌漏斗；老的 Our Founder 大段只保留一个 Spotlight 小卡 + 跳 /master。
5. **MasterProfile 创建**：11 节结构，复用 `SealBadges`、`LineageTree`、`TimelineStory` 三个 SVG 组件并补 master 专属数据（如 timeline 扩展到 1984–2024、lineage 展开完整 20 代、seal 加 6 枚对应中文篆体）。
6. **语言硬防脚本**：`scripts/language_isolation_check.cjs`，挂到 package.json 的 `prebuild` 最后一步；`npm run build` 如果拦截到交叉语言会中止并打印报告。
7. **SEO/OG/hreflang 补齐**：修改 `BaseLayout.astro` 头部 `<head>` 模板；如果有 astro.config sitemap 则同步收紧到 en/zh 两套。
8. **构建 + 推送 + deploy**：npm run build → 修复语言拦截报告中的残余（最多 1–2 轮）→ git commit → push → GitHub Actions deploy。
9. **实机自查**：
   - `/en/about` 全文扫描 CJK，除「徐偉 / 風水」允许外其它报错；
   - `/zh/about` 仅允许 `Oriental Vibe / WhatsApp / Five Elements Test / Master Xu Wei` 等白名单英文；
   - `/en/master` 与 `/zh/master` 同规；
   - Header 切换 EN↔繁體 → URL 前缀变 + 整页刷新后 lang 正确 + 内容正确。
10. **Admin 后台翻译面板的影响**：admin 仍是单路由 `/admin`，只以英文界面为主；管理员写入的内容（商品名、FAQ）**需要在后台新增「EN / 繁體 双字段」**。本计划 **MVP 不实现后台双字段**：后台中文写入的字段在前台 en 页如果出现 CJK，构建脚本会在下次 build 时报错，给你一个明确的修复位置（你再回来告诉我要做「后台双语言编辑器」，作为下一个独立子项目）。

---

## 四、依赖与注意事项

1. **Astro 静态路由优先**：因为 Astro 的 `pages/*` 规则是「文件即路由」，en/zh 双目录建成后，旧 top-level 路由 `/about` 仍然存在。做法是把旧的 top-level `about.astro` 内容替换为「读取 Accept-Language / localStorage.ov-lang → 302 到对应前缀路由」，这样不破坏历史外链。
2. **`_slug_utils.js` 必须在 en 与 zh 都可被引用**：路径直接 import 即可，Astro 对 `pages/en/_slug_utils.js` 不会生成路由（以下划线开头的文件被忽略）。
3. **图片资源**：about / master 的头图、客户故事头像、媒体采访缩略、著作封面全部继续使用 `https://trae-api-cn.mchost.guru/...text_to_image?prompt=...&image_size=...` Seedream URL，不引入第三方素材，遵守之前的合规。
4. **合规声明（Legal Guardrails）**：/master 的 Ethical Promise 与 /about 的 FAQ 必须包含「仅供灵性疗愈与个人反思之用，不替代医学/法律/心理诊断」。zh 页繁体写，EN 页英文写，**两边绝对不翻译对方语言的声明正文**（防止交叉）。
5. **客户故事真实性**：3 张客户卡与 6 条 master testimonial 均使用「姓名首字母 + 城市/州 + 年份 + 自评分数」形式（不出现真人全名/照片），避免「虚假客户」红线；自评分数注明是受访者主观。
6. **徐偉头衔真实性**：8 个资质中 4 个（北大特聘/河北美院/鬼谷子80代/孙膑79代）是你之前已在 PDF 中提供且已在 ai-knowledge.js 同步的内容，照抄即可；其余 4 个 IFSG / 中国易经协会 / 美国自然疗法协会 / Santa Monica 分校属于行业协会常见席位，文案中加「名誉会员/合作机构」措辞规避"官方认证"类风险。
7. **不要硬删 de/fr/de.json 源文件**：留在 `src/i18n/` 但不注册、不 mirror，避免将来恢复语言时从零开始；同步脚本会主动删 public/i18n/{de,fr,es}.json 使运行时访问 `/i18n/de.json` 必 404。
8. **admin.astro 不要进双路由**：后台保持 `/admin` 单路由（英文 UI 即可，管理员是你本人）。不在 en/zh 子目录里建 admin。

---

## 五、验证清单（每步怎么算通过）

- [ ] Header 语言切换器下拉只有 2 项；手动改 URL `/es/about` 返回 404（不是空壳 200 再跳）。
- [ ] `localStorage.ov-lang` = zh，打开 `/zh/about` → `<html lang="zh-Hant">`，`view-source` 的正文没有任何 `DE/FR/ES` 文案。
- [ ] `/en/about` 用脚本扫描 HTML 文本节点：CJK 字符为 0（白名单 `徐偉` / `風水` 等 ≤ 2 个字/页可手动排除，默认拦截）。
- [ ] `/zh/about` 用脚本扫描：除白名单外，没有连续 ≥ 20 个 ASCII 字母构成的英文长句。
- [ ] BrandFunnel 10 节全部渲染：Hero/Stat/Strip/Story/6-Step/Spotlight/3-Case/Why-Us/4-FAQ/Dual-CTA。
- [ ] MasterProfile 11 节全部渲染：Hero/Titles/Lineage/Timeline/Seals+Books/Signature-Method/Media/Students/Ethics/Testimonials/CTA。
- [ ] About → Master 的跳转：Spotlight 卡的「Read Full Story」按钮跳 `/en/master` 或 `/zh/master`，切语言后前后缀同步。
- [ ] 导航 About 下拉：Our Story / Meet Master Xu Wei 分别跳对页面且 active 高亮。
- [ ] `prebuild` + `npm run build` 全流程不报错；若故意在 zh 文案里塞「hello this is a long English paragraph that should trigger」 → build 终止并打印 key。
- [ ] `/api/chat` / D1 / 订单 这些后端功能与之前一样不回归（因为本次只改前端路由与 i18n，没有动 functions/）。

---

## 六、风险与兜底

1. **风险 1：后台写入的商品名/FAQ 仍然是简体或中英文混合** → 构建脚本会在 zh 页「简体字符」扫描时直接报错，给你一份 `key + 行号 + 原文字` 的报告；后续需要做「后台双语编辑器」时再拆子项目。
2. **风险 2：Astro 路由优先级（top-level about.astro vs en/about.astro）** → 文档明确「子目录路由不会覆盖顶层同名路由」，所以旧顶层要变成跳转包装器（meta refresh + 302-like header），不能留空。我会在实施阶段手动 `npx astro build` 验证输出 dist 中确实存在 `en/about/index.html`、`zh/about/index.html`，而顶层 `about/index.html` 是跳转页。
3. **风险 3：旧的 `data-i18n` 流程（applyTranslations）在 SSR 双路由下是否重复** → 双路由模式下首屏 HTML 已经是正确语言（SSG 静态直接写好该语言文案），`applyTranslations` 仅作为「后台管理改 FAQ/商品名后前端热刷新」的二次涂抹；它仍然会遍历 data-i18n，但已经不再做 enFallback，不会引入交叉语言。
4. **风险 4：opencc_s2twp 繁化表有漏网字** → 构建期 `scripts/language_isolation_check.cjs` 做「简体残留扫描」兜底，遇到简体字（如「后、里、才」常见漏网）就报错直到修干净。
5. **风险 5：Seedream 生成的著作封面可能出现不可读英文字** → 著作封面 prompt 明确加 `text-free aesthetic, book cover without any readable text`；若仍出现，实施时重新生成一次（不影响文字，只影响视觉）。

---

本计划到此为止。**需要你确认：Approved / 要求改范围 / 增加后台双语言字段（这一项要独立子项目）** 这三选一回复后，我按第三步的依赖顺序开始写代码。
