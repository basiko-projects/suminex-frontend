import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';

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
  imports: [NgTemplateOutlet, FormsModule, Icon],
  templateUrl: './data-table.html',
  host: { class: 'block' },
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

  filterBtnClasses(active: boolean): string {
    const base = 'w-5 h-5 rounded-lg shrink-0 border-none bg-transparent inline-flex items-center justify-center cursor-pointer transition-all p-0 [&_.pi]:text-[0.72rem]';
    return active
      ? `${base} bg-sx-primary-bg text-sx-primary`
      : `${base} text-sx-text-3 hover:bg-sx-surface-2 hover:text-sx-primary`;
  }

  pgBtnClasses(active: boolean): string {
    const base = 'w-[25.32px] h-[25.26px] rounded border text-xs font-medium cursor-pointer inline-flex items-center justify-center p-0 transition-all shrink-0 disabled:opacity-[0.28] disabled:cursor-not-allowed';
    return active
      ? `${base} bg-[#227CFF] border-[#227CFF] text-white font-bold`
      : `${base} border-[#EEEEEE] bg-[#F5F5F5] text-[#404B52] enabled:hover:border-[#227CFF] enabled:hover:text-[#227CFF]`;
  }

  readonly pgNavClasses = 'w-[26.33px] h-[25.26px] rounded border border-[#EEEEEE] bg-[#F5F5F5] text-[#404B52] text-xs font-medium cursor-pointer inline-flex items-center justify-center p-0 transition-all shrink-0 disabled:opacity-[0.28] disabled:cursor-not-allowed enabled:hover:border-[#227CFF] enabled:hover:text-[#227CFF]';
}
