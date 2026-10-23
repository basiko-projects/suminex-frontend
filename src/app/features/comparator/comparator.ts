import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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

type OcrStatus = 'idle' | 'uploading' | 'error' | 'done';

@Component({
  selector: 'app-comparator',
  standalone: true,
  imports: [DecimalPipe, ConfigureProduct, BasikoLoader, SupplyTypeStep, Icon],
  templateUrl: './comparator.html',
})
export class ComparatorComponent {
  private comparisons = inject(ComparisonsService);
  private servicesSvc = inject(ServicesService);

  private readonly supplyKindToServiceType: Record<'electricity' | 'gas' | 'internet', ServiceType> = {
    electricity: 'LUZ',
    gas: 'GAS',
    internet: 'INTERNET',
  };

  selectedSupply = signal<SupplyKind>(null);
  ocrStatus = signal<OcrStatus>('idle');
  ocrErrorMsg = signal('');
  comparison = signal<SupplyComparisonResult | null>(null);

  matchedTariffDetail = signal<ServiceTariff | null>(null);
  luzOcrData = signal<LuzOcrResult | null>(null);
  showConfigureProduct = signal(false);
  uploadedInvoiceName = signal<string | null>(null);

  supplyOptions: SupplyOption[] = [
    { id: 'electricity', label: 'Comparar luz',      description: 'Compara una factura de luz con nuestras tarifas',      icon: 'bolt',   available: true  },
    { id: 'gas',         label: 'Comparar gas',       description: 'Compara una factura de gas con nuestras tarifas',      icon: 'cloud',  available: true  },
    { id: 'internet',    label: 'Comparar internet',  description: 'Compara una factura de internet con nuestras tarifas', icon: 'wifi',   available: true  },
  ];

  selectSupply(kind: SupplyKind) {
    this.selectedSupply.set(kind);
    this.ocrStatus.set('idle');
    this.ocrErrorMsg.set('');
    this.comparison.set(null);
    this.matchedTariffDetail.set(null);
    this.luzOcrData.set(null);
    this.showConfigureProduct.set(false);
    this.uploadedInvoiceName.set(null);
  }

  goBack() {
    this.selectedSupply.set(null);
  }

  onInvoiceInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadAndCompare(file);
  }

  onInvoiceDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadAndCompare(file);
  }

  private uploadAndCompare(file: File) {
    const kind = this.selectedSupply();
    if (kind === null) return;
    const serviceType = this.supplyKindToServiceType[kind];

    this.uploadedInvoiceName.set(file.name);
    this.ocrStatus.set('uploading');
    this.ocrErrorMsg.set('');

    this.comparisons.extract(file, serviceType).subscribe({
      next: ({ ocrData }) => {
        this.servicesSvc.getServices().subscribe({
          next: groups => {
            if (serviceType === 'LUZ' && ocrData.luz) {
              this.resolveLuzTariff(ocrData.luz, groups);
            } else {
              this.comparison.set(computeSupplyComparison(ocrData, groups));
              this.ocrStatus.set('done');
            }
          },
          error: () => {
            this.comparison.set(null);
            this.ocrStatus.set('done');
          },
        });
      },
      error: (e) => {
        this.ocrErrorMsg.set(e?.error?.error ?? e?.error?.message ?? 'No se pudo leer la factura. Inténtalo de nuevo.');
        this.ocrStatus.set('error');
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
      this.ocrStatus.set('done');
      return;
    }

    this.luzOcrData.set(luz);
    this.matchedTariffDetail.set(matchedTariff);
    this.showConfigureProduct.set(true);
    this.ocrStatus.set('done');
  }

  retryInvoice() {
    this.ocrStatus.set('idle');
    this.ocrErrorMsg.set('');
    this.comparison.set(null);
    this.matchedTariffDetail.set(null);
    this.luzOcrData.set(null);
    this.showConfigureProduct.set(false);
  }

  closeConfigureProduct() {
    this.showConfigureProduct.set(false);
  }

  savingsClasses(negative: boolean): string {
    const base = 'flex items-center gap-2 py-3 px-4 rounded-lg mb-5 text-[0.9rem] font-bold';
    return negative ? `${base} bg-[#EF4444]/8 text-[#DC2626]` : `${base} bg-[#22C55E]/10 text-[#16A34A]`;
  }
}
