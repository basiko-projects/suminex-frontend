import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComparisonHistoryService } from '../../core/services/comparison-history.service';
import { ComparisonHistoryItem } from '../../core/models/comparison-history.model';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule, Popover } from 'primeng/popover';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table/data-table';

@Component({
  selector: 'app-comparison-history',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, DecimalPipe, FormsModule,
    ButtonModule, TagModule, SelectModule, DatePickerModule, TooltipModule, PopoverModule,
    DataTableComponent,
  ],
  template: `
    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
      </div>
    }

    <!-- Shared table -->
    <app-data-table
      title="Historial de comparaciones"
      subtitle="Registro de todas las comparaciones realizadas por usuarios"
      [columns]="tableColumns"
      [rows]="items"
      [total]="total"
      [page]="page"
      [pageSize]="pageSize"
      [loading]="loading()"
      [rowTemplate]="rowTpl"
      emptyMessage="No hay comparaciones con los filtros aplicados"
      (pageChange)="onPageChange($event)"
      (pageSizeChange)="onPageSizeChange($event)"
      (filterIconClick)="onFilterIconClick($event, contratadoPop)">
      <button dtActions type="button" class="dt-date-filter-btn" [class.active]="!!(dateFrom || dateTo)"
              (click)="fechaPop.toggle($event)" title="Filtrar por fecha">
        <i class="pi pi-calendar"></i>
      </button>
    </app-data-table>

    <!-- Filter popovers -->
    <p-popover #contratadoPop>
      <div class="filter-pop">
        <span class="filter-pop-title">Contratado</span>
        <p-select [options]="contractedOpts" [(ngModel)]="contractedFilter"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos" [showClear]="true"
                  (onChange)="search(); contratadoPop.hide()" />
      </div>
    </p-popover>

    <p-popover #fechaPop>
      <div class="filter-pop filter-pop-dates">
        <span class="filter-pop-title">Rango de fechas</span>
        <p-datepicker [(ngModel)]="dateFrom" placeholder="Desde" dateFormat="dd/mm/yy" [showIcon]="true" />
        <p-datepicker [(ngModel)]="dateTo" placeholder="Hasta" dateFormat="dd/mm/yy" [showIcon]="true" />
        <div class="filter-pop-actions">
          <button type="button" class="btn-clear-sm" (click)="clear(); fechaPop.hide()">Limpiar</button>
          <button type="button" class="btn-apply-sm" (click)="search(); fechaPop.hide()">Aplicar</button>
        </div>
      </div>
    </p-popover>

    <!-- Row template -->
    <ng-template #rowTpl let-item>
      <td>
        <div class="user-meta">
          <span class="fw-600">{{ item.userFullName }}</span>
          <span class="text-dim text-xs">{{ item.userEmail }}</span>
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
    </ng-template>

    <!-- Detail modal -->
    @if (viewingItem()) {
      <div class="det-overlay" (click)="viewingItem.set(null)">
        <div class="det-modal" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="det-head">
            <div class="det-head-info">
              <div class="det-name">{{ viewingItem()!.userFullName }}</div>
              <div class="det-email">{{ viewingItem()!.userEmail }}</div>
              <div class="det-chip-row">
                <code class="det-cups">{{ viewingItem()!.cups }}</code>
                <div class="det-chip-group">
                  <span class="det-product">{{ viewingItem()!.productName }}</span>
                  @if (viewingItem()!.providerName) {
                    <span class="det-provider">{{ viewingItem()!.providerName }}</span>
                  }
                  <p-tag [value]="viewingItem()!.willCloseContract ? 'Contratado' : 'Sin contratar'"
                         [severity]="viewingItem()!.willCloseContract ? 'success' : 'secondary'" />
                </div>
              </div>
            </div>
            <button class="det-close" (click)="viewingItem.set(null)"><i class="pi pi-times"></i></button>
          </div>

          <div class="det-body">

            <!-- OMIE parameters -->
            <div class="det-section">
              <div class="det-section-title">
                <span class="det-section-icon"><i class="pi pi-sliders-h"></i></span> Parámetros de la oferta
              </div>
              <div class="det-grid">
                <div class="det-field">
                  <span class="det-lbl"><i class="pi pi-bolt"></i> Fee energía</span>
                  <span class="det-val">{{ viewingItem()!.energyFee | number:'1.4-4' }} €/kWh</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl"><i class="pi pi-chart-bar"></i> Fee potencia</span>
                  <span class="det-val">{{ viewingItem()!.powerFee | number:'1.4-4' }} €/kW·año</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl"><i class="pi pi-percentage"></i> Comisión energía</span>
                  <span class="det-val">{{ viewingItem()!.energyCommission | number:'1.4-4' }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl"><i class="pi pi-calculator"></i> Consumo anual</span>
                  <span class="det-val">{{ viewingItem()!.annualConsumption | number:'1.0-0' }} kWh</span>
                </div>
              </div>
            </div>

            @if (viewingItem()!.resultData; as r) {
              <!-- Savings banner -->
              <div class="det-savings">
                <div class="det-saving-main">
                  <div class="det-saving-icon"><i class="pi pi-sparkles"></i></div>
                  <div class="det-saving-text">
                    <span class="det-saving-lbl">Ahorro anual</span>
                    <span class="det-saving-val">{{ r.AhorroAnual | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </div>
                </div>
                <div class="det-saving-meta">
                  <div class="det-saving-icon det-saving-icon--blue"><i class="pi pi-calendar"></i></div>
                  <div class="det-saving-text">
                    <span class="det-saving-lbl">Ahorro mensual</span>
                    <span class="det-saving-svc">{{ r.AhorroMensual | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </div>
                </div>
                <div class="det-saving-meta">
                  <div class="det-saving-icon"><i class="pi pi-percentage"></i></div>
                  <div class="det-saving-text">
                    <span class="det-saving-lbl">Ahorro %</span>
                    <span class="det-saving-svc pct">{{ r.AhorroPorcent | number:'1.2-2' }}%</span>
                  </div>
                </div>
                <div class="det-saving-meta">
                  <div class="det-saving-icon det-saving-icon--neutral"><i class="pi pi-clock"></i></div>
                  <div class="det-saving-text">
                    <span class="det-saving-lbl">Días período</span>
                    <span class="det-saving-svc">{{ r.Dias }}</span>
                  </div>
                </div>
              </div>

              <!-- Comparison table -->
              <div class="det-section">
                <div class="det-section-title">
                  <span class="det-section-icon"><i class="pi pi-file-check"></i></span> Resumen económico
                </div>
                <div class="det-table-card">
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
                </div>
              </div>

              <!-- Periods -->
              @if (r.Periodos?.length) {
                <div class="det-section">
                  <div class="det-section-title">
                    <span class="det-section-icon"><i class="pi pi-calendar"></i></span> Desglose por período
                  </div>
                  <div class="det-table-card">
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
                  </div>
                </div>
              }
            } @else {
              <div class="det-no-data"><i class="pi pi-info-circle"></i> Sin datos de resultado disponibles</div>
            }

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Date filter icon button (dtActions) */
    .dt-date-filter-btn {
      width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
      border: 1px solid var(--sx-border-2); background: var(--sx-surface);
      color: var(--sx-text-3); display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 140ms ease;
    }
    .dt-date-filter-btn .pi { font-size: 0.85rem; }
    .dt-date-filter-btn:hover { background: var(--sx-surface-2); color: var(--sx-primary); }
    .dt-date-filter-btn.active { background: var(--sx-primary-bg); border-color: var(--sx-primary); color: var(--sx-primary); }

    /* Filter popovers */
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

    .load-error-banner { display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; border-radius:10px; background:var(--sx-red-bg); border:1px solid var(--sx-red); color:var(--sx-red); font-size:0.85rem; margin-bottom:1rem; }
    .load-error-retry { margin-left:auto; background:transparent; border:1px solid var(--sx-red); color:var(--sx-red); border-radius:6px; padding:4px 10px; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:4px; }
    .load-error-retry:hover { background:var(--sx-red-bg); }

    /* Row cells — data-table's scoped CSS doesn't reach ng-template cells */
    td { padding:0.85rem 1.5rem; vertical-align:middle; }
    td:first-child { padding-left:3rem; }
    td:last-child  { padding-right:3rem; }

    .user-meta { display:flex; flex-direction:column; gap:0.1rem; }
    .fw-600 { font-weight:600; font-size:0.85rem; }
    .text-dim { color:var(--sx-text-3); }
    .text-xs { font-size:0.72rem; }
    .text-muted { color:var(--sx-text-3); }
    .text-sm { font-size:0.82rem; }

    .cups-code {
      font-family:monospace; font-size:0.78rem; color:var(--sx-text-3);
      background:none; border:none; padding:0; border-radius:0;
    }
    .product-name { font-size:0.85rem; font-weight:500; color:var(--sx-text); }
    .savings-value { font-size:0.85rem; font-weight:600; color:var(--sx-text-3); }
    .savings-pos { color:var(--sx-green); }

    .btn-ver { display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;border:1px solid var(--sx-border);background:transparent;color:var(--sx-text-3);font-size:0.78rem;font-weight:500;cursor:pointer;transition:all 120ms; }
    .btn-ver:hover { border-color:var(--sx-primary);color:var(--sx-primary);background:var(--sx-primary-bg); }

    /* Detail modal */
    .det-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:600;padding:1rem;animation:fadeInOv 150ms ease; }
    @keyframes fadeInOv { from{opacity:0} to{opacity:1} }
    .det-modal {
      background:var(--sx-surface); border:1px solid var(--sx-border); border-radius:20px;
      width:min(92vw,640px); max-height:88vh; overflow-y:auto;
      animation:slideInDet 200ms ease-out; display:flex; flex-direction:column;
      box-shadow: 0 24px 64px rgba(15,23,42,0.18);
    }
    @keyframes slideInDet { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
    @media(min-width:900px){ .det-modal{ width:min(75vw,780px); } }

    .det-head {
      display:flex; align-items:flex-start; gap:1rem; padding:1.5rem 1.75rem;
      border-bottom:1px solid var(--sx-border);
      position: sticky; top: 0; z-index: 2; background: var(--sx-surface);
    }
    .det-head-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:0.4rem; }
    .det-name { font-size:1.05rem; font-weight:700; color:var(--sx-text); line-height:1.2; }
    .det-email { font-size:0.78rem; color:var(--sx-text-3); }
    .det-chip-row { display:flex; flex-wrap:wrap; gap:0.6rem; margin-top:0.3rem; align-items:center; justify-content:space-between; }
    .det-chip-group { display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center; }
    .det-cups {
      font-family:monospace; font-size:0.75rem; color:var(--sx-text-2);
      background:none; border:none; padding:0; border-radius:0;
    }
    .det-product { font-size:0.75rem; font-weight:700; color:var(--sx-primary-text); background:var(--sx-primary-bg); padding:3px 10px; border-radius:999px; border:1px solid var(--sx-border-2); }
    .det-provider { font-size:0.72rem; font-weight:500; color:var(--sx-text-2); background:var(--sx-surface-2); padding:3px 10px; border-radius:999px; border:1px solid var(--sx-border); }
    .det-close {
      width:30px; height:30px; border-radius:8px; border:1px solid var(--sx-border); background:transparent;
      color:var(--sx-text-3); cursor:pointer; display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:all 120ms;
    }
    .det-close:hover { color:var(--sx-red); border-color:var(--sx-red); background:var(--sx-red-bg); }

    .det-body { padding:1.5rem 1.75rem 1.75rem; display:flex; flex-direction:column; gap:1.5rem; }
    .det-section { display:flex; flex-direction:column; gap:0.85rem; }
    .det-section-title { font-size:0.8rem; font-weight:700; color:var(--sx-text); display:flex; align-items:center; gap:8px; }
    .det-section-icon {
      width:24px; height:24px; border-radius:7px; flex-shrink:0;
      background:var(--sx-primary-bg); color:var(--sx-primary);
      display:flex; align-items:center; justify-content:center;
    }
    .det-section-icon .pi { font-size:0.68rem; }

    .det-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
    @media (min-width:600px) { .det-grid { grid-template-columns:repeat(4,1fr); } }
    .det-field {
      display:flex; flex-direction:column; gap:4px;
      padding-bottom:0.6rem; border-bottom:1px solid var(--sx-border);
    }
    .det-lbl { font-size:0.66rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--sx-text-3); display:flex; align-items:center; gap:4px; }
    .det-lbl .pi { font-size:0.62rem; color:var(--sx-primary); }
    .det-val { font-size:0.85rem; font-weight:700; color:var(--sx-text); }

    /* Savings banner */
    .det-savings {
      display:flex; flex-wrap:wrap; gap:1px; background:var(--sx-border);
      border:1px solid var(--sx-border); border-radius:12px; overflow:hidden;
    }
    .det-saving-main { flex:1.5; min-width:180px; display:flex; align-items:center; gap:0.85rem; padding:1rem 1.5rem; background:var(--sx-green-bg); }
    .det-saving-icon {
      width:38px; height:38px; border-radius:11px; flex-shrink:0;
      background:rgba(22,163,74,0.15); color:var(--sx-green);
      display:flex; align-items:center; justify-content:center; font-size:1rem;
    }
    .det-saving-icon--blue    { background: var(--sx-primary-bg); color: var(--sx-primary); }
    .det-saving-icon--neutral { background: var(--sx-surface-2); color: var(--sx-text-2); }
    .det-saving-text { display:flex; flex-direction:column; gap:2px; }
    .det-saving-meta { flex:1; min-width:140px; display:flex; align-items:center; gap:0.75rem; padding:1rem 1.25rem; background:var(--sx-surface); }
    .det-saving-lbl { font-size:0.68rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--sx-text-3); }
    .det-saving-val { font-size:1.35rem; font-weight:800; color:var(--sx-green); letter-spacing:-0.01em; }
    .det-saving-svc { font-size:0.9rem; font-weight:700; color:var(--sx-text); }
    .det-saving-svc.pct { color:var(--sx-green); }

    /* Tables */
    .det-table-card { border:1px solid var(--sx-border); border-radius:12px; overflow:hidden; }
    .det-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
    .det-table th { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--sx-text-3); padding:9px 1.25rem; text-align:left; background:var(--sx-surface-2); border-bottom:1px solid var(--sx-border); }
    .det-table td { padding:9px 1.25rem; border-bottom:1px solid var(--sx-border); }
    .det-table tbody tr:last-child td { border-bottom:none; }
    .det-table tbody tr:hover { background:var(--sx-surface-2); }
    .det-row-lbl { color:var(--sx-text-2); font-size:0.8rem; font-weight:500; }
    .num { text-align:right; font-variant-numeric:tabular-nums; font-size:0.8rem; font-weight:500; color:var(--sx-text); }
    .offer { color:var(--sx-green); font-weight:700; background:var(--sx-green-bg); }
    .total-row td { font-weight:700; border-top:1px solid var(--sx-border); }
    .per-badge { display:inline-block; padding:2px 9px; border-radius:999px; background:var(--sx-primary-bg); color:var(--sx-primary-text); font-size:0.72rem; font-weight:700; border:1px solid var(--sx-border-2); }
    .det-no-data { display:flex; align-items:center; gap:0.5rem; padding:2rem 1.5rem; color:var(--sx-text-3); font-size:0.85rem; }
  `]
})
export class ComparisonHistoryComponent implements OnInit {
  private svc = inject(ComparisonHistoryService);

  items: ComparisonHistoryItem[] = [];
  total      = 0;
  viewingItem = signal<ComparisonHistoryItem | null>(null);
  loading    = signal(true);
  loadError  = '';
  page       = 1;
  pageSize   = 20;

  get tableColumns(): DataTableColumn[] {
    return [
      { key: 'user',      label: 'Usuario' },
      { key: 'cups',      label: 'CUPS' },
      { key: 'product',   label: 'Producto' },
      { key: 'savings',   label: 'Ahorro anual' },
      { key: 'date',      label: 'Fecha' },
      { key: 'contracted', label: 'Contratado', align: 'center', filterIcon: true, filterActive: this.contractedFilter !== null },
      { key: 'detail',    label: 'Detalle',     align: 'center' },
    ];
  }

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
        this.items = r.items      ?? [];
        this.total = r.totalCount ?? 0;
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

  onPageChange(p: number)        { this.page = p; this.load(); }
  onPageSizeChange(size: number) { this.pageSize = size; this.page = 1; this.load(); }

  onFilterIconClick(e: { key: string; event: Event }, contratadoPop: Popover) {
    if (e.key === 'contracted') contratadoPop.toggle(e.event);
  }

  openDetail(item: ComparisonHistoryItem) { this.viewingItem.set(item); }
}
