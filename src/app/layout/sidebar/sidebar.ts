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
      width: 260px;
      height: 100vh;
      background: var(--sx-surface);
      border-right: 1px solid var(--sx-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.25rem 1.25rem;
      border-bottom: 1px solid var(--sx-border);
    }
    .logo-text {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--sx-text);
    }
    .logo-x { color: #3D8EFF; }
    .close-btn {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: 1px solid var(--sx-border);
      background: transparent;
      color: var(--sx-text-2);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
    }
    .close-btn:hover { background: var(--sx-red-bg); color: var(--sx-red); border-color: var(--sx-red); }

    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }
    .nav-section {
      font-size: 0.67rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--sx-text-3);
      padding: 0 0.5rem;
      margin: 0 0 0.5rem;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.875rem;
      border-radius: 8px;
      color: var(--sx-text-2);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 150ms ease;
    }
    .nav-item .pi { font-size: 1rem; width: 20px; text-align: center; }
    .nav-item:hover {
      background: var(--sx-primary-bg);
      color: var(--sx-primary-text);
    }
    .nav-item.active {
      background: var(--sx-primary-bg);
      color: var(--sx-primary-text);
      font-weight: 600;
    }

    .sidebar-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--sx-border);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      color: var(--sx-text-3);
    }
    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--sx-green);
      box-shadow: 0 0 6px var(--sx-green);
      flex-shrink: 0;
    }
  `]
})
export class SidebarComponent {
  @Input() showClose = false;
  @Output() closeSidebar = new EventEmitter<void>();

  navItems: NavItem[] = [
    { label: 'Dashboard',     icon: 'pi-home',       route: '/dashboard' },
    { label: 'Usuarios',      icon: 'pi-users',      route: '/users' },
    { label: 'Servicios',     icon: 'pi-bolt',       route: '/services' },
    { label: 'Comparaciones', icon: 'pi-chart-bar',  route: '/comparison-history' },
    { label: 'Suministros',   icon: 'pi-file-check', route: '/supplies' },
  ];
}
