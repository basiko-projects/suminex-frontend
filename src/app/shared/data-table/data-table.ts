import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  filterIcon?: boolean;
  filterActive?: boolean;
}

export interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule],
  template: `
    <div class="dt">

      <!-- Header: title + search + sort -->
      <div class="dt-top">
        <div class="dt-head">
          <h2 class="dt-title">{{ title }}</h2>
          @if (subtitle) { <p class="dt-subtitle">{{ subtitle }}</p> }
        </div>
        <div class="dt-controls">
          @if (searchable) {
            <label class="dt-search">
              <i class="pi pi-search"></i>
              <input type="text" placeholder="Buscar..." [(ngModel)]="searchValue" (input)="onSearch()" />
            </label>
          }
          <ng-content select="[dtActions]"></ng-content>
          @if (sortOptions.length) {
            <div class="dt-sort">
              <i class="pi pi-calendar"></i>
              <span class="dt-sort-by">Ordenar por:</span>
              <select [(ngModel)]="sortValue" (change)="onSort()">
                @for (o of sortOptions; track o.value) {
                  <option [value]="o.value">{{ o.label }}</option>
                }
              </select>
              <i class="pi pi-chevron-down dt-sort-caret"></i>
            </div>
          }
        </div>
      </div>

      <!-- Table card -->
      <div class="dt-card">
        <div class="dt-scroll">
          <table class="dt-table">
            <thead>
              <tr>
                @for (col of columns; track col.key; let isFirst = $first, isLast = $last) {
                  <th
                    [class.dt-sticky-col]="isFirst && stickyFirstColumn"
                    [style.textAlign]="col.align ?? 'left'"
                    [style.width]="col.width ?? 'auto'"
                    [style.paddingTop]="'0.85rem'"
                    [style.paddingBottom]="'0.85rem'"
                    [style.paddingLeft]="isFirst ? '3rem' : '1.5rem'"
                    [style.paddingRight]="isLast ? '3rem' : '1.5rem'">
                    <span class="dt-th-inner" [style.justifyContent]="col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start')">
                      {{ col.label }}
                      @if (col.filterIcon) {
                        <button type="button" class="dt-filter-btn" [class.dt-filter-btn--active]="col.filterActive"
                                (click)="onFilterIconClick(col.key, $event)" [attr.title]="'Filtrar ' + col.label">
                          <i class="pi pi-hourglass"></i>
                        </button>
                      }
                    </span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @if (loading) {
                @for (i of skeletonRows; track i) {
                  <tr>
                    @for (col of columns; track col.key; let isFirst = $first) {
                      <td [class.dt-sticky-col]="isFirst && stickyFirstColumn"><div class="dt-skel"></div></td>
                    }
                  </tr>
                }
              } @else if (!rows.length) {
                <tr>
                  <td [attr.colspan]="columns.length" class="dt-empty-cell">
                    <div class="dt-empty">
                      <i class="pi pi-inbox"></i>
                      <span>{{ emptyMessage }}</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (row of rows; track $index; let isLast = $last) {
                  <tr>
                    <ng-container
                      [ngTemplateOutlet]="rowTemplate"
                      [ngTemplateOutletContext]="{ $implicit: row, isLast: isLast }" />
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Footer: info | page-size (centered) | pagination -->
        <div class="dt-footer">
          <span class="dt-info">
            Mostrando datos del <strong>{{ fromCount }}</strong> al <strong>{{ toCount }}</strong>
            de <strong>{{ formatCount(total) }}</strong> {{ total === 1 ? 'registro' : 'registros' }}
          </span>
          <div class="dt-pagesize">
            <span class="dt-pagesize-label">Mostrar</span>
            <select [(ngModel)]="pageSizeValue" (change)="onPageSizeChange()">
              @for (opt of pageSizeOptions; track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
            <span class="dt-pagesize-label">por página</span>
          </div>
          <div class="dt-pagination">
            <button class="dt-pg dt-pg--nav" (click)="prev()" [disabled]="page <= 1">‹</button>
            @for (p of pageList(); track p) {
              @if (p === '...') {
                <span class="dt-ellipsis">…</span>
              } @else {
                <button class="dt-pg" [class.dt-pg--active]="page === +p" (click)="goTo(+p)">{{ p }}</button>
              }
            }
            <button class="dt-pg dt-pg--nav" (click)="next()" [disabled]="page >= totalPages">›</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Header bar ── */
    .dt-top {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .dt-title {
      font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em;
      color: var(--sx-text); margin: 0 0 0.2rem;
    }
    .dt-subtitle { font-size: 0.83rem; color: var(--sx-text-3); margin: 0; }
    .dt-controls { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

    /* Search pill */
    .dt-search {
      display: flex; align-items: center; gap: 0.45rem;
      background: var(--sx-surface);
      border: 1px solid var(--sx-border-2);
      border-radius: 999px; padding: 0.45rem 0.9rem; cursor: text;
    }
    .dt-search .pi { font-size: 0.8rem; color: var(--sx-text-3); }
    .dt-search input {
      border: none; outline: none; background: transparent;
      font-size: 0.83rem; color: var(--sx-text);
      width: 170px; font-family: inherit;
    }
    .dt-search input::placeholder { color: var(--sx-text-3); }

    /* Sort control */
    .dt-sort {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.83rem; cursor: pointer;
      background: var(--sx-surface);
      border: 1px solid var(--sx-border-2);
      border-radius: 999px; padding: 0.45rem 0.9rem;
    }
    .dt-sort-by { color: var(--sx-text-3); white-space: nowrap; }
    .dt-sort > .pi-calendar { font-size: 0.8rem; color: var(--sx-text-3); }
    .dt-sort select {
      border: none; outline: none; background: transparent;
      font-size: 0.83rem; font-weight: 700; color: var(--sx-text);
      cursor: pointer; font-family: inherit;
      appearance: none; -webkit-appearance: none;
    }
    .dt-sort-caret { font-size: 0.65rem; color: var(--sx-text); }

    /* ── Card wrapper ── */
    .dt-card {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 30px;
      overflow: hidden;
      box-shadow: 0 10px 60px 0 rgba(226, 236, 249, 0.50);
    }
    .dt-scroll { overflow-x: auto; }

    /* ── Table ── */
    .dt-table { width: 100%; border-collapse: collapse; min-width: 560px; }

    /* Reset Tailwind preflight borders, then restore header separator */
    .dt-table thead, .dt-table tbody, .dt-table tfoot,
    .dt-table tr, .dt-table td {
      border: none;
    }
    .dt-table th {
      border: none;
      border-bottom: 1px solid var(--sx-border);
    }

    /* Header filter icon */
    .dt-th-inner { display: inline-flex; align-items: center; gap: 6px; width: 100%; }
    .dt-filter-btn {
      width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
      border: none; background: transparent; color: var(--sx-text-3);
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 140ms ease; padding: 0;
    }
    .dt-filter-btn .pi { font-size: 0.72rem; }
    .dt-filter-btn:hover { background: var(--sx-surface-2); color: var(--sx-primary); }
    .dt-filter-btn--active { background: var(--sx-primary-bg); color: var(--sx-primary); }

    .dt-table th {
      font-size: 14px; font-weight: 500;
      color: var(--sx-text-3); text-align: left; white-space: nowrap;
    }

    /* Sticky first column */
    .dt-sticky-col {
      position: sticky; left: 0; z-index: 3;
      background: var(--sx-surface);
      box-shadow: 2px 0 6px rgba(15, 23, 42, 0.05);
    }


    /* Row separators — inset via background-image */
    .dt-table tbody tr { transition: background-color 100ms; }

    /* Non-last rows: inset separator at bottom */
    .dt-table tbody tr:not(:last-child) {
      background-image: linear-gradient(#EEEEEE, #EEEEEE);
      background-size: calc(100% - 6rem) 1px;
      background-position: 3rem 100%;
      background-repeat: no-repeat;
    }


.dt-table tbody tr:hover { background-color: rgba(0,0,0,0.018); }
    .dt-table td {
      font-size: 14px; font-weight: 500; color: #292D32;
    }

    /* Skeleton loader */
    .dt-skel {
      height: 13px; border-radius: 4px; width: 75%;
      background: linear-gradient(
        90deg,
        var(--sx-surface-2) 25%,
        rgba(0,0,0,0.05) 50%,
        var(--sx-surface-2) 75%
      );
      background-size: 200% 100%;
      animation: dt-shimmer 1.5s ease infinite;
    }
    @keyframes dt-shimmer {
      from { background-position: 200% 0; }
      to   { background-position: -200% 0; }
    }

    /* Empty state */
    .dt-empty-cell { text-align: center; }
    .dt-empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.65rem; padding: 3rem 1rem; color: var(--sx-text-3);
    }
    .dt-empty .pi { font-size: 2rem; }
    .dt-empty span { font-size: 0.855rem; }

    /* ── Footer ── */
    .dt-footer {
      display: flex; align-items: center;
      padding: 1rem 3rem;
      border-top: 1px solid #EEEEEE;
      gap: 0.75rem;
    }
    .dt-info {
      flex: 1;
      font-size: 0.78rem; color: var(--sx-text-3);
      white-space: nowrap;
    }
    .dt-info strong { color: var(--sx-text-2); }

    /* Page-size selector */
    .dt-pagesize {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 12px; color: #404B52;
    }
    .dt-pagesize-label { white-space: nowrap; }
    .dt-pagesize select {
      height: 25.26px; padding: 0 0.5rem;
      border: 1px solid #EEEEEE; border-radius: 4px;
      background: #F5F5F5; color: #404B52;
      font-size: 12px; font-family: inherit; cursor: pointer; outline: none;
    }
    .dt-pagesize select:hover { border-color: #227CFF; }

    /* Pagination buttons */
    .dt-pagination { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 0.3rem; }
    .dt-pg {
      width: 25.32px; height: 25.26px; border-radius: 4px;
      border: 1px solid #EEEEEE;
      background: #F5F5F5;
      color: #404B52;
      font-size: 12px; font-weight: 500; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0; transition: all 120ms; font-family: inherit; flex-shrink: 0;
    }
    .dt-pg:hover:not(:disabled):not(.dt-pg--active) {
      border-color: #227CFF; color: #227CFF;
    }
    .dt-pg--active {
      background: #227CFF; border: 1px solid #227CFF;
      color: #FFFFFF; font-weight: 700;
    }
    .dt-pg--nav {
      width: 26.33px; height: 25.26px;
      font-size: 12px;
    }
    .dt-pg:disabled { opacity: 0.28; cursor: not-allowed; }
    .dt-ellipsis {
      font-size: 0.82rem; color: var(--sx-text-3);
      padding: 0 0.2rem; user-select: none;
    }
  `]
})
export class DataTableComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() columns: DataTableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() loading = false;
  @Input() searchable = true;
  @Input() sortOptions: SortOption[] = [];
  @Input() rowTemplate!: TemplateRef<any>;
  @Input() emptyMessage = 'No hay datos disponibles';
  @Input() stickyFirstColumn = false;

  @Output() pageChange       = new EventEmitter<number>();
  @Output() searchChange     = new EventEmitter<string>();
  @Output() sortChange       = new EventEmitter<string>();
  @Output() pageSizeChange   = new EventEmitter<number>();
  @Output() filterIconClick  = new EventEmitter<{ key: string; event: Event }>();

  searchValue   = '';
  sortValue     = '';
  pageSizeValue = this.pageSize;
  readonly skeletonRows    = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly pageSizeOptions = [1, 10, 20, 50, 100];

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get fromCount():  number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get toCount():    number { return Math.min(this.page * this.pageSize, this.total); }

  formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
    return n.toString();
  }

  pageList(): (number | string)[] {
    const t = this.totalPages, c = this.page;
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    const r: (number | string)[] = [1];
    if (c > 3)     r.push('...');
    for (let p = Math.max(2, c - 1); p <= Math.min(t - 1, c + 1); p++) r.push(p);
    if (c < t - 2) r.push('...');
    if (t > 1)     r.push(t);
    return r;
  }

  goTo(p: number) { if (p >= 1 && p <= this.totalPages) this.pageChange.emit(p); }
  prev() { if (this.page > 1)               this.pageChange.emit(this.page - 1); }
  next() { if (this.page < this.totalPages) this.pageChange.emit(this.page + 1); }
  onSearch() { this.searchChange.emit(this.searchValue); }
  onSort()   { this.sortChange.emit(this.sortValue); }
  onPageSizeChange() { this.pageSizeChange.emit(+this.pageSizeValue); }

  onFilterIconClick(key: string, event: Event) {
    event.stopPropagation();
    this.filterIconClick.emit({ key, event });
  }
}
