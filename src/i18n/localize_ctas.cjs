// CTA 标签本地化：es/fr/de 的 _cta_book 和 _cta_join 类keys替换为对应语言
const fs = require('fs');
const path = require('path');

const I18N_DIR = __dirname;

// 需要翻译的 keys（_cta_book 类 和 _cta_join 类）
const BOOK_SIMPLE_KEYS = ['section_hero_cta_book'];
const JOIN_SIMPLE_KEYS = ['section_hero_cta_join'];
const BOOK_PRICE_KEYS = ['section_final_cta_book', 'final_cta_book_label'];
const JOIN_PRICE_KEYS = ['section_final_cta_join', 'final_cta_join_label'];

const TRANSLATIONS = {
  es: {
    bookSimple: 'Ver',
    joinSimple: 'Unirme',
    bookPrice: 'Ver · desde $149',
    joinPrice: 'Unirme · desde $49'
  },
  fr: {
    bookSimple: 'Réserver',
    joinSimple: 'Rejoindre',
    bookPrice: 'Réserver · à partir de $149',
    joinPrice: 'Rejoindre · à partir de $49'
  },
  de: {
    bookSimple: 'Buchen',
    joinSimple: 'Mitglied werden',
    bookPrice: 'Buchen · ab $149',
    joinPrice: 'Mitglied werden · ab $49'
  }
};

for (const lang of ['es', 'fr', 'de']) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const t = TRANSLATIONS[lang];
  let updatedCount = 0;

  for (const k of BOOK_SIMPLE_KEYS) {
    if (typeof data.about[k] !== 'undefined') {
      if (data.about[k] !== t.bookSimple) {
        data.about[k] = t.bookSimple;
        updatedCount++;
      }
    }
  }
  for (const k of JOIN_SIMPLE_KEYS) {
    if (typeof data.about[k] !== 'undefined') {
      if (data.about[k] !== t.joinSimple) {
        data.about[k] = t.joinSimple;
        updatedCount++;
      }
    }
  }
  for (const k of BOOK_PRICE_KEYS) {
    if (typeof data.about[k] !== 'undefined') {
      if (data.about[k] !== t.bookPrice) {
        data.about[k] = t.bookPrice;
        updatedCount++;
      }
    }
  }
  for (const k of JOIN_PRICE_KEYS) {
    if (typeof data.about[k] !== 'undefined') {
      if (data.about[k] !== t.joinPrice) {
        data.about[k] = t.joinPrice;
        updatedCount++;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${lang}.json: 更新了 ${updatedCount} 个 CTA 标签`);

  // 验证
  JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`   JSON.parse OK`);
}

console.log('\n🎉 es/fr/de CTA 本地化完成');
