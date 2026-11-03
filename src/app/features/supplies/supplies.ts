import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SuppliesService } from '../../core/services/supplies.service';
import { Supply, SupplyStatus, CategoryCode, ExternalSubmissionStatus } from '../../core/models/supply.model';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { PopoverModule, Popover } from 'primeng/popover';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataTableComponent, DataTableColumn, SortOption } from '../../shared/components/data-table/data-table';
import { BasikoLoader } from '../../shared/components/basiko-loader/basiko-loader';
import { Icon, IconName } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-supplies',
  standalone: true,
  imports: [
    DatePipe, CurrencyPipe, FormsModule,
    SelectModule, DatePickerModule, TooltipModule, ButtonModule, PopoverModule, ConfirmDialogModule, ToastModule,
    DataTableComponent, BasikoLoader, Icon,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './supplies.html',
})
export class SuppliesComponent implements OnInit {
  private svc     = inject(SuppliesService);
  private confirm = inject(ConfirmationService);
  private msg     = inject(MessageService);

  items:      Supply[] = [];
  total       = 0;
  totalPages  = 1;
  loading     = signal(true);
  loadError   = '';
  page        = 1;
  pageSize    = 10;
  viewingItem = signal<Supply | null>(null);
  completingId  = signal<string | null>(null);
  completeError = signal('');
  cancellingId  = signal<string | null>(null);

  externalSubmission        = signal<ExternalSubmissionStatus | null>(null);
  loadingExternalSubmission = signal(false);
  retryingExternalSubmission = signal(false);

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
      { key: 'commercial', label: 'Comercial' },
      { key: 'type',    label: 'Tipo',       align: 'center', filterIcon: true, filterActive: this.filterCategory !== null },
      { key: 'tariff',  label: 'Tarifa' },
      { key: 'status',  label: 'Estado',     align: 'center', filterIcon: true, filterActive: this.filterStatus !== null },
      { key: 'detail',  label: '',           align: 'center', width: '60px' },
    ];
  }

  tableSortOptions: SortOption[] = [
    { label: 'Más recientes', value: 'newest' },
    { label: 'Más antiguos',  value: 'oldest' },
  ];

  statusOpts = [
    { label: 'Pendiente verificación', value: 'PendingIdentityVerification' },
    { label: 'Pendiente (antiguo)',    value: 'Pending' },
    { label: 'En proceso',             value: 'InProgress' },
    { label: 'Optimizado',             value: 'Optimized' },
    { label: 'Cancelado',              value: 'Cancelled' },
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

  openDetail(s: Supply) {
    this.viewingItem.set(s);
    this.completeError.set('');
    this.loadExternalSubmission(s.id);
  }

  /** GET /api/supplies/{id}/external-submission — 404 es el caso normal (proveedor sin integración), no se muestra como error */
  private loadExternalSubmission(supplyId: string) {
    this.externalSubmission.set(null);
    this.loadingExternalSubmission.set(true);
    this.svc.getExternalSubmission(supplyId).subscribe({
      next: res => { this.externalSubmission.set(res); this.loadingExternalSubmission.set(false); },
      error: () => { this.externalSubmission.set(null); this.loadingExternalSubmission.set(false); },
    });
  }

  retryExternalSubmission() {
    const s = this.viewingItem();
    if (!s || this.retryingExternalSubmission()) return;
    this.retryingExternalSubmission.set(true);
    this.svc.retryExternalSubmission(s.id).subscribe({
      next: res => {
        this.externalSubmission.set(res);
        this.retryingExternalSubmission.set(false);
      },
      error: (e) => {
        this.retryingExternalSubmission.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.message ?? 'No se pudo reintentar el envío.' });
      },
    });
  }

  onPageChange(p: number)        { this.page = p; this.load(); }
  onSortChange(_sort: string)    { this.page = 1; this.load(); }
  onPageSizeChange(size: number) { this.pageSize = size; this.page = 1; this.load(); }

  onFilterIconClick(e: { key: string; event: Event }, tipoPop: Popover, estadoPop: Popover) {
    if (e.key === 'type')   tipoPop.toggle(e.event);
    if (e.key === 'status') estadoPop.toggle(e.event);
  }

  typeIcon(t: string): IconName {
    const m: Record<string, IconName> = { LUZ: 'sun', GAS: 'fire', MOVIL: 'device-phone-mobile', INTERNET: 'wifi' };
    return m[t] ?? 'bolt';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      PendingIdentityVerification: 'Pendiente verificación',
      Pending:    'Pendiente',
      InProgress: 'En proceso',
      Optimized:  'Optimizado',
      Cancelled:  'Cancelado',
    };
    return m[s] ?? s;
  }

  dateFilterBtnClasses(active: boolean): string {
    const base = 'w-8.5 h-8.5 rounded-lg shrink-0 border inline-flex items-center justify-center cursor-pointer transition-all';
    return active
      ? `${base} bg-sx-primary-bg border-sx-primary text-sx-primary`
      : `${base} border-sx-border-2 bg-sx-surface text-sx-text-3 hover:bg-sx-surface-2 hover:text-sx-primary`;
  }

  typeBadgeClasses(type: string): string {
    const base = 'inline-flex items-center gap-1 py-[3px] px-2.5 rounded-lg text-[0.7rem] font-bold tracking-wide border';
    const variants: Record<string, string> = {
      luz:      'bg-[rgba(251,191,36,.12)] text-[#B8860B] border-[rgba(251,191,36,.3)]',
      gas:      'bg-[rgba(249,115,22,.12)] text-[#C2540A] border-[rgba(249,115,22,.3)]',
      movil:    'bg-[rgba(139,92,246,.12)] text-[#7C5CDE] border-[rgba(139,92,246,.3)]',
      internet: 'bg-[rgba(34,124,255,.12)] text-[#1A6FE8] border-[rgba(34,124,255,.3)]',
    };
    return `${base} ${variants[type.toLowerCase()] ?? variants['internet']}`;
  }

  statusBadgeClasses(status: string): string {
    const base = 'inline-flex items-center py-1 px-3 rounded-lg text-[0.7rem] font-bold border-none cursor-pointer uppercase tracking-wider';
    const variants: Record<string, string> = {
      pendingidentityverification: 'bg-[rgba(100,116,139,.1)] text-[#475569]',
      pending:                     'bg-[rgba(100,116,139,.1)] text-[#475569]',
      inprogress:                  'bg-[rgba(217,119,6,.12)] text-[#B45309]',
      optimized:                   'bg-[rgba(22,163,74,.12)] text-[#16A34A]',
      cancelled:                   'bg-[rgba(220,38,38,.1)] text-[#DC2626]',
    };
    return `${base} ${variants[status.toLowerCase()] ?? variants['pending']} disabled:opacity-60 disabled:cursor-not-allowed`;
  }

  /** Transiciones válidas desde cada estado — reflejan lo que el backend realmente acepta (complete solo desde InProgress, cancel en cualquier estado salvo ya cancelado) */
  statusSelectOptions(status: SupplyStatus): { label: string; value: SupplyStatus }[] {
    const opts = [{ label: this.statusLabel(status), value: status }];
    if (status === 'InProgress') opts.push({ label: 'Optimizado', value: 'Optimized' as SupplyStatus });
    if (status !== 'Cancelled') opts.push({ label: 'Cancelado', value: 'Cancelled' as SupplyStatus });
    return opts;
  }

  onStatusChange(s: Supply, newStatus: SupplyStatus) {
    if (newStatus === s.status) return;
    if (newStatus === 'Optimized') this.completeSupply(s);
    else if (newStatus === 'Cancelled') this.cancelSupply(s);
  }

  /** POST /api/supplies/{id}/complete — solo válido desde InProgress; deja el suministro facturable.
   *  Sin body — el producto (si aplica) ya quedó guardado desde el alta directa. */
  completeSupply(s: Supply) {
    if (this.completingId()) return;
    this.completingId.set(s.id);
    this.completeError.set('');
    this.svc.complete(s.id).subscribe({
      next: (res) => {
        this.completingId.set(null);
        s.status = res.status;
        s.optimizedAt = res.optimizedAt;
      },
      error: (e) => {
        this.completingId.set(null);
        this.completeError.set(e?.error?.message ?? 'No se pudo optimizar el suministro. Inténtalo de nuevo.');
      },
    });
  }

  /** POST /api/supplies/{id}/cancel — Admin, o el Collaborator dueño; funciona en cualquier estado salvo ya cancelado */
  cancelSupply(s: Supply) {
    this.confirm.confirm({
      message:     `¿Dar de baja el suministro de <strong>${s.holderName}</strong>? Esta acción no se puede deshacer.`,
      header:      'Confirmar baja',
      icon:        'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cancellingId.set(s.id);
        this.svc.cancel(s.id).subscribe({
          next: (res) => {
            this.cancellingId.set(null);
            s.status = res.status;
            s.cancellationReason = res.cancellationReason;
            s.cancelledAt = res.cancelledAt;
            this.msg.add({ severity: 'success', summary: 'Suministro dado de baja', detail: `${s.holderName} fue dado de baja.` });
          },
          error: (e) => {
            this.cancellingId.set(null);
            this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.message ?? 'No se pudo dar de baja el suministro.' });
          },
        });
      },
    });
  }
}
