import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';
import { PopoverModule } from 'primeng/popover';
import { StatsService } from '../../core/services/stats.service';
import { DashboardKpi, DashboardTimeseriesPoint, StatsGroupBy } from '../../core/models/stats.model';

interface KpiDisplay { hasData: boolean; pct: number; arrowUp: boolean; good: boolean; }

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

function toDateParam(d: Date): string { return d.toISOString().split('T')[0]; }
function pad2(n: number): string { return String(n).padStart(2, '0'); }

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SkeletonModule, FormsModule, DatePickerModule, PopoverModule],
  template: `
    <div class="dash">

      <!-- Greeting -->
      <div class="greeting-section">
        <h1 class="greeting-title">Estadísticas</h1>
        <p class="greeting-sub">Analiza la actividad de la plataforma</p>
      </div>

      @if (loadError) {
        <div class="load-error-banner">
          <i class="pi pi-exclamation-circle"></i>
          <span>{{ loadError }}</span>
          <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
        </div>
      }

      <!-- Period filter -->
      <div class="periods-bar">
        @for (p of periods; track p.key) {
          @if (p.key === 'custom') {
            <button class="period-btn" [class.active]="activePeriod() === 'custom'"
                    (click)="customPop.toggle($event)">{{ p.label }}</button>
          } @else {
            <button class="period-btn" [class.active]="activePeriod() === p.key"
                    (click)="onPeriodChange(p.key)">{{ p.label }}</button>
          }
        }
      </div>

      <p-popover #customPop>
        <div class="filter-pop filter-pop-dates">
          <span class="filter-pop-title">Rango personalizado</span>
          <p-datepicker [(ngModel)]="customFrom" placeholder="Desde" dateFormat="dd/mm/yy" [showIcon]="true" />
          <p-datepicker [(ngModel)]="customTo"   placeholder="Hasta" dateFormat="dd/mm/yy" [showIcon]="true" />
          <div class="filter-pop-actions">
            <button type="button" class="btn-clear-sm" (click)="customPop.hide()">Cancelar</button>
            <button type="button" class="btn-apply-sm" (click)="applyCustomRange(); customPop.hide()">Aplicar</button>
          </div>
        </div>
      </p-popover>

      <!-- Stat cards -->
      @if (loading()) {
        <div class="stats-row">
          @for (i of [1,2,3]; track i) {
            <div class="stat-card"><p-skeleton height="108px" borderRadius="14px" /></div>
          }
        </div>
      } @else {
        <div class="stats-row">

          <div class="stat-card">
            <span class="stat-lbl">Suministros gestionados</span>
            <span class="stat-val">{{ totalSupplies }}</span>
            <div class="stat-foot">
              @if (suppliesTrend.hasData) {
                <span class="pill" [class.pill-green]="suppliesTrend.good" [class.pill-red]="!suppliesTrend.good">
                  <i class="pi" [class.pi-arrow-up]="suppliesTrend.arrowUp" [class.pi-arrow-down]="!suppliesTrend.arrowUp"></i> {{ suppliesTrend.pct }}%
                </span>
                <span class="pill-desc">Vs. período anterior</span>
              } @else {
                <span class="pill-desc">Sin datos del período anterior</span>
              }
            </div>
          </div>

          <div class="stat-card">
            <span class="stat-lbl">Avg. order value</span>
            <span class="stat-val">{{ avgOrderValue | currency:'EUR':'symbol':'1.2-2' }}</span>
            <div class="stat-foot">
              @if (avgOrderTrend.hasData) {
                <span class="pill" [class.pill-green]="avgOrderTrend.good" [class.pill-red]="!avgOrderTrend.good">
                  <i class="pi" [class.pi-arrow-up]="avgOrderTrend.arrowUp" [class.pi-arrow-down]="!avgOrderTrend.arrowUp"></i>
                  {{ avgOrderDiffAbs | currency:'EUR':'symbol':'1.0-0' }}
                </span>
                <span class="pill-desc">Vs. período anterior</span>
              } @else {
                <span class="pill-desc">Sin datos del período anterior</span>
              }
            </div>
          </div>

          <div class="stat-card">
            <span class="stat-lbl">Facturación disponible</span>
            <span class="stat-val stat-val--soon">Próximamente</span>
            <div class="stat-foot">
              <span class="pill-desc">Aún no disponible desde el backend</span>
            </div>
          </div>

        </div>
      }

      <!-- Bottom: chart + side actions -->
      <div class="bottom-grid">

        <!-- Line chart -->
        <div class="chart-card">
          <div class="chart-head">
            <span class="chart-title">Evolución</span>
            <div class="chart-legend">
              <button class="legend-item" [class.dim]="!showSupplies" (click)="showSupplies = !showSupplies">
                <span class="legend-dot legend-dot--blue"></span> Suministros creados
              </button>
              <button class="legend-item" [class.dim]="!showComparisons" (click)="showComparisons = !showComparisons">
                <span class="legend-dot legend-dot--green"></span> Comparaciones
              </button>
            </div>
            <span class="chart-range">{{ chartRangeLabel }}</span>
          </div>

          @if (loading()) {
            <p-skeleton height="196px" borderRadius="10px" />
          } @else if (chart.n === 0) {
            <div class="chart-empty"><i class="pi pi-chart-line"></i> Sin datos para este período</div>
          } @else {
            <svg viewBox="0 0 560 196" width="100%" class="chart-svg">
              <defs>
                <linearGradient id="areaGradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stop-color="#227CFF" stop-opacity="0.16"/>
                  <stop offset="100%" stop-color="#227CFF" stop-opacity="0.01"/>
                </linearGradient>
                <linearGradient id="areaGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stop-color="#16A34A" stop-opacity="0.14"/>
                  <stop offset="100%" stop-color="#16A34A" stop-opacity="0.01"/>
                </linearGradient>
              </defs>

              <!-- Horizontal grid lines + Y labels -->
              @for (g of chart.gridLabels; track g.y) {
                <line [attr.x1]="44" [attr.y1]="g.y" x2="530" [attr.y2]="g.y" stroke="#e2e8f0" stroke-width="0.8"/>
                <text x="40" [attr.y]="g.y + 3" text-anchor="end" font-size="9" fill="#94a3b8">{{ g.value }}</text>
              }

              <!-- Supplies series -->
              @if (chart.suppliesArea) {
                <path [attr.d]="chart.suppliesArea" fill="url(#areaGradBlue)"/>
                <path [attr.d]="chart.suppliesPath" fill="none" stroke="#227CFF" stroke-width="2" stroke-linecap="round"/>
              }
              <!-- Comparisons series -->
              @if (chart.comparisonsArea) {
                <path [attr.d]="chart.comparisonsArea" fill="url(#areaGradGreen)"/>
                <path [attr.d]="chart.comparisonsPath" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round"/>
              }

              <!-- X-axis labels -->
              @for (xl of chart.xLabels; track xl.x) {
                <text [attr.x]="xl.x" y="178" text-anchor="middle" font-size="9" fill="#94a3b8">{{ xl.label }}</text>
              }
            </svg>
          }
        </div>

        <!-- Right column -->
        <div class="right-col">

          <!-- Incidencias -->
          <div class="card-incid">
            <p class="ci-title">Revisar incidencias</p>
            <p class="ci-sub">Analiza que tus suministros están optimizados</p>
            <a routerLink="/comparison-history" class="btn-blue">Ver incidencias</a>
          </div>

          <!-- Dark promo -->
          <div class="card-dark">
            <p class="cd-title">Dar de alta nuevo suministro</p>
            <p class="cd-sub">Analiza que tus suministros están optimizados</p>
            <a routerLink="/supplies" class="btn-blue">Nuevo suministro</a>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .dash { max-width: 1200px; }

    /* ── Greeting ── */
    .greeting-section { margin-bottom: 1.5rem; }
    .greeting-title {
      font-size: 2.25rem; font-weight: 700;
      color: #0F172A; margin: 0 0 0.25rem;
      letter-spacing: -0.025em; line-height: 1.15;
    }
    .greeting-sub { font-size: 0.875rem; color: #475569; margin: 0; }

    /* ── Error banner ── */
    .load-error-banner {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-radius: 10px;
      background: var(--sx-red-bg); border: 1px solid var(--sx-red);
      color: var(--sx-red); font-size: 0.85rem; margin-bottom: 1rem;
    }
    .load-error-retry {
      margin-left: auto; background: transparent; border: 1px solid var(--sx-red);
      color: var(--sx-red); border-radius: 6px; padding: 4px 10px;
      font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px;
    }

    /* Filter popover (rango personalizado) */
    .filter-pop { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.25rem; min-width: 200px; }
    .filter-pop-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sx-text-3); }
    .filter-pop-dates { min-width: 220px; }
    .filter-pop-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem; }
    .btn-clear-sm, .btn-apply-sm {
      padding: 6px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all 140ms ease;
    }
    .btn-clear-sm { background: transparent; border: 1px solid var(--sx-border); color: var(--sx-text-2); }
    .btn-clear-sm:hover { background: var(--sx-surface-2); }
    .btn-apply-sm { background: var(--sx-primary-btn); border: 1px solid var(--sx-primary-btn); color: #fff; }
    .btn-apply-sm:hover { background: var(--sx-primary); }

    /* ── Period filter ── */
    .periods-bar {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;
    }
    .period-btn {
      padding: 0.45rem 1.125rem;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.12);
      background: #FFFFFF;
      color: #475569;
      font-size: 0.845rem; font-weight: 500;
      cursor: pointer; transition: all 150ms ease;
      font-family: inherit;
    }
    .period-btn:hover { background: #F8FAFC; color: #0F172A; }
    .period-btn.active {
      background: #227CFF; border-color: #227CFF;
      color: #fff; font-weight: 600;
    }

    /* ── Stat cards ── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem; margin-bottom: 1.25rem;
    }

    .stat-card {
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 14px; padding: 1.25rem 1.375rem;
      display: flex; flex-direction: column;
    }
    .stat-lbl { font-size: 0.78rem; color: #94A3B8; font-weight: 500; margin-bottom: 0.625rem; }
    .stat-val {
      font-size: 2.5rem; font-weight: 700; color: #0F172A;
      line-height: 1; margin-bottom: 0.75rem; letter-spacing: -0.02em;
    }
    .stat-val--soon { font-size: 1.3rem; color: #94A3B8; letter-spacing: normal; }
    .stat-foot { display: flex; align-items: center; gap: 0.5rem; margin-top: auto; }

    .pill {
      display: inline-flex; align-items: center; gap: 3px;
      border-radius: 999px; font-size: 0.72rem; font-weight: 700;
      padding: 0.2rem 0.55rem; white-space: nowrap;
    }
    .pill .pi { font-size: 0.6rem; }
    .pill-green { background: rgba(22,163,74,0.1); color: #16A34A; }
    .pill-red   { background: rgba(220,38,38,0.1); color: #DC2626; }
    .pill-desc  { font-size: 0.72rem; color: #94A3B8; }

    /* ── Bottom grid ── */
    .bottom-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 1.25rem;
      align-items: stretch;
    }
    @media (max-width: 1100px) { .bottom-grid { grid-template-columns: 1fr; } }

    /* ── Chart card ── */
    .chart-card {
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 14px; padding: 1.25rem;
      display: flex; flex-direction: column;
    }
    .chart-head {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap;
    }
    .chart-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; }
    .chart-range { font-size: 0.78rem; color: #94A3B8; margin-left: auto; }
    .chart-svg   { display: block; }
    .chart-empty {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      height: 196px; color: #94A3B8; font-size: 0.85rem;
    }

    .chart-legend { display: flex; align-items: center; gap: 0.85rem; }
    .legend-item {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent; border: none; cursor: pointer;
      font-size: 0.78rem; font-weight: 500; color: #475569;
      font-family: inherit; padding: 0; transition: opacity 140ms ease;
    }
    .legend-item.dim { opacity: 0.4; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-dot--blue  { background: #227CFF; }
    .legend-dot--green { background: #16A34A; }

    /* ── Right column ── */
    .right-col { display: flex; flex-direction: column; gap: 1rem; }

    /* Incidencias card */
    .card-incid {
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 14px; padding: 1.25rem;
      display: flex; flex-direction: column;
    }
    .ci-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; margin: 0 0 0.35rem; }
    .ci-sub   { font-size: 0.78rem; color: #94A3B8; margin: 0 0 1rem; line-height: 1.45; }

    /* Dark promo card */
    .card-dark {
      flex: 1;
      background: #000000 url('/card-dark-bg.svg') no-repeat center center;
      background-size: cover;
      border-radius: 14px; padding: 1.25rem;
      display: flex; flex-direction: column;
      min-height: 155px;
    }
    .cd-title { font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0 0 0.35rem; }
    .cd-sub   { font-size: 0.78rem; color: rgba(255,255,255,0.45); margin: 0 0 1rem; line-height: 1.45; }

    /* Shared button */
    .btn-blue {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.5rem 1.125rem;
      background: #227CFF; color: #fff;
      border-radius: 8px; font-size: 0.82rem; font-weight: 600;
      text-decoration: none; transition: background 150ms ease;
      width: fit-content; margin-top: auto;
    }
    .btn-blue:hover { background: #1A6FE8; }
  `]
})
export class StatsComponent implements OnInit {
  private stats = inject(StatsService);

  loading      = signal(true);
  activePeriod = signal<Period>('week');
  loadError    = '';

  totalSupplies   = 0;
  avgOrderValue   = 0;
  avgOrderDiffAbs = 0;

  private readonly emptyTrend: KpiDisplay = { hasData: false, pct: 0, arrowUp: true, good: true };
  suppliesTrend: KpiDisplay = this.emptyTrend;
  avgOrderTrend: KpiDisplay = this.emptyTrend;

  customFrom: Date | null = null;
  customTo:   Date | null = null;

  showSupplies    = true;
  showComparisons = true;

  timeseries: DashboardTimeseriesPoint[] = [];
  groupBy: StatsGroupBy = 'day';

  periods = [
    { key: 'today'   as Period, label: 'Hoy' },
    { key: 'week'    as Period, label: 'Semana' },
    { key: 'month'   as Period, label: 'Mes' },
    { key: 'quarter' as Period, label: 'Trimestre' },
    { key: 'year'    as Period, label: 'Año' },
    { key: 'custom'  as Period, label: 'Personalizado' },
  ];

  get chartRangeLabel(): string {
    const [start, end] = this.currentRange();
    const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    return `${fmt(start)} – ${fmt(end)}`;
  }

  get chart() {
    const pts = this.timeseries;
    const n = pts.length;
    const plotLeft = 44, plotRight = 530, plotTop = 8, plotBottom = 158;
    const step = n > 1 ? (plotRight - plotLeft) / (n - 1) : 0;
    const xs = pts.map((_, i) => plotLeft + i * step);

    const activeValues: number[] = [];
    if (this.showSupplies)    pts.forEach(p => activeValues.push(p.supplies));
    if (this.showComparisons) pts.forEach(p => activeValues.push(p.comparisons));
    const rawMax  = activeValues.length ? Math.max(...activeValues) : 0;
    const niceMax = Math.max(5, Math.ceil(rawMax / 5) * 5);

    const yFor = (v: number) => plotBottom - (v / niceMax) * (plotBottom - plotTop);

    const linePath = (values: number[]) =>
      values.length ? values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]},${yFor(v)}`).join(' ') : '';

    const areaPath = (values: number[]) => {
      if (!values.length) return '';
      return `${linePath(values)} L ${xs[xs.length - 1]},${plotBottom} L ${xs[0]},${plotBottom} Z`;
    };

    const suppliesValues    = pts.map(p => p.supplies);
    const comparisonsValues = pts.map(p => p.comparisons);

    const gridYs = [8, 38, 68, 98, 128, 158];
    const gridLabels = gridYs.map((y, i) => ({ y, value: Math.round(niceMax * (5 - i) / 5) }));

    const labelStep = n > 8 ? Math.ceil(n / 6) : 1;
    const xLabels = pts
      .map((p, i) => ({ x: xs[i], label: this.formatBucketLabel(p.date) }))
      .filter((_, i) => i % labelStep === 0 || i === n - 1);

    return {
      n,
      suppliesPath:    this.showSupplies    ? linePath(suppliesValues)    : '',
      suppliesArea:    this.showSupplies    ? areaPath(suppliesValues)    : '',
      comparisonsPath: this.showComparisons ? linePath(comparisonsValues) : '',
      comparisonsArea: this.showComparisons ? areaPath(comparisonsValues) : '',
      gridLabels,
      xLabels,
    };
  }

  ngOnInit() { this.load(); }

  onPeriodChange(p: Period) {
    this.activePeriod.set(p);
    if (p !== 'custom') this.load();
  }

  applyCustomRange() {
    this.activePeriod.set('custom');
    this.load();
  }

  /** [start, end] del período activo, ambos como Date a medianoche */
  private currentRange(): [Date, Date] {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date;
    switch (this.activePeriod()) {
      case 'today':    start = new Date(end); break;
      case 'week': {
        const dow = now.getDay();
        start = new Date(end);
        start.setDate(end.getDate() - (dow === 0 ? 6 : dow - 1));
        break;
      }
      case 'month':    start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'quarter':  start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
      case 'year':     start = new Date(now.getFullYear(), 0, 1); break;
      case 'custom':   start = this.customFrom ?? new Date(now.getFullYear(), now.getMonth(), 1);
                        return [start, this.customTo ?? end];
    }
    return [start, end];
  }

  /**
   * El backend ya resuelve el período anterior y el % de variación (previousValue/changePercent).
   * changePercent viene AUSENTE (no null) cuando previousValue es 0 — en ese caso no hay base
   * de comparación real, así que no mostramos ni 0% ni infinito.
   * `badWhenUp`: para KPIs donde subir es negativo para el negocio (ej. suministros pendientes).
   */
  private kpiDisplay(kpi: DashboardKpi, badWhenUp = false): KpiDisplay {
    const hasData = kpi.changePercent !== undefined && kpi.changePercent !== null;
    if (!hasData) return { hasData: false, pct: 0, arrowUp: true, good: true };
    const arrowUp = kpi.changePercent! >= 0;
    const good    = badWhenUp ? kpi.changePercent! <= 0 : kpi.changePercent! >= 0;
    return { hasData: true, pct: Math.round(Math.abs(kpi.changePercent!)), arrowUp, good };
  }

  private groupByForSpan(days: number): StatsGroupBy {
    if (days <= 31)  return 'day';
    if (days <= 180) return 'week';
    return 'month';
  }

  private formatBucketLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    if (this.groupBy === 'month') {
      const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return months[d.getMonth()];
    }
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  }

  load() {
    this.loading.set(true);
    this.loadError = '';

    const [start, end] = this.currentRange();
    const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    this.groupBy = this.groupByForSpan(spanDays);

    this.stats.getDashboard({ from: toDateParam(start), to: toDateParam(end), groupBy: this.groupBy })
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: ({ summary, timeseries }) => {
          this.timeseries    = timeseries ?? [];
          this.totalSupplies = summary.managedSupplies.value;
          this.avgOrderValue = summary.avgOrderValue.value;
          this.avgOrderDiffAbs = Math.abs(summary.avgOrderValue.value - summary.avgOrderValue.previousValue);

          this.suppliesTrend = this.kpiDisplay(summary.managedSupplies);
          this.avgOrderTrend = this.kpiDisplay(summary.avgOrderValue);
        },
        error: e => {
          this.loadError = e?.status === 403
            ? 'No tienes permisos para ver las estadísticas.'
            : 'Error al cargar las estadísticas. Inténtalo de nuevo.';
        },
      });
  }
}
