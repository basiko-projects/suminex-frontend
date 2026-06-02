import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComparisonHistoryService } from '../../core/services/comparison-history.service';
import { ComparisonHistoryItem, ComparisonHistoryFilters } from '../../core/models/comparison-history.model';
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
    DatePipe, CurrencyPipe, FormsModule,
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
      <p-iconfield>
        <p-inputicon class="pi pi-user" />
        <input pInputText [(ngModel)]="filters.userId" placeholder="Buscar por ID de usuario…" (keyup.enter)="search()" />
      </p-iconfield>
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
            <th>#</th>
            <th>Usuario</th>
            <th>CUPS</th>
            <th>Ahorro estimado</th>
            <th>Calculado</th>
            <th style="text-align:center">Contratado</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-item>
          <tr>
            <td class="id-cell">#{{ item.id }}</td>
            <td>
              <div class="user-cell">
                <div class="user-avatar-sm">{{ item.userEmail.charAt(0).toUpperCase() }}</div>
                <div class="user-meta">
                  <span class="fw-600">{{ item.userEmail }}</span>
                  <span class="text-dim text-xs">{{ item.userId }}</span>
                </div>
              </div>
            </td>
            <td><code>{{ item.cups }}</code></td>
            <td><span class="savings-value">{{ item.estimatedSavings | currency:'EUR':'symbol':'1.2-2' }}</span></td>
            <td class="text-muted text-sm">{{ item.calculatedAt | date:'dd/MM/yy · HH:mm' }}</td>
            <td style="text-align:center">
              <p-tag [value]="item.contracted ? 'Sí' : 'No'"
                     [severity]="item.contracted ? 'success' : 'secondary'" />
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
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); }
    .page-header h1 { font-size:1.6rem; font-weight:800; letter-spacing:-0.02em; }
    .page-subtitle { color:var(--text-muted); font-size:0.83rem; margin-top:0.25rem; }

    .total-badge {
      display:flex; align-items:center; gap:0.5rem;
      background:var(--blue-glow-sm); border:1px solid var(--border-blue);
      color:var(--blue-light); font-size:0.82rem; font-weight:600;
      padding:0.5rem 1rem; border-radius:10px;
    }
    .total-badge .pi { font-size:0.8rem; }

    .id-cell { color:var(--text-dim); font-size:0.78rem; font-family:monospace; }

    .user-cell { display:flex; align-items:center; gap:0.65rem; }
    .user-avatar-sm {
      width:30px; height:30px; border-radius:50%;
      background:linear-gradient(135deg, var(--blue), var(--blue-light));
      color:#fff; font-size:0.75rem; font-weight:700;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .user-meta { display:flex; flex-direction:column; gap:0.1rem; }
    .fw-600 { font-weight:600; font-size:0.85rem; }
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
export class ComparisonHistoryComponent {
  private svc = inject(ComparisonHistoryService);

  items: ComparisonHistoryItem[] = [];
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

  filters: ComparisonHistoryFilters = {};
  contractedFilter: boolean | null = null;
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

  contractedOpts = [
    { label: 'Contratado',     value: true  },
    { label: 'No contratado',  value: false },
  ];

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll({
      ...this.filters,
      page: this.page,
      pageSize: this.pageSize,
      contracted: this.contractedFilter !== null ? this.contractedFilter! : undefined,
      from: this.dateFrom ? this.dateFrom.toISOString().split('T')[0] : undefined,
      to:   this.dateTo   ? this.dateTo.toISOString().split('T')[0]   : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  r => { this.items = r.data?.items ?? []; this.total = r.data?.total ?? 0; },
      error: e => { this.loadError = e?.status === 401 ? 'Sin autorización. Verifica tu sesión.' : 'Error al cargar el historial. Inténtalo de nuevo.'; },
    });
  }

  search() { this.page = 1; this.load(); }

  clear() {
    this.filters = {};
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
    const p = Math.max(1, Math.min(this.jumpPage, this.totalPages));
    this.page = p;
    this.load();
  }
  onPageSizeChange() { this.page = 1; this.load(); }
}
