import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'suminex-theme';

  theme = signal<Theme>(this.getInitial());

  constructor() {
    effect(() => {
      const t = this.theme();
      const html = document.documentElement;
      if (t === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      localStorage.setItem(this.STORAGE_KEY, t);
    });
    // Apply immediately on init (before first render)
    if (this.theme() === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }

  toggle() {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private getInitial(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // Respect OS preference if no saved value
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
