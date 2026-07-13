import en from './en.json';
import zh from './zh.json';
import de from './de.json';
import fr from './fr.json';
import es from './es.json';

export const translations = { en, zh, de, fr, es };
export const supportedLangs = ['en', 'zh', 'de', 'fr', 'es'];
export const defaultLang = 'en';

export function getLangFromUrl(url) {
  const [, lang] = url.pathname.split('/');
  if (supportedLangs.includes(lang)) return lang;
  return defaultLang;
}

export function useTranslations(lang) {
  return function t(key) {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }
}
