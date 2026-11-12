import { Component, inject, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FiscalProfileDialogService } from '../../shared/services/fiscal-profile-dialog.service';
import { Icon, IconName } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './header.html',
})
export class HeaderComponent {
  @Output() openSidebar = new EventEmitter<void>();

  auth           = inject(AuthService);
  profileDialog  = inject(FiscalProfileDialogService);
  private router = inject(Router);
  dropdownOpen   = signal(false);
  notifsOpen     = signal(false);

  notifications: { id: number; type: string; icon: IconName; title: string; desc: string; time: string; unread: boolean }[] = [

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

  private pageMap: Record<string, { title: string; icon: IconName }> = {
    '/dashboard':          { title: 'Panel de control', icon: 'arrows-pointing-in' },
    '/users':              { title: 'Usuarios',         icon: 'users' },
    '/services':           { title: 'Servicios',        icon: 'bolt' },
    '/comparison-history': { title: 'Comparaciones',   icon: 'chart-bar' },
    '/supplies':           { title: 'Suministros',      icon: 'document-check' },
    '/new-supply':         { title: 'Nuevo suministro', icon: 'document-plus' },
    '/comparator':         { title: 'Comparador',       icon: 'arrow-path' },
    '/billing':            { title: 'Facturación',      icon: 'banknotes' },
    '/providers':          { title: 'Proveedores',      icon: 'building-storefront' },
    '/stats':              { title: 'Estadísticas',     icon: 'chart-pie' },
  };

  /** '/services/tarifas/:id' no tiene entrada exacta en pageMap (id dinámico) — cae en el mismo grupo que '/services' */
  private currentPageEntry(): { title: string; icon: IconName } | undefined {
    const url = this.router.url;
    if (this.pageMap[url]) return this.pageMap[url];
    if (url.startsWith('/services/tarifas')) return this.pageMap['/services'];
    return undefined;
  }

  getPageTitle(): string {
    return this.currentPageEntry()?.title ?? 'Portal Admin';
  }

  getPageIcon(): IconName {
    return this.currentPageEntry()?.icon ?? 'home';
  }

  getInitial(): string {
    const user = this.auth.currentUser();
    if (user?.name)  return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  }

  notifItemClasses(unread: boolean): string {
    const base = 'flex items-start gap-3 py-3 px-4 border-b border-black/5 last:border-b-0 transition-colors relative cursor-pointer';
    return unread ? `${base} bg-[#F0F6FF] hover:bg-[#E8F0FE]` : `${base} hover:bg-[#F8FAFC]`;
  }

  notifIconWrapClasses(type: string): string {
    const base = 'w-8.5 h-8.5 rounded-lg shrink-0 flex items-center justify-center';
    const variants: Record<string, string> = {
      info:    'bg-[#EAF2FF] text-[#227CFF]',
      success: 'bg-[#16A34A]/10 text-[#16A34A]',
      warning: 'bg-[#D97706]/10 text-[#D97706]',
      danger:  'bg-[#DC2626]/[0.09] text-[#DC2626]',
    };
    return `${base} ${variants[type] ?? variants['info']}`;
  }
}
