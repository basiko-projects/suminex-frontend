import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { timeout } from 'rxjs/operators';
import { ComparisonsService } from '../../core/services/comparisons.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ServiceType } from '../../core/models/service.model';
import { ExtractComparisonResponse } from '../../core/models/comparison.model';
import { SupplyKind, SupplyOption } from '../../core/models/supply.model';
import { SuminexLoader } from '../../shared/components/suminex-loader/suminex-loader';
import { SupplyTypeStep } from '../../shared/components/supply-type-step/supply-type-step';
import { HolderData, OwnershipChange, SupplyPointData } from './new-supply.types';
import { OwnershipStep } from './steps/ownership-step/ownership-step';
import { HolderDataStep } from './steps/holder-data-step/holder-data-step';
import { SupplyPointStep } from './steps/supply-point-step/supply-point-step';
import { DocumentsStep, SupplyDocuments } from './steps/documents-step/documents-step';
import { ResultStep } from './steps/result-step/result-step';
import { Icon } from '../../shared/components/icon/icon';

type Step = 1 | 2 | 3 | 4;

const GENERIC_ERROR = 'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde.';

@Component({
  selector: 'app-new-supply',
  standalone: true,
  imports: [
    SuminexLoader, SupplyTypeStep, OwnershipStep, HolderDataStep, SupplyPointStep, DocumentsStep, ResultStep, Icon,
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
  extractResult = signal<ExtractComparisonResponse | null>(null);
  holderPrefill = signal<Partial<HolderData> | null>(null);
  supplyPointPrefill = signal<Partial<SupplyPointData> | null>(null);

  supplyOptions: SupplyOption[] = [
    { id: 'electricity', label: 'Suministro de luz',      description: 'Dar de alta nuevo suministro de luz',      icon: 'bolt',      available: true  },
    { id: 'gas',         label: 'Suministro de gas',      description: 'Dar de alta nuevo suministro de gas',      icon: 'cloud',     available: true  },
    { id: 'internet',    label: 'Suministro de Internet', description: 'Dar de alta nuevo suministro de internet', icon: 'wifi',      available: true  },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'no-symbol', available: false },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'no-symbol', available: false },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'no-symbol', available: false },
  ];

  /** Finalizado de cada paso, se guarda acá porque register() lo necesita todo junto al final */
  private finalHolderData: HolderData | null = null;
  private finalDocuments: SupplyDocuments | null = null;

  private requiresCups(): boolean {
    return this.selectedSupply() === 'electricity' || this.selectedSupply() === 'gas';
  }

  /** Al elegir el tipo de suministro se pasa al paso de titular (por debajo) y de una se pide la factura, en modal. */
  selectSupply(kind: SupplyKind) {
    if (kind === null) return;
    this.selectedSupply.set(kind);
    this.step.set(2);
    this.invoiceSubmitted = false;
    this.comparisonError.set('');
    this.revokeInvoicePreview();
    this.showInvoiceModal.set(true);
  }

  closeInvoiceModal() {
    if (this.comparisonLoading()) return;
    this.showInvoiceModal.set(false);
  }

  /** Con cambio de titular no tiene sentido prefillear con los datos del titular anterior leídos de la factura —
   *  se completan a mano. Sin cambio sí se mantiene el prefill de OCR ya cargado al subir la factura. */
  selectOwnership(type: OwnershipChange) {
    this.ownershipType.set(type);
    if (type === 'with-change') this.holderPrefill.set(null);
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

  /** Llama a POST /api/comparisons/extract: solo OCR, sin comparar tarifas ni guardar nada (el alta ahora es directa, sin comparativa). */
  submitInvoice() {
    this.invoiceSubmitted = true;
    const file = this.invoiceFile();
    const kind = this.selectedSupply();
    if (!file || !kind) return;

    this.comparisonError.set('');
    this.comparisonLoading.set(true);
    const serviceType = this.supplyKindToServiceType[kind];

    this.comparisonsSvc.extract(file, serviceType).subscribe({
      next: result => {
        this.comparisonLoading.set(false);
        this.extractResult.set(result);

        const { luz, gas, internet } = result.ocrData;
        const svcData = luz ?? gas ?? internet;
        const titular = svcData?.titular;
        this.holderPrefill.set({
          fullName: titular?.nombre ?? '',
          nationalId: titular?.dni ?? '',
          phoneNumber: titular?.telefono ?? '',
          email: titular?.email ?? '',
        });
        this.supplyPointPrefill.set({
          streetAddress: [titular?.calle, titular?.numero].filter(Boolean).join(' ').trim(),
          floor: titular?.piso ?? '',
          door: titular?.puerta ?? '',
          postalCode: titular?.codigoPostal ?? '',
          province: titular?.provincia ?? '',
          city: titular?.municipio ?? '',
          cups: luz?.cups ?? gas?.cups ?? '',
        });

        this.showInvoiceModal.set(false);
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
    this.step.set(3);
  }

  onDocumentsSubmit(files: SupplyDocuments) {
    this.finalDocuments = files;
    this.step.set(4);
  }

  goBack() {
    const s = this.step();
    /** Dentro del paso de titular, "volver" primero destapa la elección de titularidad antes de salir del paso */
    if (s === 2 && this.ownershipType()) {
      this.ownershipType.set(null);
      return;
    }
    if (s > 1) this.step.set((s - 1) as Step);
  }

  /** POST /api/supplies/register-direct — alta directa sin comparativa; OcrDocumentId es solo trazabilidad opcional
   *  y las fotos de DNI son opcionales (verificación best-effort, nunca bloquea el alta). */
  onSupplyPointSubmit(supplyPointData: SupplyPointData) {
    const kind = this.selectedSupply();
    const holderData = this.finalHolderData;
    if (!kind || !holderData) {
      this.submitError.set('Faltan datos para completar el alta. Vuelve a intentarlo desde el inicio.');
      this.status.set('error');
      return;
    }
    const files = this.finalDocuments;
    const ocrDocumentId = this.extractResult()?.ocrDocumentId;

    const form = new FormData();
    form.append('ServiceType', this.supplyKindToServiceType[kind]);
    if (ocrDocumentId) form.append('OcrDocumentId', ocrDocumentId);
    form.append('HolderName', holderData.fullName.trim());
    form.append('HolderDni', holderData.nationalId.trim());
    form.append('HolderPhone', `${holderData.phoneCountry}${holderData.phoneNumber.replace(/\D/g, '')}`);
    form.append('HolderEmail', holderData.email.trim());
    form.append('IsUserTheHolder', String(this.ownershipType() === 'without-change'));
    const iban = supplyPointData.bankAccount.replace(/\s+/g, '');
    if (iban) form.append('HolderIban', iban);
    form.append('Street', supplyPointData.streetAddress.trim());
    if (supplyPointData.floor.trim()) form.append('Floor', supplyPointData.floor.trim());
    if (supplyPointData.door.trim()) form.append('Door', supplyPointData.door.trim());
    form.append('PostalCode', supplyPointData.postalCode.trim());
    form.append('Province', supplyPointData.province.trim());
    form.append('Locality', supplyPointData.city.trim());
    if (this.requiresCups()) {
      form.append('Cups', supplyPointData.cups.trim());
    } else {
      form.append('PhoneToPort', supplyPointData.phoneToPort.replace(/\D/g, ''));
    }
    if (files?.idFront) form.append('DniFront', files.idFront);
    if (files?.idBack) form.append('DniBack', files.idBack);

    this.submitError.set('');
    this.verificationWarning.set(null);
    this.registering.set(true);
    this.suppliesSvc.registerDirect(form).pipe(timeout(30000)).subscribe({
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
    this.extractResult.set(null);
    this.holderPrefill.set(null);
    this.supplyPointPrefill.set(null);
    this.finalHolderData = null;
    this.finalDocuments = null;
  }
}
