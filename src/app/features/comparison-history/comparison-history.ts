import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComparisonHistoryService } from '../../core/services/comparison-history.service';
import { ComparisonHistoryItem } from '../../core/models/comparison-history.model';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-comparison-history',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, DecimalPipe, FormsModule,
    TableModule, ButtonModule, TagModule, InputTextModule,
    SelectModule, DatePickerModule, IconFieldModule, InputIconModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Historial de comparaciones</h1>
        <p class="page-subtitle">Registro de todas las comparaciones realizadas por usuarios</p>
      </div>
      <div class="total-badge">
        <i class="pi pi-chart-bar"></i>
        <span>{{ total }} comparaciones</span>
      </div>
    </div>

    <div class="filters-bar">
      <p-select
        [options]="contractedOpts" [(ngModel)]="contractedFilter"
        optionLabel="label" optionValue="value"
        placeholder="Contratado" [showClear]="true"
        (onChange)="search()"
      />
      <p-datepicker [(ngModel)]="dateFrom" placeholder="Desde" dateFormat="dd/mm/yy" [showIcon]="true" (onSelect)="search()" />
      <p-datepicker [(ngModel)]="dateTo"   placeholder="Hasta" dateFormat="dd/mm/yy" [showIcon]="true" (onSelect)="search()" />
      <p-button label="Buscar" icon="pi pi-search" size="small" (onClick)="search()" />
      <p-button icon="pi pi-times" size="small" severity="secondary" [text]="true" (onClick)="clear()" pTooltip="Limpiar filtros" />
    </div>

    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
      </div>
    }

    <div class="table-card">
      <p-table
        [value]="items"
        [loading]="loading()"
        [lazy]="true"
        (onLazyLoad)="onLazy($event)"
        [totalRecords]="total"
        [paginator]="true"
        [rows]="pageSize"
        class="p-datatable-sm"
      >
        <ng-template pTemplate="paginatorleft">
          <span class="pag-info">Página {{ page }} de {{ totalPages }} — Total: {{ total }}</span>
        </ng-template>

        <ng-template pTemplate="paginatorright">
          <div class="pag-right">
            <div class="jtp-wrap">
              <input type="number" class="jtp-input" [(ngModel)]="jumpPage"
                     [min]="1" [max]="totalPages"
                     (keyup.enter)="goToPage()" />
              <button class="jtp-btn" (click)="goToPage()">Ir</button>
            </div>
            <p-select [options]="pageSizeOpts" [(ngModel)]="pageSize"
                      optionLabel="label" optionValue="value"
                      (onChange)="onPageSizeChange()" />
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th>Usuario</th>
            <th>CUPS</th>
            <th>Producto</th>
            <th>Ahorro anual</th>
            <th>Fecha</th>
            <th style="text-align:center">Contratado</th>
            <th style="text-align:center">Detalle</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-item>
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar-sm">{{ item.userFullName.charAt(0).toUpperCase() }}</div>
                <div class="user-meta">
                  <span class="fw-600">{{ item.userFullName }}</span>
                  <span class="text-dim text-xs">{{ item.userEmail }}</span>
                </div>
              </div>
            </td>
            <td><code class="cups-code">{{ item.cups }}</code></td>
            <td><span class="product-name">{{ item.productName }}</span></td>
            <td>
              <span class="savings-value" [class.savings-pos]="item.annualSavings > 0">
                {{ item.annualSavings | currency:'EUR':'symbol':'1.2-2' }}
              </span>
            </td>
            <td class="text-muted text-sm">{{ item.createdAt | date:'dd/MM/yy · HH:mm' }}</td>
            <td style="text-align:center">
              <p-tag
                [value]="item.willCloseContract ? 'Sí' : 'No'"
                [severity]="item.willCloseContract ? 'success' : 'secondary'"
              />
            </td>
            <td style="text-align:center">
              <button class="btn-ver" (click)="openDetail(item)" title="Ver detalle">
                <i class="pi pi-eye"></i> Ver
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-chart-bar"></i>
              <span>No hay comparaciones con los filtros aplicados</span>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Detail modal -->
    @if (viewingItem()) {
      <div class="det-overlay" (click)="viewingItem.set(null)">
        <div class="det-modal" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="det-head">
            <div class="det-head-info">
              <div class="det-avatar">{{ viewingItem()!.userFullName.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="det-name">{{ viewingItem()!.userFullName }}</div>
                <div class="det-email">{{ viewingItem()!.userEmail }}</div>
              </div>
              <code class="det-cups">{{ viewingItem()!.cups }}</code>
              <span class="det-product">{{ viewingItem()!.productName }}</span>
              @if (viewingItem()!.providerName) {
                <span class="det-provider">{{ viewingItem()!.providerName }}</span>
              }
              <p-tag [value]="viewingItem()!.willCloseContract ? 'Contratado' : 'Sin contratar'"
                     [severity]="viewingItem()!.willCloseContract ? 'success' : 'secondary'" />
            </div>
            <button class="det-close" (click)="viewingItem.set(null)"><i class="pi pi-times"></i></button>
          </div>

          <!-- OMIE parameters bar -->
          <div class="det-params-bar">
            <div class="det-param">
              <span class="det-param-lbl"><i class="pi pi-bolt"></i> Fee energía</span>
              <span class="det-param-val">{{ viewingItem()!.energyFee | number:'1.4-4' }} €/kWh</span>
            </div>
            <div class="det-param-sep"></div>
            <div class="det-param">
              <span class="det-param-lbl"><i class="pi pi-chart-bar"></i> Fee potencia</span>
              <span class="det-param-val">{{ viewingItem()!.powerFee | number:'1.4-4' }} €/kW·año</span>
            </div>
            <div class="det-param-sep"></div>
            <div class="det-param">
              <span class="det-param-lbl"><i class="pi pi-percentage"></i> Comisión energía</span>
              <span class="det-param-val">{{ viewingItem()!.energyCommission | number:'1.4-4' }}</span>
            </div>
            <div class="det-param-sep"></div>
            <div class="det-param">
              <span class="det-param-lbl"><i class="pi pi-calculator"></i> Consumo anual</span>
              <span class="det-param-val">{{ viewingItem()!.annualConsumption | number:'1.0-0' }} kWh</span>
            </div>
          </div>

          @if (viewingItem()!.resultData; as r) {
            <!-- Savings banner -->
            <div class="det-savings-banner">
              <div class="det-saving-item main">
                <span class="det-saving-lbl">Ahorro anual</span>
                <span class="det-saving-val">{{ r.AhorroAnual | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
              <div class="det-saving-item">
                <span class="det-saving-lbl">Ahorro mensual</span>
                <span class="det-saving-val sm">{{ r.AhorroMensual | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
              <div class="det-saving-item">
                <span class="det-saving-lbl">Ahorro %</span>
                <span class="det-saving-val sm pct">{{ r.AhorroPorcent | number:'1.2-2' }}%</span>
              </div>
              <div class="det-saving-item">
                <span class="det-saving-lbl">Días período</span>
                <span class="det-saving-val sm">{{ r.Dias }}</span>
              </div>
            </div>

            <!-- Comparison table -->
            <div class="det-section-title">Resumen económico</div>
            <table class="det-table">
              <thead>
                <tr><th></th><th>Tarifa actual</th><th>Oferta Suminex</th></tr>
              </thead>
              <tbody>
                <tr><td class="det-row-lbl">Base energía (IE)</td>
                  <td class="num">{{ r.BaseIEActual | number:'1.4-4' }}</td>
                  <td class="num offer">{{ r.BaseIEOferta | number:'1.4-4' }}</td></tr>
                <tr><td class="det-row-lbl">IE (€/MWh)</td>
                  <td class="num">{{ r.IeActual | number:'1.5-5' }}</td>
                  <td class="num offer">{{ r.IeOferta | number:'1.5-5' }}</td></tr>
                <tr><td class="det-row-lbl">Subtotal</td>
                  <td class="num">{{ r.SubTotalActual | currency:'EUR':'symbol':'1.2-2' }}</td>
                  <td class="num offer">{{ r.SubTotalOferta | currency:'EUR':'symbol':'1.2-2' }}</td></tr>
                <tr><td class="det-row-lbl">IVA</td>
                  <td class="num">{{ r.IvaActual | currency:'EUR':'symbol':'1.2-2' }}</td>
                  <td class="num offer">{{ r.IvaOferta | currency:'EUR':'symbol':'1.2-2' }}</td></tr>
                <tr class="total-row"><td class="det-row-lbl">Total</td>
                  <td class="num">{{ r.TotalActual | currency:'EUR':'symbol':'1.2-2' }}</td>
                  <td class="num offer">{{ r.TotalOferta | currency:'EUR':'symbol':'1.2-2' }}</td></tr>
              </tbody>
            </table>

            <!-- Periods -->
            @if (r.Periodos?.length) {
              <div class="det-section-title">Desglose por período</div>
              <table class="det-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Coste energía</th>
                    <th>Coste potencia</th>
                    <th>Precio energía</th>
                    <th>Precio potencia</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of r.Periodos; track p.Periodo) {
                    <tr>
                      <td><span class="per-badge">P{{ p.Periodo + 1 }}</span></td>
                      <td class="num">{{ p.CosteEnergia | number:'1.4-4' }}</td>
                      <td class="num">{{ p.CostePotencia | number:'1.4-4' }}</td>
                      <td class="num offer">{{ p.PrecioEnergiaOferta | number:'1.6-6' }}</td>
                      <td class="num offer">{{ p.PrecioPotenciaOferta | number:'1.6-6' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          } @else {
            <div class="det-no-data"><i class="pi pi-info-circle"></i> Sin datos de resultado disponibles</div>
          }

        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); }
    .page-header h1 { font-size:1.6rem; font-weight:800; letter-spacing:-0.02em; }
    .page-subtitle { color:var(--text-muted); font-size:0.83rem; margin-top:0.25rem; }

    .total-badge { display:flex; align-items:center; gap:0.5rem; background:var(--blue-glow-sm); border:1px solid var(--border-blue); color:var(--blue-light); font-size:0.82rem; font-weight:600; padding:0.5rem 1rem; border-radius:10px; }
    .total-badge .pi { font-size:0.8rem; }

    .filters-bar { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:1.25rem; }

    .load-error-banner { display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; border-radius:10px; background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; font-size:0.85rem; margin-bottom:1rem; }
    .load-error-retry { margin-left:auto; background:transparent; border:1px solid #FECACA; color:#DC2626; border-radius:6px; padding:4px 10px; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:4px; }
    .load-error-retry:hover { background:#FEF2F2; }

    .table-card { background:var(--surface); border-radius:14px; border:1px solid var(--border); overflow:hidden; }

    .user-cell { display:flex; align-items:center; gap:0.65rem; }
    .user-avatar-sm { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, var(--blue), var(--blue-light)); color:#fff; font-size:0.75rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .user-meta { display:flex; flex-direction:column; gap:0.1rem; }
    .fw-600 { font-weight:600; font-size:0.85rem; }
    .text-dim { color:var(--text-dim); }
    .text-xs { font-size:0.72rem; }
    .text-muted { color:var(--text-muted); }
    .text-sm { font-size:0.82rem; }

    .cups-code { font-family:monospace; font-size:0.78rem; color:var(--text-dim); }
    .product-name { font-size:0.85rem; font-weight:500; }
    .savings-value { font-size:0.85rem; font-weight:600; color:var(--text-muted); }
    .savings-pos { color:#059669; }

    .empty-state { display:flex; flex-direction:column; align-items:center; gap:0.75rem; padding:3rem; color:var(--text-dim); }
    .empty-state .pi { font-size:2rem; }
    .empty-state span { font-size:0.875rem; }

    .pag-info { font-size:0.78rem; color:var(--sx-text-2); font-weight:500; white-space:nowrap; }
    .pag-right { display:flex; align-items:center; gap:0.5rem; }
    .jtp-wrap  { display:flex; align-items:center; gap:4px; }
    .jtp-input { width:52px; height:32px; border-radius:6px; border:1px solid var(--sx-border); background:transparent; color:var(--sx-text); font-size:0.8rem; text-align:center; padding:0; outline:none; }
    .jtp-input:focus { border-color:var(--sx-primary); }
    .jtp-btn { height:32px; padding:0 0.65rem; border-radius:6px; border:1px solid var(--sx-border); background:transparent; color:var(--sx-text-2); font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 120ms; }
    .jtp-btn:hover { border-color:var(--sx-primary); color:var(--sx-primary); }

    .btn-ver { display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:0.78rem;font-weight:500;cursor:pointer;transition:all 120ms; }
    .btn-ver:hover { border-color:var(--blue);color:var(--blue);background:var(--blue-glow-sm); }

    /* Detail modal */
    .det-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:600;padding:1rem;animation:fadeInOv 150ms ease; }
    @keyframes fadeInOv { from{opacity:0} to{opacity:1} }
    .det-modal { background:var(--surface,#1A1D2E);border:1px solid var(--border);border-radius:16px;width:min(92vw,640px);max-height:88vh;overflow-y:auto;animation:slideInDet 200ms ease-out;display:flex;flex-direction:column; }
    @keyframes slideInDet { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
    @media(min-width:900px){ .det-modal{ width:min(75vw,780px); } }

    .det-head { display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--border); }
    .det-head-info { display:flex;align-items:center;flex-wrap:wrap;gap:0.6rem;flex:1;min-width:0; }
    .det-avatar { width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--blue,#4F46E5),var(--blue-light,#818CF8));color:#fff;font-size:0.9rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .det-name { font-size:0.9rem;font-weight:700;color:var(--text-primary); }
    .det-email { font-size:0.75rem;color:var(--text-dim);margin-top:1px; }
    .det-cups { font-family:monospace;font-size:0.72rem;color:var(--text-dim);background:var(--bg-subtle,rgba(255,255,255,.04));padding:2px 6px;border-radius:4px;border:1px solid var(--border); }
    .det-product { font-size:0.78rem;font-weight:600;color:var(--blue-light,#818CF8);background:rgba(79,70,229,.12);padding:2px 8px;border-radius:20px;border:1px solid rgba(79,70,229,.25); }
    .det-close { width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 120ms; }
    .det-close:hover { color:#DC2626;border-color:#FECACA;background:#FEF2F2; }

    .det-savings-banner { display:flex;flex-wrap:wrap;gap:1px;background:var(--border);border-bottom:1px solid var(--border); }
    .det-saving-item { flex:1;min-width:100px;display:flex;flex-direction:column;gap:2px;padding:0.85rem 1.25rem;background:var(--surface); }
    .det-saving-item.main { background:rgba(5,150,105,.08); }
    .det-saving-lbl { font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim); }
    .det-saving-val { font-size:1.1rem;font-weight:800;color:var(--text-primary); }
    .det-saving-val.sm { font-size:0.9rem; }
    .det-saving-val.pct { color:#059669; }
    .det-saving-item.main .det-saving-val { color:#059669;font-size:1.3rem; }

    .det-section-title { font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);padding:0.85rem 1.5rem 0.4rem; }
    .det-table { width:100%;border-collapse:collapse;font-size:0.82rem; }
    .det-table th { font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);padding:6px 1.5rem;text-align:left;background:rgba(0,0,0,.1);border-bottom:1px solid var(--border); }
    .det-table td { padding:7px 1.5rem;border-bottom:1px solid rgba(255,255,255,.04); }
    .det-row-lbl { color:var(--text-muted);font-size:0.8rem; }
    .num { text-align:right;font-variant-numeric:tabular-nums;font-size:0.8rem;font-weight:500; }
    .offer { color:#059669;font-weight:600; }
    .total-row td { font-weight:700;border-top:1px solid var(--border);border-bottom:none; }
    .per-badge { display:inline-block;padding:1px 7px;border-radius:10px;background:rgba(79,70,229,.15);color:var(--blue-light,#818CF8);font-size:0.72rem;font-weight:700;border:1px solid rgba(79,70,229,.25); }
    .det-no-data { display:flex;align-items:center;gap:0.5rem;padding:2rem 1.5rem;color:var(--text-dim);font-size:0.85rem; }
    .det-provider { font-size:0.75rem;font-weight:500;color:var(--text-muted);background:rgba(255,255,255,.06);padding:2px 8px;border-radius:20px;border:1px solid var(--border); }

    /* OMIE parameters bar */
    .det-params-bar { display:flex;flex-wrap:wrap;align-items:center;gap:0;background:rgba(79,70,229,.06);border-bottom:1px solid var(--border);padding:0; }
    .det-param { display:flex;flex-direction:column;gap:2px;padding:0.7rem 1.25rem;flex:1;min-width:110px; }
    .det-param-sep { width:1px;height:36px;background:var(--border);flex-shrink:0; }
    .det-param-lbl { font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);display:flex;align-items:center;gap:4px; }
    .det-param-lbl .pi { font-size:0.65rem;color:var(--blue-light,#818CF8); }
    .det-param-val { font-size:0.82rem;font-weight:700;color:var(--blue-light,#818CF8);font-variant-numeric:tabular-nums; }
  `]
})
export class ComparisonHistoryComponent implements OnInit {
  private svc = inject(ComparisonHistoryService);

  items: ComparisonHistoryItem[] = [];
  total      = 0;
  viewingItem = signal<ComparisonHistoryItem | null>(null);
  totalPages = 1;
  loading    = signal(true);
  loadError  = '';
  page       = 1;
  pageSize   = 20;
  jumpPage   = 1;

  pageSizeOpts = [
    { label: '10 / pág', value: 10 },
    { label: '20 / pág', value: 20 },
    { label: '50 / pág', value: 50 },
  ];

  contractedFilter: boolean | null = null;
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

  contractedOpts = [
    { label: 'Contratado',    value: true  },
    { label: 'No contratado', value: false },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll({
      page:              this.page,
      pageSize:          this.pageSize,
      willCloseContract: this.contractedFilter !== null ? this.contractedFilter : undefined,
      from: this.dateFrom ? this.dateFrom.toISOString().split('T')[0] : undefined,
      to:   this.dateTo   ? this.dateTo.toISOString().split('T')[0]   : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: r => {
        this.items      = r.items      ?? [];
        this.total      = r.totalCount ?? 0;
        this.totalPages = r.totalPages ?? 1;
      },
      error: e => {
        this.loadError = e?.status === 401
          ? 'Sin autorización. Verifica tu sesión.'
          : 'Error al cargar el historial. Inténtalo de nuevo.';
      },
    });
  }

  search() { this.page = 1; this.load(); }

  clear() {
    this.contractedFilter = null;
    this.dateFrom = null;
    this.dateTo   = null;
    this.search();
  }

  onLazy(e: TableLazyLoadEvent) {
    if (e.rows) this.pageSize = e.rows;
    this.page = ((e.first ?? 0) / this.pageSize) + 1;
    this.load();
  }

  goToPage() {
    this.page = Math.max(1, Math.min(this.jumpPage, this.totalPages));
    this.load();
  }

  onPageSizeChange() { this.page = 1; this.load(); }

  openDetail(item: ComparisonHistoryItem) { this.viewingItem.set(item); }
}
