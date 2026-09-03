import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { timeout } from 'rxjs/operators';
import { ComparisonsService } from '../../core/services/comparisons.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ServiceType } from '../../core/models/service.model';
import { ManualComparisonResponse } from '../../core/models/comparison.model';
import { SupplyKind, SupplyOption } from '../../core/models/supply.model';
import { SuminexLoader } from '../../shared/components/suminex-loader/suminex-loader';
import { SupplyTypeStep } from '../../shared/components/supply-type-step/supply-type-step';
import { HolderData, OwnershipChange, SupplyPointData } from './new-supply.types';
import { OwnershipStep } from './steps/ownership-step/ownership-step';
import { HolderDataStep } from './steps/holder-data-step/holder-data-step';
import { SupplyPointStep } from './steps/supply-point-step/supply-point-step';
import { DocumentsStep, SupplyDocuments } from './steps/documents-step/documents-step';
import { ResultStep } from './steps/result-step/result-step';

type Step = 1 | 2 | 3 | 4 | 5;

const GENERIC_ERROR = 'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde.';

@Component({
  selector: 'app-new-supply',
  standalone: true,
  imports: [
    SuminexLoader, SupplyTypeStep, OwnershipStep, HolderDataStep, SupplyPointStep, DocumentsStep, ResultStep,
  ],
  templateUrl: './new-supply.html',
})
export class NewSupplyComponent implements OnDestroy {
  private comparisonsSvc = inject(ComparisonsService);
  private suppliesSvc = inject(SuppliesService);
  private sanitizer = inject(DomSanitizer);

  private readonly supplyKindToServiceType: Record<'electricity' | 'gas' | 'internet', ServiceType> = {
    electricity: 'LUZ',
    gas: 'GAS',
    internet: 'INTERNET',
  };

  step = signal<Step>(1);
  selectedSupply = signal<SupplyKind>(null);
  ownershipType = signal<OwnershipChange>(null);
  status = signal<'idle' | 'success' | 'error'>('idle');
  submitError = signal('');
  verificationWarning = signal<string | null>(null);
  registering = signal(false);

  showInvoiceModal = signal(false);
  invoiceFile = signal<File | null>(null);
  invoicePreviewUrl = signal<SafeResourceUrl | null>(null);
  invoicePreviewKind = signal<'image' | 'pdf' | 'other'>('other');
  invoiceSubmitted = false;
  private invoiceObjectUrl: string | null = null;

  comparisonLoading = signal(false);
  comparisonError = signal('');
  comparisonResult = signal<ManualComparisonResponse | null>(null);
  holderPrefill = signal<Partial<HolderData> | null>(null);
  supplyPointPrefill = signal<Partial<SupplyPointData> | null>(null);

  supplyOptions: SupplyOption[] = [
    { id: 'electricity', label: 'Suministro de luz',      description: 'Dar de alta nuevo suministro de luz',      icon: 'pi-bolt',       available: true  },
    { id: 'gas',         label: 'Suministro de gas',      description: 'Dar de alta nuevo suministro de gas',      icon: 'pi-cloud',      available: true  },
    { id: 'internet',    label: 'Suministro de Internet', description: 'Dar de alta nuevo suministro de internet', icon: 'pi-wifi',       available: true  },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'pi-circle',     available: false },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'pi-circle',     available: false },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'pi-circle',     available: false },
  ];

  /** Finalizado de cada paso, se guarda acá porque register() lo necesita todo junto al final */
  private finalHolderData: HolderData | null = null;
  private finalSupplyPointData: SupplyPointData | null = null;

  private requiresCups(): boolean {
    return this.selectedSupply() === 'electricity' || this.selectedSupply() === 'gas';
  }

  selectSupply(kind: SupplyKind) {
    if (kind === null) return;
    this.selectedSupply.set(kind);
    this.step.set(2);
  }

  /** Con o sin cambio de titularidad, en ambos casos se pide la factura antes de seguir. */
  selectOwnership(type: OwnershipChange) {
    this.ownershipType.set(type);
    this.invoiceSubmitted = false;
    this.comparisonError.set('');
    this.revokeInvoicePreview();
    this.showInvoiceModal.set(true);
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

  closeInvoiceModal() {
    if (this.comparisonLoading()) return;
    this.showInvoiceModal.set(false);
    this.ownershipType.set(null);
    this.comparisonError.set('');
    this.revokeInvoicePreview();
  }

  /** Llama a POST /api/comparisons: OCR + selección de tarifa + cálculo en una sola llamada (flujo Manual, sin TariffId). */
  submitInvoice() {
    this.invoiceSubmitted = true;
    const file = this.invoiceFile();
    const kind = this.selectedSupply();
    if (!file || !kind) return;

    this.comparisonError.set('');
    this.comparisonLoading.set(true);
    const serviceType = this.supplyKindToServiceType[kind];

    this.comparisonsSvc.createManual(file, serviceType).subscribe({
      next: result => {
        this.comparisonLoading.set(false);
        this.comparisonResult.set(result);

        const holder = result.ocrData.holder;
        this.holderPrefill.set({
          fullName: holder.name ?? '',
          nationalId: holder.dni ?? '',
          phoneNumber: holder.phone ?? '',
          email: holder.email ?? '',
        });
        this.supplyPointPrefill.set({
          streetAddress: [holder.street, holder.number].filter(Boolean).join(' ').trim(),
          floor: holder.floor ?? '',
          door: holder.door ?? '',
          postalCode: holder.postalCode ?? '',
          province: holder.province ?? '',
          city: holder.locality ?? '',
          cups: result.ocrData.cups ?? '',
        });

        this.showInvoiceModal.set(false);
        this.step.set(3);
      },
      error: (e) => {
        this.comparisonLoading.set(false);
        this.comparisonError.set(e?.error?.message ?? 'No se pudo procesar la factura. Inténtalo de nuevo.');
      },
    });
  }

  ngOnDestroy() {
    this.revokeInvoicePreview();
  }

  onHolderSubmit(data: HolderData) {
    this.finalHolderData = data;
    this.step.set(4);
  }

  onSupplyPointSubmit(data: SupplyPointData) {
    this.finalSupplyPointData = data;
    this.step.set(5);
  }

  goBack() {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as Step);
  }

  /** POST /api/supplies/register-with-identity — único endpoint: crea el suministro y verifica identidad de una vez. */
  onDocumentsSubmit(files: SupplyDocuments) {
    const kind = this.selectedSupply();
    const comparison = this.comparisonResult();
    const holderData = this.finalHolderData;
    const supplyPointData = this.finalSupplyPointData;
    if (!kind || !comparison || !holderData || !supplyPointData) {
      this.submitError.set('Faltan datos para completar el alta. Vuelve a intentarlo desde el inicio.');
      this.status.set('error');
      return;
    }

    const form = new FormData();
    form.append('tariffId', String(comparison.tariffId));
    form.append('serviceType', this.supplyKindToServiceType[kind]);
    form.append('originFlow', 'Manual');
    form.append('estimatedSavings', String(comparison.annualSavings));
    form.append('comparisonHistoryId', comparison.comparisonHistoryId);
    if (comparison.ocrDocumentId) form.append('ocrDocumentId', comparison.ocrDocumentId);
    form.append('holderName', holderData.fullName.trim());
    form.append('holderDni', holderData.nationalId.trim());
    form.append('holderPhone', `${holderData.phoneCountry}${holderData.phoneNumber.replace(/\D/g, '')}`);
    form.append('holderEmail', holderData.email.trim());
    form.append('isUserTheHolder', String(this.ownershipType() === 'without-change'));
    const iban = supplyPointData.bankAccount.replace(/\s+/g, '');
    if (iban) form.append('holderIban', iban);
    form.append('street', supplyPointData.streetAddress.trim());
    if (supplyPointData.floor.trim()) form.append('floor', supplyPointData.floor.trim());
    if (supplyPointData.door.trim()) form.append('door', supplyPointData.door.trim());
    form.append('postalCode', supplyPointData.postalCode.trim());
    form.append('province', supplyPointData.province.trim());
    form.append('locality', supplyPointData.city.trim());
    if (this.requiresCups()) {
      form.append('cups', supplyPointData.cups.trim());
    } else {
      form.append('phoneToPort', supplyPointData.phoneToPort.replace(/\D/g, ''));
    }
    form.append('dniFront', files.idFront);
    form.append('dniBack', files.idBack);

    this.submitError.set('');
    this.verificationWarning.set(null);
    this.registering.set(true);
    this.suppliesSvc.registerWithIdentity(form).pipe(timeout(30000)).subscribe({
      next: (res) => {
        this.registering.set(false);
        if (!res.verificationSuccess) this.verificationWarning.set(res.verificationMessage ?? GENERIC_ERROR);
        this.status.set('success');
      },
      error: (e) => {
        this.registering.set(false);
        this.submitError.set(
          e?.name === 'TimeoutError'
            ? 'El servidor tardó demasiado en responder al dar de alta el suministro. Inténtalo de nuevo.'
            : (e?.error?.message ?? e?.error?.error ?? GENERIC_ERROR),
        );
        this.status.set('error');
      },
    });
  }

  reset() {
    this.status.set('idle');
    this.step.set(1);
    this.selectedSupply.set(null);
    this.ownershipType.set(null);
    this.submitError.set('');
    this.verificationWarning.set(null);
    this.registering.set(false);
    this.showInvoiceModal.set(false);
    this.invoiceSubmitted = false;
    this.revokeInvoicePreview();
    this.comparisonLoading.set(false);
    this.comparisonError.set('');
    this.comparisonResult.set(null);
    this.holderPrefill.set(null);
    this.supplyPointPrefill.set(null);
    this.finalHolderData = null;
    this.finalSupplyPointData = null;
  }
}
