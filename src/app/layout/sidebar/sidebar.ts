import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">

      <!-- Logo row -->
      <div class="sidebar-logo">
        <span class="logo-text">SUMINE<span class="logo-x">X</span></span>
        @if (showClose) {
          <button class="close-btn" (click)="closeSidebar.emit()" aria-label="Cerrar menú">
            <i class="pi pi-times"></i>
          </button>
        }
      </div>

      <!-- Main nav -->
      <nav class="sidebar-nav">
        <p class="nav-section">Menú principal</p>
        @for (item of navItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
            <i [class]="'pi ' + item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <!-- Bottom: version -->
      <div class="sidebar-footer">
        <span class="dot"></span>
        <span>v1.0.0</span>
      </div>

    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px; height: 100vh;
      background: var(--bg-subtle, #E8EBF4);
      border-right: 1px solid var(--border-color, #D5D9E8);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: Inter, system-ui, sans-serif;
    }
    .sidebar-logo {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1rem 1rem;
      border-bottom: 1px solid var(--border-color, #D5D9E8);
    }
    .logo-text {
      font-size: 1.25rem; font-weight: 800; letter-spacing: 3px;
      color: var(--text-primary, #1C2033);
    }
    .logo-x { color: var(--accent, #4F46E5); }
    .close-btn {
      width: 30px; height: 30px; border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-color, #D5D9E8);
      background: transparent; color: var(--text-muted, #9299B8);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 150ms;
    }
    .close-btn:hover { background: var(--danger-bg, #FEF2F2); color: var(--danger, #DC2626); border-color: var(--danger-border, #FECACA); }

    .sidebar-nav {
      flex: 1; padding: 0.75rem 0.625rem;
      display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
    }
    .nav-section {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--text-muted, #9299B8); padding: 0 0.5rem; margin: 0.25rem 0 0.375rem;
    }
    .nav-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.6rem 0.75rem; border-radius: var(--radius-md, 8px);
      color: var(--text-secondary, #5A6180); text-decoration: none;
      font-size: var(--font-base, 13px); font-weight: 500;
      transition: all 150ms; border-left: 2px solid transparent;
    }
    .nav-item .pi { font-size: 0.875rem; width: 18px; text-align: center; }
    .nav-item:hover { background: rgba(79,70,229,0.06); color: var(--text-primary, #1C2033); }
    .nav-item.active {
      background: var(--accent-light, #EEF2FF);
      color: var(--accent, #4F46E5); font-weight: 600;
      border-left-color: var(--accent, #4F46E5);
    }
    .sidebar-footer {
      padding: 0.875rem 1rem; border-top: 1px solid var(--border-color, #D5D9E8);
      display: flex; align-items: center; gap: 0.5rem;
      font-size: var(--font-xs, 11px); color: var(--text-muted, #9299B8);
    }
    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--success, #059669); box-shadow: 0 0 6px var(--success, #059669); flex-shrink: 0;
    }
  `]
})
export class SidebarComponent {
  @Input() showClose = false;
  @Output() closeSidebar = new EventEmitter<void>();

  navItems: NavItem[] = [
    { label: 'Dashboard',     icon: 'pi-home',       route: '/dashboard' },
    { label: 'Usuarios',      icon: 'pi-users',      route: '/users' },
    { label: 'Servicios',     icon: 'pi-th-large',   route: '/services' },
    { label: 'Comparaciones', icon: 'pi-chart-bar',  route: '/comparison-history' },
    { label: 'Suministros',   icon: 'pi-file-check', route: '/supplies' },
  ];
}
