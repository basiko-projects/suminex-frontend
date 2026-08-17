import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon:  string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">

      <!-- Company branding -->
      <div class="company-area">
        <div class="company-avatar">{{ getInitial() }}</div>
        <div class="company-info">
          <span class="company-name">{{ auth.currentUser()?.name || 'Administrador' }}</span>
          <span class="company-sub">Bienvenido a Suminex</span>
        </div>
        @if (showClose) {
          <button class="close-btn" (click)="closeSidebar.emit()" aria-label="Cerrar menú">
            <i class="pi pi-times"></i>
          </button>
        }
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">

        <!-- Items comunes (todos los roles) -->
        @for (item of commercialItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active"
             [routerLinkActiveOptions]="{exact: true}" class="nav-item">
            <span class="nav-icon-wrap">
              <i [class]="'pi ' + item.icon"></i>
            </span>
            <span class="nav-label">{{ item.label }}</span>
            @if (item.badge) {
              <span class="nav-badge">{{ item.badge }}</span>
            }
          </a>
        }

        <!-- Sección Administrador (solo admin) -->
        @if (auth.isAdmin()) {
          <p class="nav-section-label">Administrador</p>
          @for (item of adminItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active"
               [routerLinkActiveOptions]="{exact: true}" class="nav-item">
              <span class="nav-icon-wrap">
                <i [class]="'pi ' + item.icon"></i>
              </span>
              <span class="nav-label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="nav-badge">{{ item.badge }}</span>
              }
            </a>
          }
        }

      </nav>

      <!-- Help box -->
      <div class="help-box">
        <p class="help-title">¿Necesitas ayuda?</p>
        <p class="help-sub">Estamos disponibles para ayudarte</p>
        <a href="mailto:soporte@suminex.es" class="help-btn">Contactar</a>
      </div>

    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100%;
      background: #F6F6F6;
      border-right: 1px solid rgba(0,0,0,0.10);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
    }

    /* ── Company area ── */
    .company-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.125rem 1rem;
      flex-shrink: 0;
    }
    .company-avatar {
      width: 42px; height: 42px;
      border-radius: 50%;
      background: #4375FF;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.05rem; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .company-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .company-name {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .company-sub {
      font-size: 12px;
      color: #94A3B8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .close-btn {
      width: 28px; height: 28px;
      border-radius: 7px;
      border: 1px solid rgba(0,0,0,0.10);
      background: transparent;
      color: #94A3B8;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 150ms;
      flex-shrink: 0;
    }
    .close-btn:hover { background: #FEF2F2; color: #EF4444; border-color: #EF4444; }

    /* ── Nav ── */
    .sidebar-nav {
      flex: 1;
      padding: 0.875rem 0.625rem;
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 8px 0 16px;
      height: 32px;
      border-radius: 4px;
      color: #5B5B5B;
      text-decoration: none;
      font-size: 12px;
      font-weight: 542;
      transition: all 120ms ease;
    }
    .nav-item:hover {
      background: #EBEBEB;
      color: #0F172A;
    }
    .nav-item.active {
      background: rgba(67,117,255,0.10);
      color: #000000;
      font-weight: 600;
    }
    .nav-icon-wrap {
      width: 28px; height: 28px;
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: transparent;
      transition: background 120ms ease;
    }
    .nav-icon-wrap .pi { font-size: 0.85rem; color: rgba(0,0,0,0.30); }
    .nav-item:hover .nav-icon-wrap .pi { color: #0F172A; }
    .nav-item.active .nav-icon-wrap .pi { color: #4375FF; }
    .nav-label { flex: 1; }
    .nav-section-label {
      font-size: 11px; font-weight: 600;
      color: #94A3B8; text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.75rem 0.75rem 0.25rem;
      margin: 0;
    }
    .nav-badge {
      display: inline-flex; align-items: center; justify-content: center;
      background: #EFF6FF;
      color: #1A6FE8;
      border-radius: 20px;
      font-size: 0.68rem;
      font-weight: 700;
      min-width: 20px;
      padding: 0.1rem 0.45rem;
      line-height: 1.4;
    }
    .nav-item.active .nav-badge {
      background: #227CFF;
      color: #fff;
    }

    /* ── Help box ── */
    .help-box {
      margin: 0.625rem;
      padding: 0.875rem 1rem;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .help-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 0.2rem;
    }
    .help-sub {
      font-size: 0.72rem;
      color: #64748B;
      margin: 0 0 0.75rem;
      line-height: 1.4;
    }
    .help-btn {
      display: block;
      text-align: center;
      padding: 0.45rem;
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.15);
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #1A6FE8;
      text-decoration: none;
      transition: all 150ms ease;
    }
    .help-btn:hover {
      background: #EFF6FF;
      border-color: #227CFF;
    }
  `]
})
export class SidebarComponent {
  @Input() showClose = false;
  @Output() closeSidebar = new EventEmitter<void>();

  auth = inject(AuthService);

  commercialItems: NavItem[] = [
    { label: 'Panel de control',  icon: 'pi-microsoft',  route: '/dashboard' },
    { label: 'Suministros',       icon: 'pi-file-check', route: '/supplies' },
    { label: 'Nuevo suministro',  icon: 'pi-user-plus',  route: '/nuevo-suministro' },
    { label: 'Facturación',       icon: 'pi-receipt',    route: '/billing' },
  ];

  adminItems: NavItem[] = [
    { label: 'Servicios',    icon: 'pi-bolt',       route: '/services' },
    { label: 'Estadísticas', icon: 'pi-chart-bar',  route: '/stats' },
    { label: 'Usuarios',     icon: 'pi-users',      route: '/users' },
  ];

  getInitial(): string {
    const user = this.auth.currentUser();
    if (user?.name)  return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  }
}
