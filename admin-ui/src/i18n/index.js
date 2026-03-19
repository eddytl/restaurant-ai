import { createI18n } from 'vue-i18n'
import fr from './fr.json'
import en from './en.json'

const savedLocale = localStorage.getItem('admin-locale') || 'fr'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'fr',
  messages: { fr, en },
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('admin-locale', locale)
  document.documentElement.lang = locale
}
