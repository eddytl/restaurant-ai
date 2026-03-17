import { defineStore } from 'pinia';

function applyTheme(isDark) {
  document.documentElement.className = isDark ? 'dark' : 'light';
}

export const useThemeStore = defineStore('theme', {
  state: () => {
    const isDark = localStorage.getItem('restaurant-theme') !== 'light';
    applyTheme(isDark);
    return { isDark };
  },
  actions: {
    toggle() {
      this.isDark = !this.isDark;
      localStorage.setItem('restaurant-theme', this.isDark ? 'dark' : 'light');
      applyTheme(this.isDark);
    }
  }
});
