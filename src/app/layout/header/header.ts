import { Component, inject, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TooltipModule],
  template: `
    <header class="topbar">

      <!-- Left: hamburger + breadcrumb -->
      <div class="topbar-left">
        <button class="hamburger-btn" (click)="openSidebar.emit()"
                aria-label="Abrir menú" pTooltip="Menú" tooltipPosition="right">
          <i class="pi pi-bars"></i>
        </button>
        <div class="breadcrumb">
          <span class="bc-root">Admin</span>
          <i class="pi pi-chevron-right bc-sep"></i>
          <span class="bc-current">{{ getPageTitle() }}</span>
        </div>
      </div>

      <!-- Right: theme toggle + user -->
      <div class="topbar-right">
        <button class="icon-btn" (click)="themeService.toggle()"
                [pTooltip]="themeService.theme() === 'dark' ? 'Modo claro' : 'Modo oscuro'"
                tooltipPosition="bottom">
          <i class="pi" [class.pi-sun]="themeService.theme() === 'dark'"
                        [class.pi-moon]="themeService.theme() === 'light'"></i>
        </button>

        <div class="divider"></div>

        <div class="user-area">
          <div class="avatar">{{ getInitial() }}</div>
          <div class="user-meta">
            <span class="user-name">{{ auth.currentUser()?.name || 'Admin' }}</span>
            <span class="user-email">{{ auth.currentUser()?.email }}</span>
          </div>
        </div>

        <button class="icon-btn logout-btn" (click)="auth.logout()"
                pTooltip="Cerrar sesión" tooltipPosition="bottom">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>

    </header>
  `,
  styles: [`
    .topbar {
      height: 60px;
      background: var(--sx-surface);
      border-bottom: 1px solid var(--sx-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .topbar-left { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-right { display: flex; align-items: center; gap: 0.5rem; }

    /* Hamburger — visible on mobile/tablet, hidden on desktop */
    .hamburger-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1px solid var(--sx-border);
      background: transparent;
      color: var(--sx-text-2);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
      flex-shrink: 0;
    }
    .hamburger-btn:hover {
      background: var(--sx-primary-bg);
      border-color: var(--sx-primary);
      color: var(--sx-primary-text);
    }
    @media (min-width: 1024px) {
      .hamburger-btn { display: none; }
    }

    /* Breadcrumb */
    .breadcrumb { display: flex; align-items: center; gap: 0.4rem; }
    .bc-root { font-size: 0.8rem; color: var(--sx-text-3); }
    .bc-sep { font-size: 0.55rem; color: var(--sx-text-3); }
    .bc-current { font-size: 0.875rem; font-weight: 600; color: var(--sx-text); }

    /* Icon buttons */
    .icon-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1px solid var(--sx-border);
      background: transparent;
      color: var(--sx-text-2);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
      flex-shrink: 0;
    }
    .icon-btn:hover {
      background: var(--sx-primary-bg);
      border-color: var(--sx-primary);
      color: var(--sx-primary-text);
    }
    .icon-btn .pi { font-size: 0.9rem; }
    .logout-btn:hover {
      background: var(--sx-red-bg) !important;
      border-color: var(--sx-red) !important;
      color: var(--sx-red) !important;
    }

    .divider { width: 1px; height: 20px; background: var(--sx-border-2); }

    /* User */
    .user-area {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0 0.25rem;
    }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--sx-primary), #6BB2FF);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .user-meta { display: flex; flex-direction: column; gap: 0.05rem; }
    .user-name  { font-size: 0.8rem; font-weight: 600; color: var(--sx-text); line-height: 1; }
    .user-email { font-size: 0.68rem; color: var(--sx-text-2); line-height: 1; }

    @media (max-width: 640px) {
      .user-meta { display: none; }
      .user-email { display: none; }
    }
  `]
})
export class HeaderComponent {
  @Output() openSidebar = new EventEmitter<void>();

  auth = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  getPageTitle(): string {
    const map: Record<string, string> = {
      '/dashboard':          'Dashboard',
      '/providers':          'Proveedores',
      '/services':           'Servicios',
      '/comparison-history': 'Comparaciones',
      '/supplies':           'Suministros',
    };
    return map[this.router.url] ?? 'Portal Admin';
  }

  getInitial(): string {
    const user = this.auth.currentUser();
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  }
}
