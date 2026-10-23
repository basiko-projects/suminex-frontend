import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataTableComponent, DataTableColumn } from '../../shared/components/data-table/data-table';
import { Icon } from '../../shared/components/icon/icon';
import { BasikoLoader } from '../../shared/components/basiko-loader/basiko-loader';
import { FiscalProfileDialogService } from '../../shared/services/fiscal-profile-dialog.service';
import { BillingContextService } from '../../shared/services/billing-context.service';
import { AuthService } from '../../core/services/auth.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { FiscalProfileService } from '../../core/services/fiscal-profile.service';
import { AvailableInvoiceResponse, InvoiceListItem, InvoiceTrend } from '../../core/models/invoice.model';

interface GeneratedInvoice {
  invoiceNumber: string;
  total: number;
  pdfUrl: string;
}

const PAGE_SIZE = 10;
const GENERIC_ERROR = 'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde.';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, DataTableComponent, BasikoLoader, Icon],
  templateUrl: './billing.html',
})
export class BillingComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private billingContext = inject(BillingContextService);
  private invoicesSvc = inject(InvoicesService);
  private fiscalSvc = inject(FiscalProfileService);
  profileDialog = inject(FiscalProfileDialogService);

  readonly isAdmin = this.auth.isAdmin();

  tableColumns: DataTableColumn[] = this.isAdmin
    ? [
        { key: 'invoiceNumber', label: 'Nº factura' },
        { key: 'collaborator',  label: 'Colaborador' },
        { key: 'period',        label: 'Período' },
        { key: 'total',         label: 'Total' },
        { key: 'status',        label: 'Estado', align: 'center' },
      ]
    : [
        { key: 'invoiceNumber', label: 'Nº factura' },
        { key: 'period',        label: 'Período' },
        { key: 'total',         label: 'Total' },
        { key: 'status',        label: 'Estado', align: 'center' },
      ];

  // ── Solo Admin con colaborador elegido: previsualización de lo pendiente antes de generar (feed de /available) ──
  pendingColumns: DataTableColumn[] = [
    { key: 'client', label: 'Cliente' },
    { key: 'type',   label: 'Tipo',     align: 'center' },
    { key: 'phone',  label: 'Teléfono' },
    { key: 'amount', label: 'Importe' },
    { key: 'amountVat', label: 'Importe + IVA' },
    { key: 'status', label: 'Estado',   align: 'center' },
  ];

  // ── Solo Admin: se llega con un colaborador ya elegido (desde Usuarios), acá solo se elige el período ──
  selectedCollaboratorId   = signal<string | null>(null);
  selectedCollaboratorName = signal<string | null>(null);
  period = signal<string>(this.currentMonthStr());

  available        = signal<AvailableInvoiceResponse | null>(null);
  loadingAvailable  = signal(false);
  availableError    = signal('');
  generating        = signal(false);
  generateError     = signal('');
  lastGenerated     = signal<GeneratedInvoice | null>(null);

  // ── Solo Colaborador: si le faltan datos fiscales ──
  hasFiscalProfile = signal<boolean | null>(null);

  // ── Historial (Admin: filtrable por colaborador · Colaborador: el propio) ──
  historyItems   = signal<InvoiceListItem[]>([]);
  historyTotal   = signal(0);
  historyPage    = signal(1);
  historyLoading = signal(false);

  constructor() {
    if (!this.isAdmin) {
      effect(() => {
        if (this.profileDialog.savedAt() > 0) this.checkFiscalProfile();
      });
    }
  }

  ngOnInit() {
    if (this.isAdmin) {
      const target = this.billingContext.consumeTarget();
      if (target) {
        // Con colaborador elegido la tabla muestra lo pendiente (/available), no el historial — no hace falta /invoices acá
        this.selectedCollaboratorId.set(target.collaboratorId);
        this.selectedCollaboratorName.set(target.collaboratorName);
        this.checkAvailable();
      } else {
        this.loadHistory(1);
      }
    } else {
      this.checkFiscalProfile();
      // Mismo flujo que el Admin, pero con el propio id sacado del token — sin selector de colaborador
      const ownId = this.auth.getUserId();
      if (ownId) {
        this.selectedCollaboratorId.set(ownId);
        this.checkAvailable();
      } else {
        this.loadHistory(1);
      }
    }
  }

  private currentMonthStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private checkFiscalProfile() {
    this.fiscalSvc.get().subscribe({
      next: profile => this.hasFiscalProfile.set(!!profile),
      error: () => this.hasFiscalProfile.set(null),
    });
  }

  onPeriodChange(period: string) {
    this.period.set(period);
    this.available.set(null);
    this.availableError.set('');
    this.clearLastGenerated();
    this.checkAvailable();
  }

  private checkAvailable() {
    const collaboratorId = this.selectedCollaboratorId();
    if (!collaboratorId || !this.period()) return;
    this.loadingAvailable.set(true);
    this.availableError.set('');
    this.invoicesSvc.getAvailable(collaboratorId, `${this.period()}-01`).subscribe({
      next: res => {
        this.loadingAvailable.set(false);
        this.available.set(res);
      },
      error: (e) => {
        this.loadingAvailable.set(false);
        this.availableError.set(e?.error?.message ?? GENERIC_ERROR);
      },
    });
  }

  generate() {
    const collaboratorId = this.selectedCollaboratorId();
    const available = this.available();
    if (!collaboratorId || !available || available.items.length === 0) return;
    this.generating.set(true);
    this.generateError.set('');
    this.invoicesSvc.generate({ collaboratorId, period: `${this.period()}-01` }).subscribe({
      next: (res) => {
        this.generating.set(false);
        this.clearLastGenerated();
        this.lastGenerated.set({
          invoiceNumber: res.invoiceNumber,
          total: res.total,
          pdfUrl: URL.createObjectURL(res.pdfBlob),
        });
        // Los ítems facturados desaparecen de /available automáticamente — re-consultamos para reflejarlo
        this.checkAvailable();
      },
      error: (e) => {
        this.generating.set(false);
        this.generateError.set(e?.error?.message ?? GENERIC_ERROR);
      },
    });
  }

  private clearLastGenerated() {
    const prev = this.lastGenerated();
    if (prev) URL.revokeObjectURL(prev.pdfUrl);
    this.lastGenerated.set(null);
  }

  ngOnDestroy() {
    this.clearLastGenerated();
  }

  loadHistory(page: number) {
    this.historyLoading.set(true);
    this.historyPage.set(page);
    const req = this.isAdmin
      ? this.invoicesSvc.getAll({ collaboratorId: this.selectedCollaboratorId() ?? undefined, page, pageSize: PAGE_SIZE })
      : this.invoicesSvc.getMine(page, PAGE_SIZE);
    req.subscribe({
      next: (res) => {
        this.historyLoading.set(false);
        this.historyItems.set(res.items);
        this.historyTotal.set(res.totalCount);
      },
      error: () => { this.historyLoading.set(false); },
    });
  }

  onHistoryPageChange(page: number) {
    this.loadHistory(page);
  }

  /** El backend no siempre manda percentChange — lo calculamos acá a partir de currentTotal/previousTotal.
   *  null cuando previousTotal es 0 (no hay base contra la cual comparar). */
  trendPercent(t: InvoiceTrend): number | null {
    if (!t.previousTotal) return null;
    return Math.round(((t.currentTotal - t.previousTotal) / t.previousTotal) * 100);
  }

  trendBadgeClasses(percentChange: number): string {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold';
    return percentChange >= 0 ? `${base} bg-sx-green-bg text-sx-green` : `${base} bg-sx-red-bg text-sx-red`;
  }

  pendingStatusLabel(status: string): string {
    return status === 'Cancelled' ? 'Cancelado' : 'Activo';
  }

  pendingStatusClasses(status: string): string {
    const base = 'inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold';
    return status === 'Cancelled' ? `${base} bg-sx-red-bg text-sx-red` : `${base} bg-sx-green-bg text-sx-green`;
  }
}
