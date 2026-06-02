import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe, CurrencyPipe, SlicePipe } from '@angular/common';
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
    DatePipe, CurrencyPipe, SlicePipe, FormsModule,
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
                placeholder="Categoría" [showClear]="true"
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
            <th>Titular</th>
            <th>Usuario</th>
            <th style="text-align:center">Tipo</th>
            <th>Oferta / Proveedor</th>
            <th>CUPS</th>
            <th>Ahorro calc.</th>
            <th style="text-align:center">Estado</th>
            <th>Fecha</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-s>
          <tr>
            <td>
              <div class="holder-cell">
                <span class="fw-600">{{ s.holderName }}</span>
                <span class="text-dim text-xs">{{ s.holderDni }}</span>
              </div>
            </td>
            <td class="text-muted text-sm">{{ s.userEmail }}</td>
            <td style="text-align:center">
              <span [class]="'type-badge type-' + s.categoryCode.toLowerCase()">
                <i [class]="'pi ' + typeIcon(s.categoryCode)"></i>
                {{ s.categoryCode }}
              </span>
            </td>
            <td>
              <div class="offer-cell">
                <span class="fw-600">{{ s.offerName }}</span>
                <span class="text-dim text-xs">{{ s.providerName }}</span>
              </div>
            </td>
            <td><code>{{ s.cups || (s.id | slice:0:16) }}</code></td>
            <td><span class="savings-value">{{ s.calculatedSavings | currency:'EUR':'symbol':'1.2-2' }}</span></td>
            <td style="text-align:center">
              <p-tag [value]="statusLabel(s.status)" [severity]="statusSeverity(s.status)" />
            </td>
            <td class="text-muted text-sm">{{ s.createdAt | date:'dd/MM/yy' }}</td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="empty-state">
              <i class="pi pi-file-check"></i>
              <span>No hay suministros con los filtros aplicados</span>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); }
    .page-header h1 { font-size:1.6rem; font-weight:800; letter-spacing:-0.02em; }
    .page-subtitle { color:var(--text-muted); font-size:0.83rem; margin-top:0.25rem; }

    .total-badge {
      display:flex; align-items:center; gap:0.5rem;
      background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.25);
      color:var(--green); font-size:0.82rem; font-weight:600;
      padding:0.5rem 1rem; border-radius:10px;
    }
    .total-badge .pi { font-size:0.8rem; }

    .holder-cell, .offer-cell { display:flex; flex-direction:column; gap:0.1rem; }
    .fw-600 { font-weight:600; font-size:0.875rem; }
    .text-dim { color:var(--text-dim); }
    .text-xs { font-size:0.72rem; }
    .text-muted { color:var(--text-muted); }
    .text-sm { font-size:0.82rem; }

    .empty-state { display:flex; flex-direction:column; align-items:center; gap:0.75rem; padding:3rem; color:var(--text-dim); }
    .empty-state .pi { font-size:2rem; }
    .empty-state span { font-size:0.875rem; }

    .pag-info { font-size: 0.78rem; color: var(--sx-text-2); font-weight: 500; white-space: nowrap; }
    .pag-right { display: flex; align-items: center; gap: 0.5rem; }
    .jtp-wrap  { display: flex; align-items: center; gap: 4px; }
    .jtp-input {
      width: 52px; height: 32px; border-radius: 6px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text); font-size: 0.8rem; text-align: center;
      padding: 0; outline: none;
    }
    .jtp-input:focus { border-color: var(--sx-primary); }
    .jtp-btn {
      height: 32px; padding: 0 0.65rem; border-radius: 6px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-2); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 120ms;
    }
    .jtp-btn:hover { border-color: var(--sx-primary); color: var(--sx-primary); }
  `]
})
export class SuppliesComponent {
  private svc = inject(SuppliesService);

  items: Supply[] = [];
  total     = 0;
  loading   = signal(true);
  loadError = '';
  page     = 1;
  pageSize = 20;
  jumpPage = 1;
  pageSizeOpts = [
    { label: '10 / pág', value: 10 },
    { label: '20 / pág', value: 20 },
    { label: '50 / pág', value: 50 },
  ];
  get totalPages(): number { return Math.ceil(this.total / this.pageSize) || 1; }

  filterStatus:   SupplyStatus | null = null;
  filterCategory: CategoryCode | null = null;
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

  statusOpts = [
    { label: 'Pendiente',   value: 'Pending' },
    { label: 'Activo',      value: 'Active' },
    { label: 'Cancelado',   value: 'Cancelled' },
    { label: 'Completado',  value: 'Completed' },
  ];
  categoryOpts = [
    { label: 'Luz',      value: 'LUZ' },
    { label: 'Gas',      value: 'GAS' },
    { label: 'Móvil',    value: 'MOVIL' },
    { label: 'Internet', value: 'INTERNET' },
  ];

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll({
      page: this.page, pageSize: this.pageSize,
      status:       this.filterStatus   ?? undefined,
      categoryCode: this.filterCategory ?? undefined,
      from: this.dateFrom ? this.dateFrom.toISOString().split('T')[0] : undefined,
      to:   this.dateTo   ? this.dateTo.toISOString().split('T')[0]   : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  r => { this.items = r.data?.items ?? []; this.total = r.data?.total ?? 0; },
      error: e => { this.loadError = e?.status === 401 ? 'Sin autorización. Verifica tu sesión.' : 'Error al cargar los suministros. Inténtalo de nuevo.'; },
    });
  }

  search() { this.page = 1; this.load(); }
  clear()  { this.filterStatus = null; this.filterCategory = null; this.dateFrom = null; this.dateTo = null; this.search(); }

  onLazy(e: TableLazyLoadEvent) {
    if (e.rows) this.pageSize = e.rows;
    this.page = ((e.first ?? 0) / this.pageSize) + 1;
    this.load();
  }

  goToPage() {
    const p = Math.max(1, Math.min(this.jumpPage, this.totalPages));
    this.page = p;
    this.load();
  }
  onPageSizeChange() { this.page = 1; this.load(); }

  typeIcon(t: string): string {
    const m: Record<string, string> = { LUZ: 'pi-sun', GAS: 'pi-fire', MOVIL: 'pi-mobile', INTERNET: 'pi-wifi' };
    return m[t] ?? 'pi-bolt';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { Active: 'Activo', Pending: 'Pendiente', Cancelled: 'Cancelado', Completed: 'Completado' };
    return m[s] ?? s;
  }

  statusSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const m: Record<string, any> = { Active: 'success', Pending: 'warn', Cancelled: 'danger', Completed: 'info' };
    return m[s] ?? 'secondary';
  }
}
