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
  templateUrl: './comparison-history.html',
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

  dateFilterBtnClasses(active: boolean): string {
    const base = 'w-8.5 h-8.5 rounded-lg shrink-0 border inline-flex items-center justify-center cursor-pointer transition-all';
    return active
      ? `${base} bg-sx-primary-bg border-sx-primary text-sx-primary`
      : `${base} border-sx-border-2 bg-sx-surface text-sx-text-3 hover:bg-sx-surface-2 hover:text-sx-primary`;
  }

  savingsValueClasses(positive: boolean): string {
    const base = 'text-[0.85rem] font-semibold';
    return positive ? `${base} text-sx-green` : `${base} text-sx-text-3`;
  }
}
