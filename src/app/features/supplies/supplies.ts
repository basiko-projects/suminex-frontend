import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuppliesService } from '../../core/services/supplies.service';
import { Supply, SupplyFilters, SupplyStatus, CategoryCode } from '../../core/models/supply.model';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-supplies',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, FormsModule,
    TableModule, ButtonModule, TagModule,
    SelectModule, DatePickerModule, TooltipModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Suministros contratados</h1>
        <p class="page-subtitle">Gestiona los contratos de suministro de todos los clientes</p>
      </div>
      <div class="total-badge">
        <i class="pi pi-file-check"></i>
        <span>{{ total }} suministros</span>
      </div>
    </div>

    <div class="filters-bar">
      <p-select [options]="statusOpts" [(ngModel)]="filterStatus"
                optionLabel="label" optionValue="value"
                placeholder="Todos los estados" [showClear]="true"
                (onChange)="search()" />
      <p-select [options]="categoryOpts" [(ngModel)]="filterCategory"
                optionLabel="label" optionValue="value"
                placeholder="Tipo servicio" [showClear]="true"
                (onChange)="search()" />
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
            <th>DNI</th>
            <th style="text-align:center">Tipo</th>
            <th>Tarifa</th>
            <th>Ahorro est.</th>
            <th style="text-align:center">Estado</th>
            <th style="text-align:center">Detalle</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-s>
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar-sm">{{ (s.userFullName || s.userEmail || '?').charAt(0).toUpperCase() }}</div>
                <div class="user-meta">
                  <span class="fw-600">{{ s.userFullName }}</span>
                  <span class="text-dim text-xs">{{ s.userEmail }}</span>
                </div>
              </div>
            </td>
            <td><code class="mono-sm">{{ s.holderDni }}</code></td>
            <td style="text-align:center">
              <span [class]="'type-badge type-' + s.serviceType?.toLowerCase()">
                <i [class]="'pi ' + typeIcon(s.serviceType)"></i>
                {{ s.serviceType }}
              </span>
            </td>
            <td>
              <div class="tariff-cell">
                <span class="fw-600">{{ s.serviceName }}</span>
                @if (s.tariffCode) {
                  <code class="tariff-code">{{ s.tariffCode }}</code>
                }
              </div>
            </td>
            <td>
              <span class="savings-val">{{ s.estimatedSavings | currency:'EUR':'symbol':'1.2-2' }}</span>
            </td>
            <td style="text-align:center">
              <p-tag [value]="statusLabel(s.status)" [severity]="statusSeverity(s.status)" />
            </td>
            <td style="text-align:center">
              <button class="btn-ver" (click)="openDetail(s)">
                <i class="pi pi-eye"></i> Ver
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="empty-state">
              <i class="pi pi-file-check"></i>
              <span>No hay suministros con los filtros aplicados</span>
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
              <div class="det-avatar">{{ (viewingItem()!.userFullName || '?').charAt(0).toUpperCase() }}</div>
              <div>
                <div class="det-name">{{ viewingItem()!.userFullName }}</div>
                <div class="det-email">{{ viewingItem()!.userEmail }}</div>
              </div>
              <span [class]="'type-badge type-' + viewingItem()!.serviceType.toLowerCase()">
                <i [class]="'pi ' + typeIcon(viewingItem()!.serviceType)"></i>
                {{ viewingItem()!.serviceType }}
              </span>
              @if (viewingItem()!.tariffCode) {
                <code class="det-tariff-chip">{{ viewingItem()!.tariffCode }}</code>
              }
              <p-tag [value]="statusLabel(viewingItem()!.status)" [severity]="statusSeverity(viewingItem()!.status)" />
            </div>
            <button class="det-close" (click)="viewingItem.set(null)"><i class="pi pi-times"></i></button>
          </div>

          <!-- Savings banner -->
          <div class="det-savings">
            <div class="det-saving-main">
              <span class="det-saving-lbl">Ahorro estimado</span>
              <span class="det-saving-val">{{ viewingItem()!.estimatedSavings | currency:'EUR':'symbol':'1.2-2' }}</span>
            </div>
            <div class="det-saving-meta">
              <span class="det-saving-lbl">Tarifa contratada</span>
              <span class="det-saving-svc">{{ viewingItem()!.serviceName }}</span>
            </div>
            <div class="det-saving-meta">
              <span class="det-saving-lbl">Origen</span>
              <span class="det-origin-badge">{{ viewingItem()!.originFlow }}</span>
            </div>
          </div>

          <!-- Body sections -->
          <div class="det-body">

            <!-- Titular -->
            <div class="det-section">
              <div class="det-section-title"><i class="pi pi-user"></i> Titular</div>
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

            <!-- Suministro -->
            <div class="det-section">
              <div class="det-section-title"><i class="pi pi-map-marker"></i> Punto de suministro</div>
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

            <!-- Meta -->
            <div class="det-section">
              <div class="det-section-title"><i class="pi pi-info-circle"></i> Información del registro</div>
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
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); }
    .page-header h1 { font-size:1.6rem; font-weight:800; letter-spacing:-0.02em; }
    .page-subtitle { color:var(--text-muted); font-size:0.83rem; margin-top:0.25rem; }

    .total-badge { display:flex;align-items:center;gap:0.5rem;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);color:var(--green);font-size:0.82rem;font-weight:600;padding:0.5rem 1rem;border-radius:10px; }
    .total-badge .pi { font-size:0.8rem; }

    .filters-bar { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:1.25rem; }

    .load-error-banner { display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;font-size:0.85rem;margin-bottom:1rem; }
    .load-error-retry { margin-left:auto;background:transparent;border:1px solid #FECACA;color:#DC2626;border-radius:6px;padding:4px 10px;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px; }

    .table-card { background:var(--surface);border-radius:14px;border:1px solid var(--border);overflow:hidden; }

    .user-cell { display:flex;align-items:center;gap:0.65rem; }
    .user-avatar-sm { width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--blue,#4F46E5),var(--blue-light,#818CF8));color:#fff;font-size:0.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .user-meta { display:flex;flex-direction:column;gap:0.1rem; }
    .fw-600 { font-weight:600;font-size:0.875rem; }
    .text-dim { color:var(--text-dim); }
    .text-xs { font-size:0.72rem; }
    .text-muted { color:var(--text-muted); }

    .mono-sm { font-family:monospace;font-size:0.78rem;color:var(--text-dim); }

    .type-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:0.72rem;font-weight:700;letter-spacing:.03em; }
    .type-luz      { background:rgba(251,191,36,.12);color:#F59E0B;border:1px solid rgba(251,191,36,.25); }
    .type-gas      { background:rgba(249,115,22,.12);color:#F97316;border:1px solid rgba(249,115,22,.25); }
    .type-movil    { background:rgba(139,92,246,.12);color:#8B5CF6;border:1px solid rgba(139,92,246,.25); }
    .type-internet { background:rgba(6,182,212,.12);color:#06B6D4;border:1px solid rgba(6,182,212,.25); }

    .tariff-cell { display:flex;flex-direction:column;gap:2px; }
    .tariff-code { font-family:monospace;font-size:0.72rem;color:var(--blue-light,#818CF8);background:rgba(79,70,229,.1);padding:1px 5px;border-radius:4px;border:1px solid rgba(79,70,229,.2);width:fit-content; }

    .savings-val { font-size:0.85rem;font-weight:700;color:#059669; }

    .empty-state { display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding:3rem;color:var(--text-dim); }
    .empty-state .pi { font-size:2rem; }
    .empty-state span { font-size:0.875rem; }

    .btn-ver { display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:0.78rem;font-weight:500;cursor:pointer;transition:all 120ms; }
    .btn-ver:hover { border-color:var(--blue);color:var(--blue);background:var(--blue-glow-sm); }

    .pag-info { font-size:0.78rem; color:var(--sx-text-2); font-weight:500; white-space:nowrap; }
    .pag-right { display:flex; align-items:center; gap:0.5rem; }
    .jtp-wrap  { display:flex; align-items:center; gap:4px; }
    .jtp-input { width:52px;height:32px;border-radius:6px;border:1px solid var(--sx-border);background:transparent;color:var(--sx-text);font-size:0.8rem;text-align:center;padding:0;outline:none; }
    .jtp-input:focus { border-color:var(--sx-primary); }
    .jtp-btn { height:32px;padding:0 0.65rem;border-radius:6px;border:1px solid var(--sx-border);background:transparent;color:var(--sx-text-2);font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 120ms; }
    .jtp-btn:hover { border-color:var(--sx-primary); color:var(--sx-primary); }

    /* Detail modal */
    .det-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:600;padding:1rem;animation:fadeInOv 150ms ease; }
    @keyframes fadeInOv { from{opacity:0} to{opacity:1} }
    .det-modal { background:var(--surface,#1A1D2E);border:1px solid var(--border);border-radius:16px;width:min(92vw,660px);max-height:88vh;overflow-y:auto;animation:slideInDet 200ms ease-out;display:flex;flex-direction:column; }
    @keyframes slideInDet { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
    @media(min-width:900px){ .det-modal{ width:min(75vw,820px); } }

    .det-head { display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--border); }
    .det-head-info { display:flex;align-items:center;flex-wrap:wrap;gap:0.6rem;flex:1;min-width:0; }
    .det-avatar { width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--blue,#4F46E5),var(--blue-light,#818CF8));color:#fff;font-size:0.9rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .det-name { font-size:0.9rem;font-weight:700;color:var(--text-primary); }
    .det-email { font-size:0.75rem;color:var(--text-dim);margin-top:1px; }
    .det-tariff-chip { font-family:monospace;font-size:0.72rem;color:var(--blue-light,#818CF8);background:rgba(79,70,229,.12);padding:2px 8px;border-radius:4px;border:1px solid rgba(79,70,229,.25); }
    .det-close { width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 120ms; }
    .det-close:hover { color:#DC2626;border-color:#FECACA;background:#FEF2F2; }

    /* Savings banner */
    .det-savings { display:flex;flex-wrap:wrap;gap:1px;background:var(--border);border-bottom:1px solid var(--border); }
    .det-saving-main { flex:1.5;min-width:140px;display:flex;flex-direction:column;gap:3px;padding:0.9rem 1.5rem;background:rgba(5,150,105,.08); }
    .det-saving-meta { flex:1;min-width:120px;display:flex;flex-direction:column;gap:3px;padding:0.9rem 1.25rem;background:var(--surface); }
    .det-saving-lbl { font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim); }
    .det-saving-val { font-size:1.3rem;font-weight:800;color:#059669; }
    .det-saving-svc { font-size:0.82rem;font-weight:600;color:var(--text-primary); }
    .det-origin-badge { font-size:0.75rem;font-weight:600;color:var(--blue-light,#818CF8);background:rgba(79,70,229,.1);padding:2px 8px;border-radius:10px;border:1px solid rgba(79,70,229,.2);width:fit-content; }

    /* Body */
    .det-body { padding:1rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:1.25rem; }
    .det-section { display:flex;flex-direction:column;gap:0.65rem; }
    .det-section-title { font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);display:flex;align-items:center;gap:6px;padding-bottom:0.4rem;border-bottom:1px solid var(--border); }
    .det-section-title .pi { font-size:0.65rem;color:var(--blue-light,#818CF8); }
    .det-grid { display:grid;grid-template-columns:1fr 1fr;gap:0.75rem; }
    @media(min-width:600px){ .det-grid{ grid-template-columns:1fr 1fr 1fr; } }
    .det-field { display:flex;flex-direction:column;gap:2px; }
    .det-field.span-2 { grid-column:span 2; }
    .det-lbl { font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-dim); }
    .det-val { font-size:0.82rem;font-weight:500;color:var(--text-primary);word-break:break-all; }
    .det-val.mono { font-family:monospace; }
  `]
})
export class SuppliesComponent implements OnInit {
  private svc = inject(SuppliesService);

  items: Supply[] = [];
  total      = 0;
  totalPages = 1;
  loading    = signal(true);
  loadError  = '';
  page       = 1;
  pageSize   = 20;
  jumpPage   = 1;
  viewingItem = signal<Supply | null>(null);

  pageSizeOpts = [
    { label: '10 / pág', value: 10 },
    { label: '20 / pág', value: 20 },
    { label: '50 / pág', value: 50 },
  ];

  filterStatus:   SupplyStatus | null = null;
  filterCategory: CategoryCode | null = null;
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

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
      page: this.page, pageSize: this.pageSize,
      status:      this.filterStatus   ?? undefined,
      serviceType: this.filterCategory ?? undefined,
      dateFrom: this.dateFrom ? this.dateFrom.toISOString().split('T')[0] : undefined,
      dateTo:   this.dateTo   ? this.dateTo.toISOString().split('T')[0]   : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  r => { this.items = r.items ?? []; this.total = r.totalCount ?? 0; this.totalPages = r.totalPages ?? 1; },
      error: e => { this.loadError = e?.status === 401 ? 'Sin autorización. Verifica tu sesión.' : 'Error al cargar los suministros. Inténtalo de nuevo.'; },
    });
  }

  search() { this.page = 1; this.load(); }
  clear()  { this.filterStatus = null; this.filterCategory = null; this.dateFrom = null; this.dateTo = null; this.search(); }

  openDetail(s: Supply) { this.viewingItem.set(s); }

  onLazy(e: TableLazyLoadEvent) {
    if (e.rows) this.pageSize = e.rows;
    this.page = ((e.first ?? 0) / this.pageSize) + 1;
    this.load();
  }

  goToPage() { this.page = Math.max(1, Math.min(this.jumpPage, this.totalPages)); this.load(); }
  onPageSizeChange() { this.page = 1; this.load(); }

  typeIcon(t: string): string {
    const m: Record<string, string> = { LUZ: 'pi-sun', GAS: 'pi-fire', MOVIL: 'pi-mobile', INTERNET: 'pi-wifi' };
    return m[t] ?? 'pi-bolt';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { InProgress: 'En proceso', Active: 'Activo', Pending: 'Pendiente', Cancelled: 'Cancelado', Completed: 'Completado' };
    return m[s] ?? s;
  }

  statusSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const m: Record<string, any> = { Active: 'success', InProgress: 'info', Pending: 'warn', Cancelled: 'danger', Completed: 'secondary' };
    return m[s] ?? 'secondary';
  }
}
