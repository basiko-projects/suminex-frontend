import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ServicesService } from '../../core/services/services.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ComparisonHistoryService } from '../../core/services/comparison-history.service';
import { SkeletonModule } from 'primeng/skeleton';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend: string;
  trendUp: boolean;
  colorClass: string; // 'blue' | 'green' | 'amber' | 'purple'
  route: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SkeletonModule, DatePipe],
  template: `
    <div class="dashboard">

      <!-- Page header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-sub">{{ today | date:'EEEE, d MMMM yyyy' }}</p>
        </div>
      </div>

      <!-- Stat cards -->
      @if (loading()) {
        <div class="stats-grid">
          @for (i of [1,2,3,4]; track i) {
            <p-skeleton height="104px" borderRadius="12px" />
          }
        </div>
      } @else {
        <div class="stats-grid">
          @for (card of statCards; track card.route) {
            <a [routerLink]="card.route" class="stat-card" [class]="'stat-card stat-card--' + card.colorClass">
              <div class="stat-inner">
                <div class="stat-icon-box">
                  <i [class]="'pi ' + card.icon"></i>
                </div>
                <div class="stat-body">
                  <span class="stat-value">{{ card.value }}</span>
                  <span class="stat-label">{{ card.title }}</span>
                </div>
                <span class="trend-badge" [class.trend-up]="card.trendUp" [class.trend-down]="!card.trendUp">
                  <i [class]="'pi ' + (card.trendUp ? 'pi-arrow-up' : 'pi-arrow-down')"></i>
                  {{ card.trend }}
                </span>
              </div>
            </a>
          }
        </div>
      }

      <!-- Quick actions -->
      <div class="section">
        <h2 class="section-title">Acciones rápidas</h2>
        <div class="actions-grid">
          @for (a of quickActions; track a.route) {
            <a [routerLink]="a.route" class="action-card" [class]="'action-card action-card--' + a.colorClass">
              <div class="action-icon">
                <i [class]="'pi ' + a.icon"></i>
              </div>
              <div class="action-info">
                <span class="action-title">{{ a.title }}</span>
                <span class="action-desc">{{ a.desc }}</span>
              </div>
              <i class="pi pi-chevron-right action-arrow"></i>
            </a>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .dashboard { max-width: 1280px; }

    .page-header {
      margin-bottom: 1.75rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--sx-border);
    }
    .page-title {
      font-size: 1.6rem;
      font-weight: 600;
      color: var(--sx-text);
      margin: 0 0 0.25rem;
    }
    .page-sub { font-size: 0.85rem; color: var(--sx-text-2); margin: 0; }

    /* ── Stat grid ── */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    @media (min-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(4, 1fr); }
    }

    .stat-card {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 12px;
      text-decoration: none;
      padding: 1.25rem;
      display: block;
      transition: all 150ms ease;
    }
    .stat-card:hover {
      border-color: var(--sx-primary);
      box-shadow: var(--sx-shadow-lg);
      transform: translateY(-2px);
    }
    .stat-inner { display: flex; align-items: flex-start; gap: 1rem; }
    .stat-icon-box {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-box .pi { font-size: 1.2rem; }
    .stat-body { flex: 1; }
    .stat-value { display: block; font-size: 1.85rem; font-weight: 700; color: var(--sx-text); line-height: 1; margin-bottom: 0.3rem; }
    .stat-label { font-size: 0.78rem; color: var(--sx-text-2); font-weight: 500; }

    /* Trend badge */
    .trend-badge {
      display: flex; align-items: center; gap: 3px;
      font-size: 0.72rem; font-weight: 600; border-radius: 999px;
      padding: 0.2rem 0.55rem; white-space: nowrap; flex-shrink: 0;
    }
    .trend-badge .pi { font-size: 0.6rem; }
    .trend-up   { background: var(--sx-green-bg);  color: var(--sx-green); }
    .trend-down { background: var(--sx-red-bg);    color: var(--sx-red); }

    /* Color variants for icon boxes */
    .stat-card--blue   .stat-icon-box { background: rgba(61,142,255,0.12); color: #3D8EFF; }
    .stat-card--green  .stat-icon-box { background: var(--sx-green-bg);    color: var(--sx-green); }
    .stat-card--amber  .stat-icon-box { background: var(--sx-amber-bg);    color: var(--sx-amber); }
    .stat-card--purple .stat-icon-box { background: rgba(167,139,250,0.12); color: #A78BFA; }

    /* ── Section ── */
    .section { margin-bottom: 2rem; }
    .section-title {
      font-size: 0.9rem; font-weight: 600; color: var(--sx-text-2);
      text-transform: uppercase; letter-spacing: 0.06em;
      margin: 0 0 1rem;
    }

    /* ── Quick actions ── */
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.625rem;
    }
    @media (min-width: 768px) {
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .action-card {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.125rem;
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 12px;
      text-decoration: none;
      transition: all 150ms ease;
    }
    .action-card:hover {
      background: var(--sx-surface-2);
      border-color: var(--sx-primary);
      transform: translateX(3px);
    }
    .action-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .action-icon .pi { font-size: 1rem; }
    .action-info { flex: 1; }
    .action-title { display: block; font-size: 0.875rem; font-weight: 600; color: var(--sx-text); }
    .action-desc  { font-size: 0.75rem; color: var(--sx-text-2); }
    .action-arrow { font-size: 0.7rem; color: var(--sx-text-3); transition: transform 150ms ease; }
    .action-card:hover .action-arrow { transform: translateX(3px); color: var(--sx-primary-text); }

    /* Action color variants */
    .action-card--blue   .action-icon { background: rgba(61,142,255,0.12); color: #3D8EFF; }
    .action-card--purple .action-icon { background: rgba(167,139,250,0.12); color: #A78BFA; }
    .action-card--amber  .action-icon { background: var(--sx-amber-bg);     color: var(--sx-amber); }
    .action-card--green  .action-icon { background: var(--sx-green-bg);     color: var(--sx-green); }
  `]
})
export class DashboardComponent implements OnInit {
  private services    = inject(ServicesService);
  private supplies    = inject(SuppliesService);
  private comparisons = inject(ComparisonHistoryService);

  loading = signal(true);
  today   = new Date();
  statCards: StatCard[] = [];

  quickActions = [
    { title: 'Nueva oferta',    desc: 'Crear tarifa de luz, gas o internet',  icon: 'pi-bolt',       colorClass: 'purple', route: '/services' },
    { title: 'Usuarios',        desc: 'Gestionar usuarios de la plataforma',  icon: 'pi-users',      colorClass: 'blue',   route: '/users' },
    { title: 'Comparaciones',   desc: 'Ver actividad reciente de usuarios',   icon: 'pi-chart-bar',  colorClass: 'amber',  route: '/comparison-history' },
    { title: 'Suministros',     desc: 'Gestionar contratos activos',          icon: 'pi-file-check', colorClass: 'green',  route: '/supplies' },
  ];

  ngOnInit() {
    forkJoin({
      services:    this.services.getServices(),
      supplies:    this.supplies.getAll({ pageSize: 1 }),
      comparisons: this.comparisons.getAll({ pageSize: 1 }),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        const totalTarifas = data.services.reduce((acc, g) => acc + (g.tariffs?.length ?? 0), 0);
        this.statCards = [
          { title: 'Tarifas',           value: totalTarifas,                                 icon: 'pi-bolt',       trend: '+5%', trendUp: true,  colorClass: 'purple', route: '/services' },
          { title: 'Suministros',       value: data.supplies.totalCount ?? 0,               icon: 'pi-file-check', trend: '+8%', trendUp: true,  colorClass: 'green',  route: '/supplies' },
          { title: 'Comparaciones',     value: data.comparisons.totalCount ?? 0,             icon: 'pi-chart-bar',  trend: '-3%', trendUp: false, colorClass: 'amber',  route: '/comparison-history' },
        ];
      },
      error: () => {}
    });
  }
}
