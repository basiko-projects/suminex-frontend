import { Component, inject } from '@angular/core';
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
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  auth = inject(AuthService);

  commercialItems: NavItem[] = [
    { label: 'Panel de control',  icon: 'pi-microsoft',  route: '/dashboard' },
    { label: 'Suministros',       icon: 'pi-file-check', route: '/supplies' },
    { label: 'Nuevo suministro',  icon: 'pi-user-plus',  route: '/new-supply' },
    { label: 'Comparador',       icon: 'pi-calculator', route: '/comparator' },
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

  navItemClasses(isActive: boolean): string {
    const base = 'group flex items-center gap-2.5 pr-2 pl-4 h-8 rounded text-xs no-underline transition-all';
    return isActive
      ? `${base} bg-[#4375FF]/10 text-black font-semibold`
      : `${base} text-[#5B5B5B] font-medium hover:bg-[#EBEBEB] hover:text-[#0F172A]`;
  }

  navIconClasses(isActive: boolean): string {
    return isActive ? 'text-[0.85rem] text-[#4375FF]' : 'text-[0.85rem] text-black/30 group-hover:text-[#0F172A]';
  }

  navBadgeClasses(isActive: boolean): string {
    const base = 'inline-flex items-center justify-center rounded-full text-[0.68rem] font-bold min-w-5 py-0.5 px-2 leading-[1.4]';
    return isActive ? `${base} bg-[#227CFF] text-white` : `${base} bg-[#EFF6FF] text-[#1A6FE8]`;
  }
}
