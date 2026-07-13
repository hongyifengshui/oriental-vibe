/**
 * Convert zh.json from Simplified Chinese to Traditional Chinese
 * Uses opencc-js (OpenCC JavaScript port) for accurate conversion
 */
const fs = require('fs');
const path = require('path');

async function main() {
  // Dynamic import for ESM module
  const { Converter } = await import('opencc-js');

  // Create Simplified-to-Traditional converter (Taiwan standard)
  const converter = Converter({ from: 'cn', to: 'twp' });

  const zhPath = path.join(__dirname, '..', 'src', 'i18n', 'zh.json');
  const zhBackupPath = path.join(__dirname, '..', 'src', 'i18n', 'zh.json.bak');

  // Read original
  const original = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

  // Backup original
  fs.writeFileSync(zhBackupPath, JSON.stringify(original, null, 2), 'utf8');
  console.log('Backed up original to zh.json.bak');

  // Recursively convert all string values
  function convertStrings(obj) {
    if (typeof obj === 'string') {
      return converter(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(convertStrings);
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = convertStrings(value);
      }
      return result;
    }
    return obj;
  }

  const converted = convertStrings(original);

  // Write converted
  fs.writeFileSync(zhPath, JSON.stringify(converted, null, 2), 'utf8');
  console.log('Successfully converted zh.json to Traditional Chinese');

  // Verify it's valid JSON
  JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  console.log('Verified: valid JSON');

  // Show a few samples
  const samples = [
    ['faq.hero_title', converted.faq?.hero_title],
    ['faq.popular_q1', converted.faq?.popular_q1],
    ['home.hero_title', converted.home?.hero_title],
    ['nav.shop', converted.nav?.shop],
    ['brand.name', converted.brand?.name],
  ];
  console.log('\nSample conversions:');
  samples.forEach(([key, val]) => {
    if (val) {
      const orig = original[key.split('.')[0]]?.[key.split('.')[1]] || '';
      console.log(`  ${key}: ${val}`);
    }
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});