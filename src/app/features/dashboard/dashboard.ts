import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';
import { PopoverModule } from 'primeng/popover';
import { AuthService } from '../../core/services/auth.service';
import { StatsService } from '../../core/services/stats.service';
import { DashboardKpi, DashboardTimeseriesPoint, StatsGroupBy } from '../../core/models/stats.model';

interface KpiDisplay { hasData: boolean; pct: number; arrowUp: boolean; good: boolean; }

interface QuickAction {
  title:    string;
  subtitle: string;
  icon:     string;
  route:    string;
}

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

function toDateParam(d: Date): string { return d.toISOString().split('T')[0]; }
function pad2(n: number): string { return String(n).padStart(2, '0'); }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SkeletonModule, FormsModule, DatePickerModule, PopoverModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private auth  = inject(AuthService);
  private stats = inject(StatsService);

  userName = computed(() => this.auth.currentUser()?.name || 'Administrador');

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

  quickActions: QuickAction[] = [
    { title: 'Nueva oferta',   subtitle: 'Crear tarifa de luz, gas o internet', icon: 'pi-bolt',       route: '/services' },
    { title: 'Usuarios',       subtitle: 'Gestionar usuarios de la plataforma', icon: 'pi-users',      route: '/users' },
    { title: 'Comparaciones',  subtitle: 'Ver actividad reciente de usuarios',  icon: 'pi-chart-bar',  route: '/comparison-history' },
    { title: 'Suministros',    subtitle: 'Gestionar contratos activos',        icon: 'pi-file-check', route: '/supplies' },
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

  periodBtnClasses(active: boolean): string {
    const base = 'py-[0.45rem] px-4.5 rounded-full text-[0.845rem] cursor-pointer transition-all';
    return active
      ? `${base} bg-[#227CFF] border border-[#227CFF] text-white font-semibold`
      : `${base} border border-black/12 bg-white text-[#475569] font-medium hover:bg-[#F8FAFC] hover:text-[#0F172A]`;
  }

  pillClasses(good: boolean): string {
    const base = 'inline-flex items-center gap-[3px] rounded-full text-[0.72rem] font-bold py-[0.2rem] px-2.25 whitespace-nowrap';
    return good ? `${base} bg-[#16A34A]/10 text-[#16A34A]` : `${base} bg-[#DC2626]/10 text-[#DC2626]`;
  }

  legendItemClasses(dim: boolean): string {
    const base = 'inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[0.78rem] font-medium text-[#475569] p-0 transition-opacity';
    return dim ? `${base} opacity-40` : base;
  }
}
