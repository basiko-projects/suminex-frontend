import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SkeletonModule } from 'primeng/skeleton';
import { AuthService } from '../../core/services/auth.service';
import { ServicesService } from '../../core/services/services.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ComparisonHistoryService } from '../../core/services/comparison-history.service';

interface StatCard {
  label:    string;
  value:    number;
  icon:     string;
  trend:    string;
  trendUp:  boolean;
}

interface QuickAction {
  title:    string;
  subtitle: string;
  icon:     string;
  route:    string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SkeletonModule],
  template: `
    <div class="dash">

      <!-- Greeting -->
      <div class="greeting-section">
        <h1 class="greeting-title">Hola, {{ userName() }}</h1>
        <p class="greeting-sub">Bienvenido a Suminex</p>
      </div>

      <!-- Stat cards -->
      @if (loading()) {
        <div class="stats-row">
          @for (i of [1,2,3]; track i) {
            <div class="stat-card"><p-skeleton height="108px" borderRadius="16px" /></div>
          }
        </div>
      } @else {
        <div class="stats-row">
          @for (s of statCards(); track s.label) {
            <div class="stat-card">
              <div class="stat-top">
                <div class="stat-icon">
                  <i [class]="'pi ' + s.icon"></i>
                </div>
                <span class="pill" [class.pill-green]="s.trendUp" [class.pill-red]="!s.trendUp">
                  <i class="pi" [class.pi-arrow-up]="s.trendUp" [class.pi-arrow-down]="!s.trendUp"></i>
                  {{ s.trend }}
                </span>
              </div>
              <span class="stat-val">{{ s.value }}</span>
              <span class="stat-lbl">{{ s.label }}</span>
            </div>
          }
        </div>
      }

      <!-- Quick actions -->
      <h2 class="section-title">Acciones rápidas</h2>
      <div class="actions-grid">
        @for (a of quickActions; track a.title) {
          <a [routerLink]="a.route" class="action-card">
            <div class="action-icon">
              <i [class]="'pi ' + a.icon"></i>
            </div>
            <div class="action-body">
              <span class="action-title">{{ a.title }}</span>
              <span class="action-sub">{{ a.subtitle }}</span>
            </div>
            <span class="action-chevron"><i class="pi pi-chevron-right"></i></span>
          </a>
        }
      </div>

    </div>
  `,
  styles: [`
    .dash { max-width: 1200px; }

    /* ── Greeting ── */
    .greeting-section { margin-bottom: 1.75rem; }
    .greeting-title {
      font-size: 2.1rem; font-weight: 700;
      color: var(--sx-text); margin: 0 0 0.3rem;
      letter-spacing: -0.025em; line-height: 1.15;
    }
    .greeting-sub { font-size: 0.9rem; color: var(--sx-text-2); margin: 0; }

    /* ── Stat cards ── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.1rem; margin-bottom: 2.25rem;
    }
    @media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .stats-row { grid-template-columns: 1fr; } }

    .stat-card {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 14px; padding: 1.35rem 1.5rem 1.5rem;
      display: flex; flex-direction: column;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .stat-card:hover { border-color: var(--sx-border-2); box-shadow: var(--sx-shadow); }

    .stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1rem; }
    .stat-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: var(--sx-surface-2); color: var(--sx-text-2);
      border: 1px solid var(--sx-border);
    }
    .stat-icon .pi { font-size: 1rem; }

    .stat-val {
      font-size: 2.2rem; font-weight: 700; color: var(--sx-text);
      line-height: 1; letter-spacing: -0.02em; margin-bottom: 0.4rem;
    }
    .stat-lbl { font-size: 0.85rem; color: var(--sx-text-2); font-weight: 500; }

    .pill {
      display: inline-flex; align-items: center; gap: 3px;
      border-radius: 6px; font-size: 0.76rem; font-weight: 600;
      padding: 0.2rem 0.5rem; white-space: nowrap;
    }
    .pill .pi { font-size: 0.6rem; }
    .pill-green { background: var(--sx-green-bg); color: var(--sx-green); }
    .pill-red   { background: var(--sx-red-bg); color: var(--sx-red); }

    /* ── Quick actions ── */
    .section-title {
      font-size: 0.78rem; font-weight: 700; color: var(--sx-text-2);
      text-transform: uppercase; letter-spacing: 0.06em;
      margin: 0 0 1rem;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    @media (max-width: 720px) { .actions-grid { grid-template-columns: 1fr; } }

    .action-card {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 14px; padding: 1.25rem 1.4rem;
      display: flex; align-items: center; gap: 1rem;
      text-decoration: none; transition: all 150ms ease;
    }
    .action-card:hover {
      border-color: var(--sx-border-2);
      box-shadow: var(--sx-shadow);
    }
    .action-card:hover .action-chevron { color: var(--sx-primary); transform: translateX(2px); }
    .action-icon {
      width: 44px; height: 44px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: var(--sx-surface-2); color: var(--sx-text-2);
      border: 1px solid var(--sx-border);
    }
    .action-icon .pi { font-size: 1.05rem; }
    .action-body { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 0; }
    .action-title { font-size: 1rem; font-weight: 700; color: var(--sx-text); }
    .action-sub { font-size: 0.82rem; color: var(--sx-text-2); }
    .action-chevron {
      color: var(--sx-text-3); font-size: 0.85rem; flex-shrink: 0;
      transition: all 150ms ease;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private services    = inject(ServicesService);
  private supplies    = inject(SuppliesService);
  private comparisons = inject(ComparisonHistoryService);
  auth = inject(AuthService);

  loading = signal(true);

  totalSupplies    = 0;
  totalComparisons = 0;
  totalTarifas     = 0;

  userName = computed(() => this.auth.currentUser()?.name || 'Administrador');

  statCards = computed<StatCard[]>(() => [
    { label: 'Tarifas',       value: this.totalTarifas,     icon: 'pi-bolt',       trend: '+5%', trendUp: true },
    { label: 'Suministros',   value: this.totalSupplies,    icon: 'pi-file-check', trend: '+8%', trendUp: true },
    { label: 'Comparaciones', value: this.totalComparisons, icon: 'pi-chart-bar',  trend: '-3%', trendUp: false },
  ]);

  quickActions: QuickAction[] = [
    { title: 'Nueva oferta',   subtitle: 'Crear tarifa de luz, gas o internet', icon: 'pi-bolt',       route: '/services' },
    { title: 'Usuarios',       subtitle: 'Gestionar usuarios de la plataforma', icon: 'pi-users',      route: '/users' },
    { title: 'Comparaciones',  subtitle: 'Ver actividad reciente de usuarios',  icon: 'pi-chart-bar',  route: '/comparison-history' },
    { title: 'Suministros',    subtitle: 'Gestionar contratos activos',        icon: 'pi-file-check', route: '/supplies' },
  ];

  ngOnInit() {
    forkJoin({
      services:    this.services.getServices(),
      supplies:    this.supplies.getAll({ pageSize: 1 }),
      comparisons: this.comparisons.getAll({ pageSize: 1 }),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.totalTarifas     = data.services.reduce((acc, g) => acc + (g.tariffs?.length ?? 0), 0);
        this.totalSupplies    = data.supplies.totalCount ?? 0;
        this.totalComparisons = data.comparisons.totalCount ?? 0;
      },
      error: () => {}
    });
  }
}
