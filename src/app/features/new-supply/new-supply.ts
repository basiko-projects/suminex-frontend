import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { timeout } from 'rxjs/operators';
import { ComparisonsService } from '../../core/services/comparisons.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ServicesService } from '../../core/services/services.service';
import { ServiceType } from '../../core/models/service.model';
import { ExtractComparisonResponse } from '../../core/models/comparison.model';
import { SupplyKind, SupplyOption } from '../../core/models/supply.model';
import { BasikoLoader } from '../../shared/components/basiko-loader/basiko-loader';
import { SupplyTypeStep } from '../../shared/components/supply-type-step/supply-type-step';
import { HolderData, OwnershipChange, SupplyPointData } from './new-supply.types';
import { ProductSelectStep, EligibleProduct } from './steps/product-select-step/product-select-step';
import { OwnershipStep } from './steps/ownership-step/ownership-step';
import { HolderDataStep } from './steps/holder-data-step/holder-data-step';
import { SupplyPointStep } from './steps/supply-point-step/supply-point-step';
import { DocumentsStep, SupplyDocuments } from './steps/documents-step/documents-step';
import { ResultStep } from './steps/result-step/result-step';
import { Icon } from '../../shared/components/icon/icon';

type Step = 1 | 2 | 3 | 4;

const GENERIC_ERROR = 'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde.';

/** El backend no siempre devuelve el mismo formato de error, y a veces { message } trae adentro, como texto, el
 *  JSON crudo que le llegó de un proveedor externo (ej. Gana) reenviado tal cual — ej.
 *  { message: "{\"error\":true,\"msg\":[\"CupsContratable: El cups tiene...\"]}" }. Esta función "desenvuelve"
 *  cualquier nivel de anidado (objeto, string-JSON-serializado, array) hasta encontrar el texto legible, y le
 *  limpia el prefijo "NombreDeCodigo: " para mostrar solo el mensaje al usuario. */
function extractErrorMessage(e: any, fallback: string): string {
  const stripCode = (s: string) => s.replace(/^[A-Za-z][\w]*:\s*/, '').trim();

  const unwrap = (value: unknown): string | null => {
    if (value == null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const nested = unwrap(JSON.parse(trimmed));
          if (nested) return nested;
        } catch { /* no era JSON válido — se muestra el texto tal cual */ }
      }
      return stripCode(trimmed);
    }
    if (Array.isArray(value)) {
      const parts = value.map(unwrap).filter((v): v is string => !!v);
      return parts.length ? parts.join(' ') : null;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      return unwrap(obj['message']) ?? unwrap(obj['msg']) ?? unwrap(obj['detail']) ?? unwrap(obj['title']) ?? null;
    }
    return null;
  };

  return unwrap(e?.error) ?? fallback;
}

interface ErrorFieldInfo { step: Step; focusId: string; label: string; }

/** Mapea el texto libre que devuelve el backend (sin código de campo) a dónde corregirlo en el wizard.
 *  El orden importa: los patrones más específicos van primero para no matchear con uno genérico (ej. "dni"). */
const ERROR_FIELD_PATTERNS: { pattern: RegExp; step: Step; focusId: string; label: string }[] = [
  { pattern: /cnae/i,                                            step: 2, focusId: 'holder-cnae',         label: 'CNAE de la empresa' },
  { pattern: /contacto.*dni|contacto.*nif|dni.*contacto|contactdni/i, step: 2, focusId: 'holder-contact-dni', label: 'DNI del contacto' },
  { pattern: /nombre.*contacto|contactname/i,                    step: 2, focusId: 'holder-contact-name', label: 'nombre de contacto' },
  { pattern: /titular anterior|previousholderdni/i,              step: 2, focusId: 'holder-previous-dni', label: 'DNI del titular anterior' },
  { pattern: /raz[oó]n social|tradename/i,                       step: 2, focusId: 'holder-name',         label: 'razón social' },
  { pattern: /\bcif\b/i,                                         step: 2, focusId: 'holder-dni',          label: 'CIF' },
  { pattern: /holdername/i,                                      step: 2, focusId: 'holder-name',         label: 'nombre del titular' },
  { pattern: /holderdni|\bdni\b/i,                                step: 2, focusId: 'holder-dni',          label: 'DNI del titular' },
  { pattern: /tel[eé]fono|phone/i,                               step: 2, focusId: 'holder-phone',        label: 'teléfono' },
  { pattern: /correo|email/i,                                    step: 2, focusId: 'holder-email',        label: 'correo electrónico' },
  { pattern: /cups/i,                                            step: 3, focusId: 'sp-cups',             label: 'CUPS' },
  { pattern: /iban/i,                                            step: 3, focusId: 'sp-iban',             label: 'IBAN' },
  { pattern: /c[oó]digo postal|postalcode/i,                     step: 3, focusId: 'sp-postal-code',      label: 'código postal' },
  { pattern: /provincia|province/i,                              step: 3, focusId: 'sp-province',         label: 'provincia' },
  { pattern: /localidad|municipio|city|locality/i,               step: 3, focusId: 'sp-city',             label: 'localidad' },
  { pattern: /direcci[oó]n|calle|street/i,                       step: 3, focusId: 'sp-street',           label: 'dirección' },
  { pattern: /n[uú]mero|number/i,                                step: 3, focusId: 'sp-number',           label: 'número' },
];

function detectErrorField(message: string): ErrorFieldInfo | null {
  const hit = ERROR_FIELD_PATTERNS.find(p => p.pattern.test(message));
  return hit ? { step: hit.step, focusId: hit.focusId, label: hit.label } : null;
}

@Component({
  selector: 'app-new-supply',
  standalone: true,
  imports: [
    BasikoLoader, SupplyTypeStep, ProductSelectStep, OwnershipStep, HolderDataStep, SupplyPointStep, DocumentsStep,
    ResultStep, Icon,
  ],
  templateUrl: './new-supply.html',
})
export class NewSupplyComponent implements OnDestroy {
  private comparisonsSvc = inject(ComparisonsService);
  private suppliesSvc = inject(SuppliesService);
  private servicesSvc = inject(ServicesService);
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
  errorFieldInfo = signal<ErrorFieldInfo | null>(null);
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

  /** Alta directa exige elegir un producto con comisión fija antes de poder dar de alta — ver POST /api/supplies/register-direct */
  selectedProductId = signal<number | null>(null);
  loadingProducts = signal(false);
  eligibleProducts = signal<EligibleProduct[]>([]);
  productsError = signal('');

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
  private finalSupplyPointData: SupplyPointData | null = null;
  private finalDocuments: SupplyDocuments | null = null;

  private requiresCups(): boolean {
    return this.selectedSupply() === 'electricity' || this.selectedSupply() === 'gas';
  }

  /** Al elegir el tipo de suministro se abre el modal de factura encima del Step 1 — recién se avanza
   *  al Step 2 cuando el OCR termina con éxito (ver submitInvoice). Si se cierra el modal sin subir nada,
   *  el usuario simplemente se queda en el Step 1, que nunca llegó a abandonarse. */
  selectSupply(kind: SupplyKind) {
    if (kind === null) return;
    this.selectedSupply.set(kind);
    this.invoiceSubmitted = false;
    this.comparisonError.set('');
    this.revokeInvoicePreview();
    this.showInvoiceModal.set(true);
  }

  /** Se llama tras leer la factura por OCR — filtra el selector de producto a la tarifa real leída (ej. 2.0TD/3.0TD).
   *  Solo LUZ trae tarifa por OCR; en GAS/INTERNET se listan todos los productos elegibles del tipo, sin filtrar. */
  private loadEligibleProducts(kind: SupplyKind, tariffCode?: string | null) {
    if (kind === null) return;
    this.loadingProducts.set(true);
    this.productsError.set('');
    this.eligibleProducts.set([]);
    const targetType = this.supplyKindToServiceType[kind];
    const normalize = (v: string | null | undefined) => (v ?? '').trim().toUpperCase();

    this.servicesSvc.getServices().subscribe({
      next: groups => {
        const group = groups.find(g => g.serviceType === targetType);
        const allTariffs = group?.tariffs ?? [];
        const matchingTariffs = tariffCode
          ? allTariffs.filter(t => normalize(t.code) === normalize(tariffCode))
          : [];
        const pool = matchingTariffs.length ? matchingTariffs : allTariffs;

        const eligible = pool.flatMap(t =>
          (t.products ?? [])
            .filter(p => p.isActive && p.fixedCommissionAmount != null)
            .map(p => ({ ...p, tariffName: t.code ?? t.name }))
        );
        this.eligibleProducts.set(eligible);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.loadingProducts.set(false);
        this.productsError.set('No se pudieron cargar los productos disponibles. Inténtalo de nuevo.');
      },
    });
  }

  onProductSelected(productId: number) {
    this.selectedProductId.set(productId);
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
          streetAddress: titular?.calle ?? '',
          number: titular?.numero ?? '',
          floor: titular?.piso ?? '',
          door: titular?.puerta ?? '',
          postalCode: titular?.codigoPostal ?? '',
          province: titular?.provincia ?? '',
          city: titular?.municipio ?? '',
          // El OCR a veces lee el CUPS con espacios entre bloques — nunca deben llegar al formulario ni al backend
          cups: (luz?.cups ?? gas?.cups ?? '').replace(/\s+/g, ''),
        });

        this.loadEligibleProducts(kind, luz?.tarifa);
        this.showInvoiceModal.set(false);
        this.step.set(2);
      },
      error: (e) => {
        this.comparisonLoading.set(false);
        this.comparisonError.set(extractErrorMessage(e, 'No se pudo procesar la factura. Inténtalo de nuevo.'));
      },
    });
  }

  ngOnDestroy() {
    this.revokeInvoicePreview();
  }

  onHolderSubmit(data: HolderData) {
    this.finalHolderData = data;
    // Se guarda también como prefill para que, si el usuario vuelve atrás (p. ej. desde "Corregir"), no pierda lo ya cargado
    this.holderPrefill.set(data);
    this.step.set(3);
  }

  goBack() {
    const s = this.step();
    /** Dentro del paso 2, "volver" retrocede de a un sub-paso: titular → titularidad → producto → tipo de suministro */
    if (s === 2 && this.ownershipType()) {
      this.ownershipType.set(null);
      return;
    }
    if (s === 2 && this.selectedProductId()) {
      this.selectedProductId.set(null);
      return;
    }
    if (s > 1) this.step.set((s - 1) as Step);
  }

  onSupplyPointSubmit(supplyPointData: SupplyPointData) {
    this.finalSupplyPointData = supplyPointData;
    // Se guarda también como prefill para que, si el usuario vuelve atrás (p. ej. desde "Corregir"), no pierda lo ya cargado
    this.supplyPointPrefill.set(supplyPointData);
    this.step.set(4);
  }

  /** POST /api/supplies/register-direct — alta directa sin comparativa; OcrDocumentId es solo trazabilidad opcional
   *  y las fotos de DNI son opcionales (verificación best-effort, nunca bloquea el alta). */
  onDocumentsSubmit(files: SupplyDocuments) {
    this.finalDocuments = files;
    const kind = this.selectedSupply();
    const holderData = this.finalHolderData;
    const supplyPointData = this.finalSupplyPointData;
    if (!kind || !holderData || !supplyPointData) {
      this.submitError.set('Faltan datos para completar el alta. Vuelve a intentarlo desde el inicio.');
      this.status.set('error');
      return;
    }
    const ocrDocumentId = this.extractResult()?.ocrDocumentId;

    const productId = this.selectedProductId();
    if (!productId) {
      this.submitError.set('Falta elegir el producto contratado. Vuelve a intentarlo desde el inicio.');
      this.status.set('error');
      return;
    }

    const form = new FormData();
    form.append('ServiceType', this.supplyKindToServiceType[kind]);
    form.append('ProductId', String(productId));
    if (ocrDocumentId) form.append('OcrDocumentId', ocrDocumentId);
    form.append('HolderName', holderData.fullName.trim());
    form.append('HolderDni', holderData.nationalId.trim());
    form.append('HolderPhone', `${holderData.phoneCountry}${holderData.phoneNumber.replace(/\D/g, '')}`);
    form.append('HolderEmail', holderData.email.trim());
    form.append('IsUserTheHolder', String(this.ownershipType() === 'without-change'));
    const isHolderChange = this.ownershipType() === 'with-change';
    form.append('IsHolderChange', String(isHolderChange));
    form.append('IsCompanyHolder', String(holderData.isCompanyHolder));
    if (holderData.isCompanyHolder) {
      if (holderData.tradeName.trim()) form.append('HolderTradeName', holderData.tradeName.trim());
      form.append('HolderContactName', holderData.contactName.trim());
      form.append('HolderContactDni', holderData.contactDni.trim());
      form.append('HolderCnae', holderData.cnae.trim());
    } else if (isHolderChange) {
      form.append('PreviousHolderDni', holderData.previousHolderDni.trim());
    }
    const iban = supplyPointData.bankAccount.replace(/\s+/g, '');
    if (iban) form.append('HolderIban', iban);
    form.append('Street', supplyPointData.streetAddress.trim());
    form.append('Number', supplyPointData.number.trim());
    if (supplyPointData.floor.trim()) form.append('Floor', supplyPointData.floor.trim());
    if (supplyPointData.door.trim()) form.append('Door', supplyPointData.door.trim());
    form.append('PostalCode', supplyPointData.postalCode.trim());
    form.append('Province', supplyPointData.province.trim());
    form.append('Locality', supplyPointData.city.trim());
    if (this.requiresCups()) {
      // El OCR a veces lee el CUPS con espacios entre bloques — nunca deben llegar al backend
      form.append('Cups', supplyPointData.cups.replace(/\s+/g, ''));
    } else {
      form.append('PhoneToPort', supplyPointData.phoneToPort.replace(/\D/g, ''));
    }
    if (files?.idFront) form.append('DniFront', files.idFront);
    if (files?.idBack) form.append('DniBack', files.idBack);

    this.submitError.set('');
    this.verificationWarning.set(null);
    this.registering.set(true);
    this.suppliesSvc.registerDirect(form).pipe(timeout(35000)).subscribe({
      next: (res) => {
        this.registering.set(false);
        if (!res.verificationSuccess) this.verificationWarning.set(res.verificationMessage ?? GENERIC_ERROR);
        this.status.set('success');
      },
      error: (e) => {
        this.registering.set(false);
        const message = e?.name === 'TimeoutError'
          ? 'El servidor tardó demasiado en responder al dar de alta el suministro. Inténtalo de nuevo.'
          : extractErrorMessage(e, GENERIC_ERROR);
        this.submitError.set(message);
        this.errorFieldInfo.set(detectErrorField(message));
        this.status.set('error');
      },
    });
  }

  /** Desde la pantalla de error: nunca vuelve al principio (eso obligaría a resubir la factura). Si el mensaje
   *  del backend permite identificar el campo, va directo a él; si no, igual vuelve al formulario (paso 2, titular)
   *  en vez de forzar a empezar de cero — todo lo ya cargado (titular, punto de suministro) se conserva. */
  correctError() {
    const info = this.errorFieldInfo();
    this.status.set('idle');
    this.step.set(info?.step ?? 2);
    this.errorFieldInfo.set(null);
    if (info) {
      setTimeout(() => {
        const el = document.getElementById(info.focusId) as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      });
    }
  }

  reset() {
    this.status.set('idle');
    this.step.set(1);
    this.selectedSupply.set(null);
    this.ownershipType.set(null);
    this.submitError.set('');
    this.errorFieldInfo.set(null);
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
    this.finalSupplyPointData = null;
    this.finalDocuments = null;
    this.selectedProductId.set(null);
    this.loadingProducts.set(false);
    this.eligibleProducts.set([]);
    this.productsError.set('');
  }
}
