import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light'; // 'dark' | 'light' — dark disabled, re-enable when ready

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<Theme>('light');

  constructor() {
    // Remove any persisted dark class on startup
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('suminex-theme');
  }

  // Toggle kept for future dark mode — wire back getInitial() + CSS .dark block when ready
  toggle() { /* no-op until dark mode is enabled */ }
}
