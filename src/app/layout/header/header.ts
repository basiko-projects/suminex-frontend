import { Component, inject, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="topbar">

      <!-- Left: hamburger + page tab -->
      <div class="topbar-left">
        <button class="hamburger-btn" (click)="openSidebar.emit()" aria-label="Abrir menú">
          <i class="pi pi-bars"></i>
        </button>

        <div class="page-tab">
          <span class="page-tab-icon">
            <i [class]="'pi ' + getPageIcon()"></i>
          </span>
          <span class="page-tab-label">{{ getPageTitle() }}</span>
        </div>
      </div>

      <!-- Right: nuevo suministro + icons + user -->
      <div class="topbar-right">

        <!-- Nuevo suministro button -->
        <a routerLink="/supplies" class="new-btn">
          <i class="pi pi-user-plus"></i>
          <span>Nuevo suministro</span>
        </a>

        <!-- Bell -->
        <div class="notif-wrap" (click)="toggleNotifs($event)">
          <button class="icon-btn" title="Notificaciones">
            <i class="pi pi-bell"></i>
            <span class="notif-badge">{{ notifications.length }}</span>
          </button>

          @if (notifsOpen()) {
            <div class="notif-dropdown" (click)="$event.stopPropagation()">
              <div class="notif-head">
                <span class="notif-head-title">Notificaciones</span>
                <span class="notif-count">{{ notifications.length }}</span>
              </div>
              <div class="notif-list">
                @for (n of notifications; track n.id) {
                  <div class="notif-item" [class.notif-unread]="n.unread">
                    <div class="notif-icon-wrap" [class]="'notif-icon-wrap--' + n.type">
                      <i [class]="'pi ' + n.icon"></i>
                    </div>
                    <div class="notif-body">
                      <p class="notif-title">{{ n.title }}</p>
                      <p class="notif-desc">{{ n.desc }}</p>
                      <span class="notif-time">{{ n.time }}</span>
                    </div>
                    @if (n.unread) { <span class="notif-dot"></span> }
                  </div>
                }
              </div>
              <div class="notif-foot">
                <button class="notif-foot-btn">Ver todas las notificaciones</button>
              </div>
            </div>
          }
        </div>

        <div class="vdivider"></div>

        <!-- User avatar + dropdown -->
        <div class="user-area" (click)="toggleDropdown($event)">
          <div class="avatar">{{ getInitial() }}</div>
          <i class="pi pi-chevron-down chev" [class.chev-open]="dropdownOpen()"></i>

          @if (dropdownOpen()) {
            <div class="user-dropdown" (click)="$event.stopPropagation()">
              <div class="dropdown-info">
                <span class="di-name">{{ auth.currentUser()?.name || 'Admin' }}</span>
                <span class="di-email">{{ auth.currentUser()?.email }}</span>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item dropdown-item--danger" (click)="auth.logout()">
                <i class="pi pi-sign-out"></i>
                Cerrar sesión
              </button>
            </div>
          }
        </div>

      </div>

    </header>
  `,
  styles: [`
    .topbar {
      height: 58px;
      background: #FFFFFF;
      border-bottom: 1px solid rgba(0,0,0,0.10);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .topbar-left  { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-right { display: flex; align-items: center; gap: 0.5rem; }

    /* Hamburger */
    .hamburger-btn {
      width: 34px; height: 34px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.10);
      background: transparent;
      color: #475569;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
    }
    .hamburger-btn:hover { background: #F8FAFC; border-color: rgba(0,0,0,0.15); }
    @media (min-width: 1024px) { .hamburger-btn { display: none; } }

    /* Page tab chip */
    .page-tab {
      display: flex; align-items: center; gap: 0.55rem;
      padding: 0.4rem 0.875rem 0.4rem 0.5rem;
      background: #EAF2FF;
      border: 1px solid rgba(37,99,235,0.30);
      border-radius: 9px;
    }
    .page-tab-icon {
      width: 26px; height: 26px;
      background: #227CFF;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .page-tab-icon .pi { color: #fff; font-size: 0.78rem; }
    .page-tab-label { font-size: 0.845rem; font-weight: 600; color: #1A6FE8; }

    /* Nuevo suministro button */
    .new-btn {
      display: inline-flex; align-items: center; gap: 0.45rem;
      padding: 0.45rem 1rem;
      border: 1px solid rgba(0,0,0,0.15);
      border-radius: 8px;
      background: #FFFFFF;
      color: #475569;
      font-size: 0.82rem; font-weight: 500;
      text-decoration: none;
      transition: all 150ms ease;
      white-space: nowrap;
    }
    .new-btn .pi { font-size: 0.82rem; }
    .new-btn:hover {
      background: #EAF2FF;
      border-color: #227CFF;
      color: #1A6FE8;
    }
    @media (max-width: 640px) { .new-btn span { display: none; } }

    /* Icon buttons */
    .icon-btn {
      width: 34px; height: 34px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.10);
      background: transparent;
      color: #475569;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
    }
    .icon-btn:hover { background: #F8FAFC; border-color: rgba(0,0,0,0.15); color: #0F172A; }
    .icon-btn .pi { font-size: 0.88rem; }
    .icon-btn--danger:hover {
      background: #FEF2F2 !important;
      border-color: #EF4444 !important;
      color: #EF4444 !important;
    }

    /* Divider */
    .vdivider { width: 1px; height: 22px; background: rgba(0,0,0,0.12); margin: 0 0.125rem; }

    /* User area */
    .user-area {
      display: flex; align-items: center; gap: 0.55rem;
      padding: 0 0.2rem; cursor: pointer;
      position: relative;
    }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: #16A34A;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .chev { font-size: 0.6rem; color: #94A3B8; transition: transform 150ms ease; }
    .chev-open { transform: rotate(180deg); }

    /* Dropdown */
    .user-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      min-width: 200px;
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.10);
      z-index: 200;
      overflow: hidden;
    }
    .dropdown-info {
      padding: 0.75rem 1rem;
      display: flex; flex-direction: column; gap: 2px;
    }
    .di-name  { font-size: 0.82rem; font-weight: 600; color: #0F172A; }
    .di-email { font-size: 0.72rem; color: #94A3B8; }
    .dropdown-divider { height: 1px; background: rgba(0,0,0,0.08); }
    .dropdown-item {
      display: flex; align-items: center; gap: 0.6rem;
      width: 100%; padding: 0.7rem 1rem;
      background: none; border: none; cursor: pointer;
      font-size: 0.82rem; font-weight: 500;
      text-align: left; transition: background 120ms ease;
      font-family: inherit;
    }
    .dropdown-item .pi { font-size: 0.85rem; }
    .dropdown-item--danger { color: #DC2626; }
    .dropdown-item--danger:hover { background: #FEF2F2; }

    /* Notification bell wrap */
    .notif-wrap {
      position: relative;
    }
    .icon-btn { position: relative; }
    .notif-badge {
      position: absolute;
      top: -4px; right: -4px;
      background: #EF4444; color: #fff;
      font-size: 0.6rem; font-weight: 700;
      min-width: 16px; height: 16px;
      border-radius: 999px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 3px;
      border: 2px solid #FFFFFF;
      line-height: 1;
    }

    /* Notification dropdown */
    .notif-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 340px;
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      z-index: 200;
      overflow: hidden;
    }
    .notif-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1rem 0.75rem;
      border-bottom: 1px solid rgba(0,0,0,0.07);
    }
    .notif-head-title { font-size: 0.875rem; font-weight: 700; color: #0F172A; }
    .notif-count {
      background: #EF4444; color: #fff;
      font-size: 0.68rem; font-weight: 700;
      padding: 0.1rem 0.45rem; border-radius: 999px;
    }
    .notif-list { max-height: 360px; overflow-y: auto; }
    .notif-item {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      transition: background 120ms ease;
      position: relative; cursor: pointer;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: #F8FAFC; }
    .notif-unread { background: #F0F6FF; }
    .notif-unread:hover { background: #E8F0FE; }
    .notif-icon-wrap {
      width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .notif-icon-wrap--info    { background: #EAF2FF; color: #227CFF; }
    .notif-icon-wrap--success { background: rgba(22,163,74,0.10); color: #16A34A; }
    .notif-icon-wrap--warning { background: rgba(217,119,6,0.10);  color: #D97706; }
    .notif-icon-wrap--danger  { background: rgba(220,38,38,0.09);  color: #DC2626; }
    .notif-icon-wrap .pi { font-size: 0.85rem; }
    .notif-body { flex: 1; min-width: 0; }
    .notif-title { font-size: 0.8rem; font-weight: 600; color: #0F172A; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-desc  { font-size: 0.72rem; color: #64748B; margin: 0 0 4px; line-height: 1.4; }
    .notif-time  { font-size: 0.68rem; color: #94A3B8; }
    .notif-dot {
      position: absolute; top: 0.875rem; right: 0.75rem;
      width: 7px; height: 7px; border-radius: 50%;
      background: #227CFF; flex-shrink: 0;
    }
    .notif-foot {
      padding: 0.625rem 1rem;
      border-top: 1px solid rgba(0,0,0,0.07);
    }
    .notif-foot-btn {
      width: 100%; padding: 0.5rem;
      background: none; border: none; cursor: pointer;
      font-size: 0.78rem; font-weight: 600; color: #227CFF;
      font-family: inherit; text-align: center;
      border-radius: 6px; transition: background 120ms ease;
    }
    .notif-foot-btn:hover { background: #EAF2FF; }

    @media (max-width: 640px) { .chev { display: none; } .notif-dropdown { width: 300px; right: -60px; } }
  `]
})
export class HeaderComponent {
  @Output() openSidebar = new EventEmitter<void>();

  auth           = inject(AuthService);
  private router = inject(Router);
  dropdownOpen   = signal(false);
  notifsOpen     = signal(false);

  notifications = [
    { id: 1,  type: 'info',    icon: 'pi-file-check', title: 'Nuevo suministro añadido',        desc: 'El suministro #1042 ha sido registrado correctamente.',  time: 'Hace 5 min',   unread: true  },
    { id: 2,  type: 'success', icon: 'pi-check-circle', title: 'Comparación completada',         desc: 'Se ha finalizado la comparación de tarifas para cliente.', time: 'Hace 18 min',  unread: true  },
    { id: 3,  type: 'warning', icon: 'pi-exclamation-triangle', title: 'Tarifa próxima a vencer', desc: 'La tarifa 2.0TD expira en 7 días. Revisa el contrato.',   time: 'Hace 1 h',     unread: true  },
    { id: 4,  type: 'danger',  icon: 'pi-times-circle', title: 'Error en importación',           desc: 'No se pudo importar el archivo de suministros masivo.',   time: 'Hace 2 h',     unread: false },
    { id: 5,  type: 'info',    icon: 'pi-users',        title: 'Nuevo usuario registrado',       desc: 'María García se ha unido al portal como agente.',         time: 'Hace 3 h',     unread: false },
    { id: 6,  type: 'success', icon: 'pi-bolt',         title: 'Servicio activado',              desc: 'El servicio de luz para contrato #872 está activo.',      time: 'Hace 5 h',     unread: false },
    { id: 7,  type: 'info',    icon: 'pi-chart-bar',    title: 'Reporte semanal disponible',     desc: 'El resumen de comparaciones de esta semana está listo.',  time: 'Hace 8 h',     unread: false },
    { id: 8,  type: 'warning', icon: 'pi-clock',        title: 'Suministro pendiente',           desc: 'El suministro #998 lleva 3 días sin confirmación.',       time: 'Ayer 16:30',   unread: false },
    { id: 9,  type: 'success', icon: 'pi-check-circle', title: 'Tarifa publicada',               desc: 'La tarifa PVPC Indexada 3.0TD ya está disponible.',       time: 'Ayer 12:00',   unread: false },
    { id: 10, type: 'info',    icon: 'pi-info-circle',  title: 'Mantenimiento programado',       desc: 'El sistema estará en mantenimiento el domingo a las 2h.', time: 'Hace 2 días',  unread: false },
  ];

  toggleDropdown(e: Event) {
    e.stopPropagation();
    this.notifsOpen.set(false);
    this.dropdownOpen.update(v => !v);
  }

  toggleNotifs(e: Event) {
    e.stopPropagation();
    this.dropdownOpen.set(false);
    this.notifsOpen.update(v => !v);
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.dropdownOpen.set(false);
    this.notifsOpen.set(false);
  }

  private pageMap: Record<string, { title: string; icon: string }> = {
    '/dashboard':          { title: 'Panel de control', icon: 'pi-microsoft' },
    '/users':              { title: 'Usuarios',         icon: 'pi-users' },
    '/services':           { title: 'Servicios',        icon: 'pi-bolt' },
    '/comparison-history': { title: 'Comparaciones',   icon: 'pi-chart-bar' },
    '/supplies':           { title: 'Suministros',      icon: 'pi-file-check' },
  };

  getPageTitle(): string {
    return this.pageMap[this.router.url]?.title ?? 'Portal Admin';
  }

  getPageIcon(): string {
    return this.pageMap[this.router.url]?.icon ?? 'pi-home';
  }

  getInitial(): string {
    const user = this.auth.currentUser();
    if (user?.name)  return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  }
}
