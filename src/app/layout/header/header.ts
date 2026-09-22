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
    { id: 1,  type: 'info',    icon: 'document-check', title: 'Nuevo suministro añadido',        desc: 'El suministro #1042 ha sido registrado correctamente.',  time: 'Hace 5 min',   unread: true  },
    { id: 2,  type: 'success', icon: 'check-circle', title: 'Comparación completada',         desc: 'Se ha finalizado la comparación de tarifas para cliente.', time: 'Hace 18 min',  unread: true  },
    { id: 3,  type: 'warning', icon: 'exclamation-triangle', title: 'Tarifa próxima a vencer', desc: 'La tarifa 2.0TD expira en 7 días. Revisa el contrato.',   time: 'Hace 1 h',     unread: true  },
    { id: 4,  type: 'danger',  icon: 'x-circle', title: 'Error en importación',           desc: 'No se pudo importar el archivo de suministros masivo.',   time: 'Hace 2 h',     unread: false },
    { id: 5,  type: 'info',    icon: 'users',        title: 'Nuevo usuario registrado',       desc: 'María García se ha unido al portal como agente.',         time: 'Hace 3 h',     unread: false },
    { id: 6,  type: 'success', icon: 'bolt',         title: 'Servicio activado',              desc: 'El servicio de luz para contrato #872 está activo.',      time: 'Hace 5 h',     unread: false },
    { id: 7,  type: 'info',    icon: 'chart-bar',    title: 'Reporte semanal disponible',     desc: 'El resumen de comparaciones de esta semana está listo.',  time: 'Hace 8 h',     unread: false },
    { id: 8,  type: 'warning', icon: 'clock',        title: 'Suministro pendiente',           desc: 'El suministro #998 lleva 3 días sin confirmación.',       time: 'Ayer 16:30',   unread: false },
    { id: 9,  type: 'success', icon: 'check-circle', title: 'Tarifa publicada',               desc: 'La tarifa PVPC Indexada 3.0TD ya está disponible.',       time: 'Ayer 12:00',   unread: false },
    { id: 10, type: 'info',    icon: 'information-circle',  title: 'Mantenimiento programado',       desc: 'El sistema estará en mantenimiento el domingo a las 2h.', time: 'Hace 2 días',  unread: false },
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
  };

  getPageTitle(): string {
    return this.pageMap[this.router.url]?.title ?? 'Portal Admin';
  }

  getPageIcon(): IconName {
    return this.pageMap[this.router.url]?.icon ?? 'home';
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
