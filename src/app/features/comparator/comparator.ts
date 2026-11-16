import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ComparisonsService } from '../../core/services/comparisons.service';
import { ServicesService } from '../../core/services/services.service';
import { ServiceType, ServiceTariff, ServiceGroup } from '../../core/models/service.model';
import { LuzOcrResult } from '../../core/models/comparison.model';
import { SupplyKind, SupplyOption } from '../../core/models/supply.model';
import { computeSupplyComparison, SupplyComparisonResult } from '../../core/helpers/supply-comparison.helpers';
import { ConfigureProduct } from '../../shared/components/configure-product/configure-product';
import { BasikoLoader } from '../../shared/components/basiko-loader/basiko-loader';
import { SupplyTypeStep } from '../../shared/components/supply-type-step/supply-type-step';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-comparator',
  standalone: true,
  imports: [DecimalPipe, ConfigureProduct, BasikoLoader, SupplyTypeStep, Icon],
  templateUrl: './comparator.html',
})
export class ComparatorComponent implements OnDestroy {
  private comparisons = inject(ComparisonsService);
  private servicesSvc = inject(ServicesService);
  private sanitizer = inject(DomSanitizer);

  private readonly supplyKindToServiceType: Record<'electricity' | 'gas' | 'internet', ServiceType> = {
    electricity: 'LUZ',
    gas: 'GAS',
    internet: 'INTERNET',
  };

  selectedSupply = signal<SupplyKind>(null);

  showInvoiceModal = signal(false);
  invoiceFile = signal<File | null>(null);
  invoicePreviewUrl = signal<SafeResourceUrl | null>(null);
  invoicePreviewKind = signal<'image' | 'pdf' | 'other'>('other');
  invoiceSubmitted = false;
  private invoiceObjectUrl: string | null = null;

  comparisonLoading = signal(false);
  comparisonError = signal('');

  comparison = signal<SupplyComparisonResult | null>(null);
  showResultModal = signal(false);

  matchedTariffDetail = signal<ServiceTariff | null>(null);
  luzOcrData = signal<LuzOcrResult | null>(null);
  showConfigureProduct = signal(false);

  /** Internet bloqueado por lo pronto, igual que en el alta de suministro — solo hay tarifas de luz y gas */
  supplyOptions: SupplyOption[] = [
    { id: 'electricity', label: 'Comparar luz',      description: 'Compara una factura de luz con nuestras tarifas',      icon: 'bolt',   available: true  },
    { id: 'gas',         label: 'Comparar gas',       description: 'Compara una factura de gas con nuestras tarifas',      icon: 'cloud',  available: true  },
    { id: null,          label: 'Comparar internet',  description: 'Compara una factura de internet con nuestras tarifas', icon: 'wifi',   available: false },
  ];

  /** Abre el modal de "Sube la factura" apenas se elige el tipo — nunca se abandona esta pantalla, todo pasa en modales */
  selectSupply(kind: SupplyKind) {
    if (kind === null) return;
    this.selectedSupply.set(kind);
    this.invoiceSubmitted = false;
    this.comparisonError.set('');
    this.revokeInvoicePreview();
    this.comparison.set(null);
    this.matchedTariffDetail.set(null);
    this.luzOcrData.set(null);
    this.showConfigureProduct.set(false);
    this.showResultModal.set(false);
    this.showInvoiceModal.set(true);
  }

  closeInvoiceModal() {
    if (this.comparisonLoading()) return;
    this.showInvoiceModal.set(false);
  }

  onInvoiceFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setInvoiceFile(input.files[0]);
  }

  onInvoiceDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setInvoiceFile(file);
  }

  private setInvoiceFile(file: File) {
    this.revokeInvoicePreview();
    this.comparisonError.set('');
    this.invoiceObjectUrl = URL.createObjectURL(file);
    this.invoicePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.invoiceObjectUrl));
    this.invoicePreviewKind.set(
      file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'other',
    );
    this.invoiceFile.set(file);
  }

  private revokeInvoicePreview() {
    if (this.invoiceObjectUrl) {
      URL.revokeObjectURL(this.invoiceObjectUrl);
      this.invoiceObjectUrl = null;
    }
    this.invoiceFile.set(null);
    this.invoicePreviewUrl.set(null);
    this.invoicePreviewKind.set('other');
  }

  /** Procesa la factura y, al terminar, cierra este modal y abre el que corresponda: "Configura el producto"
   *  para luz (con tarifa Basiko encontrada), o el modal de resultado (consumo actual vs. con Basiko) para gas
   *  o cuando no se encuentra una tarifa equivalente. */
  submitInvoice() {
    this.invoiceSubmitted = true;
    const file = this.invoiceFile();
    const kind = this.selectedSupply();
    if (!file || kind === null) return;
    const serviceType = this.supplyKindToServiceType[kind];

    this.comparisonError.set('');
    this.comparisonLoading.set(true);

    this.comparisons.extract(file, serviceType).subscribe({
      next: ({ ocrData }) => {
        this.servicesSvc.getServices().subscribe({
          next: groups => {
            this.comparisonLoading.set(false);
            if (serviceType === 'LUZ' && ocrData.luz) {
              this.resolveLuzTariff(ocrData.luz, groups);
            } else {
              this.comparison.set(computeSupplyComparison(ocrData, groups));
              this.showInvoiceModal.set(false);
              this.showResultModal.set(true);
            }
          },
          error: () => {
            this.comparisonLoading.set(false);
            this.comparison.set(null);
            this.showInvoiceModal.set(false);
            this.showResultModal.set(true);
          },
        });
      },
      error: (e) => {
        this.comparisonLoading.set(false);
        this.comparisonError.set(e?.error?.error ?? e?.error?.message ?? 'No se pudo leer la factura. Inténtalo de nuevo.');
      },
    });
  }

  private resolveLuzTariff(luz: LuzOcrResult, groups: ServiceGroup[]) {
    const normalize = (s: string | null | undefined) => (s ?? '').trim().toUpperCase().replace(/\s+/g, '');
    const luzGroup = groups.find(g => normalize(g.serviceType) === 'LUZ');
    const matchedTariff = luzGroup?.tariffs.find(t => normalize(t.code) === normalize(luz.tarifa));

    if (!matchedTariff) {
      console.warn(
        '[Comparator] No se encontró tarifa Basiko para el código OCR:', luz.tarifa,
        '— códigos disponibles en catálogo LUZ:', luzGroup?.tariffs.map(t => t.code),
      );
      this.comparison.set(null);
      this.showInvoiceModal.set(false);
      this.showResultModal.set(true);
      return;
    }

    this.luzOcrData.set(luz);
    this.matchedTariffDetail.set(matchedTariff);
    this.showInvoiceModal.set(false);
    this.showConfigureProduct.set(true);
  }

  /** Desde el modal de resultado: vuelve a abrir el de subida, sin perder el tipo de suministro elegido */
  changeInvoice() {
    this.showResultModal.set(false);
    this.invoiceSubmitted = false;
    this.comparisonError.set('');
    this.revokeInvoicePreview();
    this.showInvoiceModal.set(true);
  }

  closeResultModal() {
    this.showResultModal.set(false);
  }

  closeConfigureProduct() {
    this.showConfigureProduct.set(false);
  }

  ngOnDestroy() {
    this.revokeInvoicePreview();
  }

  savingsClasses(negative: boolean): string {
    const base = 'flex items-center gap-2 py-3 px-4 rounded-lg mb-5 text-[0.9rem] font-bold';
    return negative ? `${base} bg-[#EF4444]/8 text-[#DC2626]` : `${base} bg-[#22C55E]/10 text-[#16A34A]`;
  }
}
