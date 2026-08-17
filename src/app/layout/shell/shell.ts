import { Component, signal, inject, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="shell">
      <!-- Fixed sidebar — desktop only -->
      <app-sidebar class="fixed-sidebar" />

      <!-- Mobile/tablet drawer -->
      @if (drawerOpen()) {
        <div class="drawer-backdrop" (click)="closeSidebar()"></div>
      }
      <div class="drawer-sidebar" [class.drawer-open]="drawerOpen()">
        <app-sidebar [showClose]="true" (closeSidebar)="closeSidebar()" />
      </div>

      <!-- Main content area -->
      <div class="shell-main">
        <app-header (openSidebar)="openSidebar()" />
        <main class="main-content">
          <div class="content-wrap">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      background: #FFFFFF;
      color-scheme: light;
    }

    /* ── Fixed sidebar (desktop ≥1024px) ── */
    .fixed-sidebar {
      display: none;
      flex-shrink: 0;
    }

    /* ── Drawer (mobile/tablet <1024px) ── */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 199;
      animation: fadeIn 150ms ease;
    }
    .drawer-sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 260px;
      z-index: 200;
      transform: translateX(-100%);
      transition: transform 200ms ease;
    }
    .drawer-sidebar.drawer-open {
      transform: translateX(0);
    }

    /* ── Main content ── */
    .shell-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .main-content {
      flex: 1;
      overflow-x: hidden;
      overflow-y: auto;
      background: #FFFFFF;
    }
    .content-wrap {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2.5rem 1.25rem;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ── Desktop: show fixed sidebar ── */
    @media (min-width: 1024px) {
      .fixed-sidebar { display: block; }
      .drawer-sidebar { display: none; }
      .drawer-backdrop { display: none; }
      .content-wrap { padding: 2.5rem 2.5rem; }
    }
  `]
})
export class ShellComponent {
  drawerOpen = signal(false);

  openSidebar()  { this.drawerOpen.set(true); }
  closeSidebar() { this.drawerOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { this.drawerOpen.set(false); }
}
