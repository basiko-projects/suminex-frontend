import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SuppliesService } from '../../core/services/supplies.service';
import { Supply, SupplyStatus, CategoryCode } from '../../core/models/supply.model';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { PopoverModule, Popover } from 'primeng/popover';
import { DataTableComponent, DataTableColumn, SortOption } from '../../shared/data-table/data-table';

@Component({
  selector: 'app-supplies',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, FormsModule,
    SelectModule, DatePickerModule, TooltipModule, ButtonModule, PopoverModule,
    DataTableComponent,
  ],
  template: `
    <!-- Error banner -->
    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()">
          <i class="pi pi-refresh"></i> Reintentar
        </button>
      </div>
    }

    <!-- Shared table -->
    <app-data-table
      title="Suministros"
      subtitle="Gestiona los contratos de suministro de todos los clientes"
      [columns]="tableColumns"
      [rows]="items"
      [total]="total"
      [page]="page"
      [pageSize]="pageSize"
      [loading]="loading()"
      [sortOptions]="tableSortOptions"
      [rowTemplate]="rowTpl"
      [stickyFirstColumn]="true"
      emptyMessage="No hay suministros con los filtros aplicados"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSortChange($event)"
      (pageSizeChange)="onPageSizeChange($event)"
      (filterIconClick)="onFilterIconClick($event, tipoPop, estadoPop)">
      <button dtActions type="button" class="dt-date-filter-btn" [class.active]="!!(dateFrom || dateTo)"
              (click)="fechaPop.toggle($event)" title="Filtrar por fecha">
        <i class="pi pi-calendar"></i>
      </button>
    </app-data-table>

    <!-- Filter popovers -->
    <p-popover #tipoPop>
      <div class="filter-pop">
        <span class="filter-pop-title">Tipo de servicio</span>
        <p-select [options]="categoryOpts" [(ngModel)]="filterCategory"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos" [showClear]="true"
                  (onChange)="search(); tipoPop.hide()" />
      </div>
    </p-popover>

    <p-popover #estadoPop>
      <div class="filter-pop">
        <span class="filter-pop-title">Estado</span>
        <p-select [options]="statusOpts" [(ngModel)]="filterStatus"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos" [showClear]="true"
                  (onChange)="search(); estadoPop.hide()" />
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
    <ng-template #rowTpl let-s let-isLast="isLast">
      <td [class.dt-row-end]="isLast"><span class="fw-600" [title]="s.holderName">{{ s.holderName }}</span></td>
      <td><span class="text-dim">{{ s.holderEmail }}</span></td>
      <td>{{ s.holderPhone || '—' }}</td>
      <td>{{ s.holderDni }}</td>
      <td><span class="text-dim">{{ s.userEmail }}</span></td>
      <td style="text-align:center">
        <span [class]="'type-badge type-' + s.serviceType.toLowerCase()">
          <i [class]="'pi ' + typeIcon(s.serviceType)"></i>
          {{ s.serviceType }}
        </span>
      </td>
      <td>{{ s.tariffCode || s.serviceName }}</td>
      <td>
        <span class="savings-val">{{ s.estimatedSavings | currency:'EUR':'symbol':'1.2-2' }}</span>
      </td>
      <td style="text-align:center">
        <span [class]="'status-badge status-' + s.status.toLowerCase()">
          {{ statusLabel(s.status) }}
        </span>
      </td>
      <td style="text-align:center">
        <button class="btn-icon" (click)="openDetail(s)" title="Ver detalle">
          <i class="pi pi-eye"></i>
        </button>
      </td>
    </ng-template>

    <!-- Detail modal -->
    @if (viewingItem()) {
      <div class="det-overlay" (click)="viewingItem.set(null)">
        <div class="det-modal" (click)="$event.stopPropagation()">

          <div class="det-head">
            <div class="det-head-info">
              <div class="det-name">{{ viewingItem()!.userFullName }}</div>
              <div class="det-email">{{ viewingItem()!.userEmail }}</div>
              <div class="det-chip-row">
                <span [class]="'type-badge type-' + viewingItem()!.serviceType.toLowerCase()">
                  <i [class]="'pi ' + typeIcon(viewingItem()!.serviceType)"></i>
                  {{ viewingItem()!.serviceType }}
                </span>
                @if (viewingItem()!.tariffCode) {
                  <code class="det-tariff-chip">{{ viewingItem()!.tariffCode }}</code>
                }
                <span [class]="'status-badge status-' + viewingItem()!.status.toLowerCase()">
                  {{ statusLabel(viewingItem()!.status) }}
                </span>
              </div>
            </div>
            <button class="det-close" (click)="viewingItem.set(null)"><i class="pi pi-times"></i></button>
          </div>

          <div class="det-body">

            <div class="det-savings">
              <div class="det-saving-main">
                <div class="det-saving-icon"><i class="pi pi-sparkles"></i></div>
                <div class="det-saving-text">
                  <span class="det-saving-lbl">Ahorro estimado</span>
                  <span class="det-saving-val">{{ viewingItem()!.estimatedSavings | currency:'EUR':'symbol':'1.2-2' }}</span>
                </div>
              </div>
              <div class="det-saving-meta">
                <div class="det-saving-icon det-saving-icon--blue"><i class="pi pi-bolt"></i></div>
                <div class="det-saving-text">
                  <span class="det-saving-lbl">Tarifa contratada</span>
                  <span class="det-saving-svc">{{ viewingItem()!.serviceName }}</span>
                </div>
              </div>
              <div class="det-saving-meta">
                <div class="det-saving-icon det-saving-icon--neutral"><i class="pi pi-sitemap"></i></div>
                <div class="det-saving-text">
                  <span class="det-saving-lbl">Origen</span>
                  <span class="det-origin-badge">{{ viewingItem()!.originFlow }}</span>
                </div>
              </div>
            </div>

            <div class="det-section">
              <div class="det-section-title">
                <span class="det-section-icon"><i class="pi pi-user"></i></span> Titular
              </div>
              <div class="det-grid">
                <div class="det-field">
                  <span class="det-lbl">Nombre</span>
                  <span class="det-val">{{ viewingItem()!.holderName }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">DNI / NIF</span>
                  <code class="det-val mono">{{ viewingItem()!.holderDni }}</code>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Email</span>
                  <span class="det-val">{{ viewingItem()!.holderEmail }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Teléfono</span>
                  <span class="det-val">{{ viewingItem()!.holderPhone || '—' }}</span>
                </div>
                <div class="det-field span-2">
                  <span class="det-lbl">IBAN</span>
                  <code class="det-val mono">{{ viewingItem()!.holderIban || '—' }}</code>
                </div>
                <div class="det-field">
                  <span class="det-lbl">¿Usuario = titular?</span>
                  <span class="det-val">{{ viewingItem()!.isUserTheHolder ? 'Sí' : 'No' }}</span>
                </div>
              </div>
            </div>

            <div class="det-section">
              <div class="det-section-title">
                <span class="det-section-icon"><i class="pi pi-map-marker"></i></span> Punto de suministro
              </div>
              <div class="det-grid">
                <div class="det-field span-2">
                  <span class="det-lbl">CUPS</span>
                  <code class="det-val mono">{{ viewingItem()!.cups }}</code>
                </div>
                <div class="det-field span-2">
                  <span class="det-lbl">Calle</span>
                  <span class="det-val">{{ viewingItem()!.street }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Piso</span>
                  <span class="det-val">{{ viewingItem()!.floor || '—' }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Puerta</span>
                  <span class="det-val">{{ viewingItem()!.door || '—' }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">CP</span>
                  <span class="det-val">{{ viewingItem()!.postalCode }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Localidad</span>
                  <span class="det-val">{{ viewingItem()!.locality }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Provincia</span>
                  <span class="det-val">{{ viewingItem()!.province }}</span>
                </div>
              </div>
            </div>

            <div class="det-section">
              <div class="det-section-title">
                <span class="det-section-icon"><i class="pi pi-info-circle"></i></span> Información del registro
              </div>
              <div class="det-grid">
                <div class="det-field">
                  <span class="det-lbl">Creado</span>
                  <span class="det-val">{{ viewingItem()!.createdAt | date:'dd/MM/yyyy · HH:mm' }}</span>
                </div>
                <div class="det-field">
                  <span class="det-lbl">Actualizado</span>
                  <span class="det-val">{{ viewingItem()!.updatedAt | date:'dd/MM/yyyy · HH:mm' }}</span>
                </div>
              </div>
            </div>

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

    /* Error banner */
    .load-error-banner {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-radius: 10px;
      background: #FEF2F2; border: 1px solid #FECACA;
      color: #DC2626; font-size: 0.85rem; margin-bottom: 1rem;
    }
    .load-error-retry {
      margin-left: auto; background: transparent; border: 1px solid #FECACA;
      color: #DC2626; border-radius: 6px; padding: 4px 10px;
      font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px;
    }

    /* Row cells */
    /* td padding must live here — cells come from this component's ng-template,
       so data-table's scoped CSS doesn't reach them */
    td { padding: 0.85rem 1.5rem; vertical-align: middle; font-size: 14px; font-weight: 500; color: #292D32; }
    td:first-child {
      padding-left: 3rem;
      position: sticky; left: 0; z-index: 1;
      box-shadow: 2px 0 6px rgba(15, 23, 42, 0.05);
      background-color: var(--sx-surface);
      background-image: linear-gradient(#EEEEEE, #EEEEEE);
      background-size: calc(100% - 3rem) 1px;
      background-position: 3rem 100%;
      background-repeat: no-repeat;
    }
    td:first-child.dt-row-end { background-image: none; }
    td:last-child  { padding-right: 3rem; }

    .fw-600 {
      font-weight: 500; font-size: 14px;
      display: block; max-width: 220px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .text-dim { color: var(--sx-text-3); font-size: 14px; font-weight: 500; }


    /* Type badges */
    .type-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 999px;
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.03em;
    }
    .type-luz      { background: rgba(251,191,36,.12); color: #B8860B; border: 1px solid rgba(251,191,36,.3); }
    .type-gas      { background: rgba(249,115,22,.12); color: #C2540A; border: 1px solid rgba(249,115,22,.3); }
    .type-movil    { background: rgba(139,92,246,.12); color: #7C5CDE; border: 1px solid rgba(139,92,246,.3); }
    .type-internet { background: rgba(34,124,255,.12); color: #1A6FE8; border: 1px solid rgba(34,124,255,.3); }

    .savings-val { font-size: 0.85rem; font-weight: 700; color: #059669; }

    /* Status badges */
    .status-badge {
      display: inline-flex; align-items: center;
      padding: 0.25rem 0.75rem; border-radius: 999px;
      font-size: 0.7rem; font-weight: 700;
    }
    .status-active     { background: rgba(22,163,74,.12);  border: 1px solid rgba(22,163,74,.3);  color: #16A34A; }
    .status-inprogress { background: rgba(217,119,6,.12);  border: 1px solid rgba(217,119,6,.3);  color: #B45309; }
    .status-pending    { background: rgba(217,119,6,.12);  border: 1px solid rgba(217,119,6,.3);  color: #B45309; }
    .status-cancelled  { background: rgba(220,38,38,.1);   border: 1px solid rgba(220,38,38,.3);  color: #DC2626; }
    .status-completed  { background: rgba(100,116,139,.1); border: 1px solid rgba(100,116,139,.3); color: #475569; }

    .btn-icon {
      width: 32px; height: 32px; border-radius: 8px;
      border: none; background: transparent;
      color: #94A3B8; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: color 120ms;
    }
    .btn-icon:hover { color: #227CFF; }

    /* ── Detail modal ── */
    .det-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.55);
      backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
      z-index: 600; padding: 1rem; animation: fadeInOv 150ms ease;
    }
    @keyframes fadeInOv { from { opacity: 0; } to { opacity: 1; } }

    .det-modal {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border); border-radius: 20px;
      width: min(92vw, 660px); max-height: 88vh; overflow-y: auto;
      animation: slideInDet 200ms ease-out; display: flex; flex-direction: column;
      box-shadow: 0 24px 64px rgba(15,23,42,0.18);
    }
    @keyframes slideInDet {
      from { transform: translateY(-10px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @media (min-width: 900px) { .det-modal { width: min(75vw, 820px); } }

    .det-head {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 1.5rem 1.75rem; border-bottom: 1px solid var(--sx-border);
      position: sticky; top: 0; z-index: 2; background: var(--sx-surface);
    }
    .det-head-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .det-name  { font-size: 1.05rem; font-weight: 700; color: var(--sx-text); line-height: 1.2; }
    .det-email { font-size: 0.78rem; color: var(--sx-text-3); }
    .det-chip-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.3rem; }
    .det-tariff-chip {
      font-family: monospace; font-size: 0.7rem; font-weight: 700; color: var(--sx-primary-text);
      background: var(--sx-primary-bg); padding: 3px 10px;
      border-radius: 999px; border: 1px solid var(--sx-border-2);
    }
    .det-close {
      width: 30px; height: 30px; border-radius: 8px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-3); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 120ms;
    }
    .det-close:hover { color: var(--sx-red); border-color: var(--sx-red); background: var(--sx-red-bg); }

    .det-savings {
      display: flex; flex-wrap: wrap; gap: 1px; background: var(--sx-border);
      border: 1px solid var(--sx-border); border-radius: 12px; overflow: hidden;
    }
    .det-saving-main {
      flex: 1.5; min-width: 180px; display: flex; align-items: center; gap: 0.85rem;
      padding: 1rem 1.5rem; background: var(--sx-green-bg);
    }
    .det-saving-icon {
      width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
      background: rgba(22,163,74,0.15); color: var(--sx-green);
      display: flex; align-items: center; justify-content: center; font-size: 1rem;
    }
    .det-saving-icon--blue    { background: var(--sx-primary-bg); color: var(--sx-primary); }
    .det-saving-icon--neutral { background: var(--sx-surface-2); color: var(--sx-text-2); }
    .det-saving-text { display: flex; flex-direction: column; gap: 2px; }
    .det-saving-meta {
      flex: 1; min-width: 150px; display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 1.25rem; background: var(--sx-surface);
    }
    .det-saving-lbl {
      font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--sx-text-3);
    }
    .det-saving-val  { font-size: 1.35rem; font-weight: 800; color: var(--sx-green); letter-spacing: -0.01em; }
    .det-saving-svc  { font-size: 0.9rem; font-weight: 700; color: var(--sx-text); }
    .det-origin-badge {
      font-size: 0.75rem; font-weight: 600; color: var(--sx-primary-text);
      background: var(--sx-primary-bg); padding: 3px 10px;
      border-radius: 999px; border: 1px solid var(--sx-border-2); width: fit-content;
    }

    .det-body { padding: 1.5rem 1.75rem 1.75rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .det-section { display: flex; flex-direction: column; gap: 0.85rem; }
    .det-section-title {
      font-size: 0.8rem; font-weight: 700; color: var(--sx-text);
      display: flex; align-items: center; gap: 8px;
    }
    .det-section-icon {
      width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
      background: var(--sx-primary-bg); color: var(--sx-primary);
      display: flex; align-items: center; justify-content: center;
    }
    .det-section-icon .pi { font-size: 0.68rem; }
    .det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    @media (min-width: 600px) { .det-grid { grid-template-columns: 1fr 1fr 1fr; } }
    .det-field {
      display: flex; flex-direction: column; gap: 4px;
      padding-bottom: 0.6rem; border-bottom: 1px solid var(--sx-border);
    }
    .det-field.span-2 { grid-column: span 2; }
    .det-lbl {
      font-size: 0.66rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--sx-text-3);
    }
    .det-val { font-size: 0.83rem; font-weight: 600; color: var(--sx-text); word-break: break-all; }
    .det-val.mono { font-family: monospace; font-weight: 500; }
  `]
})
export class SuppliesComponent implements OnInit {
  private svc = inject(SuppliesService);

  items:      Supply[] = [];
  total       = 0;
  totalPages  = 1;
  loading     = signal(true);
  loadError   = '';
  page        = 1;
  pageSize    = 20;
  viewingItem = signal<Supply | null>(null);

  filterStatus:   SupplyStatus | null = null;
  filterCategory: CategoryCode | null = null;
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

  get tableColumns(): DataTableColumn[] {
    return [
      { key: 'user',    label: 'Nombre' },
      { key: 'email',   label: 'Correo' },
      { key: 'phone',   label: 'Teléfono' },
      { key: 'dni',     label: 'DNI' },
      { key: 'commercialEmail', label: 'Email comercial' },
      { key: 'type',    label: 'Tipo',       align: 'center', filterIcon: true, filterActive: this.filterCategory !== null },
      { key: 'tariff',  label: 'Tarifa' },
      { key: 'savings', label: 'Ahorro est.' },
      { key: 'status',  label: 'Estado',     align: 'center', filterIcon: true, filterActive: this.filterStatus !== null },
      { key: 'detail',  label: '',           align: 'center', width: '60px' },
    ];
  }

  tableSortOptions: SortOption[] = [
    { label: 'Más recientes', value: 'newest' },
    { label: 'Más antiguos',  value: 'oldest' },
  ];

  statusOpts = [
    { label: 'En proceso',  value: 'InProgress' },
    { label: 'Pendiente',   value: 'Pending' },
    { label: 'Activo',      value: 'Active' },
    { label: 'Completado',  value: 'Completed' },
    { label: 'Cancelado',   value: 'Cancelled' },
  ];

  categoryOpts = [
    { label: 'Luz',      value: 'LUZ' },
    { label: 'Gas',      value: 'GAS' },
    { label: 'Móvil',    value: 'MOVIL' },
    { label: 'Internet', value: 'INTERNET' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll({
      page:        this.page,
      pageSize:    this.pageSize,
      status:      this.filterStatus   ?? undefined,
      serviceType: this.filterCategory ?? undefined,
      dateFrom:    this.dateFrom ? this.dateFrom.toISOString().split('T')[0] : undefined,
      dateTo:      this.dateTo   ? this.dateTo.toISOString().split('T')[0]   : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  r => { this.items = r.items ?? []; this.total = r.totalCount ?? 0; this.totalPages = r.totalPages ?? 1; },
      error: e => {
        this.loadError = e?.status === 401
          ? 'Sin autorización. Verifica tu sesión.'
          : 'Error al cargar los suministros. Inténtalo de nuevo.';
      },
    });
  }

  search() { this.page = 1; this.load(); }
  clear()  { this.filterStatus = null; this.filterCategory = null; this.dateFrom = null; this.dateTo = null; this.search(); }

  openDetail(s: Supply) { this.viewingItem.set(s); }

  onPageChange(p: number)        { this.page = p; this.load(); }
  onSortChange(_sort: string)    { this.page = 1; this.load(); }
  onPageSizeChange(size: number) { this.pageSize = size; this.page = 1; this.load(); }

  onFilterIconClick(e: { key: string; event: Event }, tipoPop: Popover, estadoPop: Popover) {
    if (e.key === 'type')   tipoPop.toggle(e.event);
    if (e.key === 'status') estadoPop.toggle(e.event);
  }

  typeIcon(t: string): string {
    const m: Record<string, string> = { LUZ: 'pi-sun', GAS: 'pi-fire', MOVIL: 'pi-mobile', INTERNET: 'pi-wifi' };
    return m[t] ?? 'pi-bolt';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      InProgress: 'En proceso', Active: 'Activo',
      Pending: 'Pendiente', Cancelled: 'Cancelado', Completed: 'Completado',
    };
    return m[s] ?? s;
  }
}
