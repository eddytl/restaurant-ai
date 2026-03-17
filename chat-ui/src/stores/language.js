import { defineStore } from 'pinia';

export const translations = {
  fr: {
    appSubtitle: 'Assistant IA',
    newConversation: 'Nouvelle conversation',
    recent: 'Récent',
    noConversations: 'Aucune conversation',
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    welcome: 'Bienvenue chez Restaurant',
    welcomeSub: 'Votre assistant IA pour le Restaurant.\nParcourez le menu, passez des commandes ou vérifiez le statut de votre commande.',
    placeholder: 'Envoyer un message à Yamo...',
    enterToSend: 'Entrée',
    toSend: 'pour envoyer,',
    shiftEnter: 'Maj+Entrée',
    forNewLine: 'pour nouvelle ligne',
    rename: 'Renommer',
    delete: 'Supprimer',
    suggestions: [
      { icon: '🍽️', text: 'Montrez-moi le menu complet' },
      { icon: '🛒', text: 'Je veux passer une commande' },
      { icon: '📦', text: 'Vérifier le statut de ma commande' },
      { icon: '🔥', text: 'Quelles sont les spécialités ?' },
      { icon: '🍗', text: 'Montrez-moi les plats de poulet' },
      { icon: '🥗', text: 'Quelles salades avez-vous ?' }
    ]
  },
  en: {
    appSubtitle: 'AI Assistant',
    newConversation: 'New conversation',
    recent: 'Recent',
    noConversations: 'No conversations yet',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    welcome: 'Welcome to Restaurant',
    welcomeSub: 'Your AI assistant for Restaurant.\nBrowse our menu, place orders, or check your order status.',
    placeholder: 'Message Yamo, your Restaurant AI assistant...',
    enterToSend: 'Enter',
    toSend: 'to send,',
    shiftEnter: 'Shift+Enter',
    forNewLine: 'for new line',
    rename: 'Rename',
    delete: 'Delete',
    suggestions: [
      { icon: '🍽️', text: 'Show me the full menu' },
      { icon: '🛒', text: 'I want to place an order' },
      { icon: '📦', text: 'Check my order status' },
      { icon: '🔥', text: 'What are the menu specials?' },
      { icon: '🍗', text: 'Show me the chicken dishes' },
      { icon: '🥗', text: 'What salads do you have?' }
    ]
  }
};

export const useLanguageStore = defineStore('language', {
  state: () => ({
    lang: localStorage.getItem('restaurant-lang') || 'fr'
  }),
  getters: {
    t: (state) => translations[state.lang],
    isFr: (state) => state.lang === 'fr'
  },
  actions: {
    setLang(lang) {
      this.lang = lang;
      localStorage.setItem('restaurant-lang', lang);
    },
    toggle() {
      this.setLang(this.lang === 'fr' ? 'en' : 'fr');
    }
  }
});
