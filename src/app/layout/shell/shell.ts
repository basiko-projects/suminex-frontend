import { Component, signal, inject, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';
import { FiscalProfileDialog } from '../../shared/components/fiscal-profile-dialog/fiscal-profile-dialog';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, FiscalProfileDialog],
  templateUrl: './shell.html',
})
export class ShellComponent {
  drawerOpen = signal(false);

  openSidebar()  { this.drawerOpen.set(true); }
  closeSidebar() { this.drawerOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { this.drawerOpen.set(false); }
}
