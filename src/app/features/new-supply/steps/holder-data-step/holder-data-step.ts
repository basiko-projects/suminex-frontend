import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HolderData } from '../../new-supply.types';
import { SuppliesService } from '../../../../core/services/supplies.service';
import { BasikoLoader } from '../../../../shared/components/basiko-loader/basiko-loader';

const DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_PREFIX_DIGIT: Record<string, string> = { X: '0', Y: '1', Z: '2' };
const CIF_RE = /^[A-HJNPQRSUVW]\d{7}[0-9A-J]$/i;

/** Valida el dígito de control del DNI/NIE español (resto de dividir el número entre 23) — no solo el formato,
 *  así se detecta una letra mal tipeada o inventada aunque el formato "parezca" correcto. */
function isValidSpanishDni(value: string, allowNie = false): boolean {
  const v = value.trim().toUpperCase();
  const pattern = allowNie ? /^([0-9XYZ])(\d{7})([A-Z])$/ : /^(\d)(\d{7})([A-Z])$/;
  const m = pattern.exec(v);
  if (!m) return false;
  const [, first, rest, letter] = m;
  const digits = (NIE_PREFIX_DIGIT[first] ?? first) + rest;
  return DNI_CONTROL_LETTERS[Number(digits) % 23] === letter;
}

/** El titular anterior no siempre fue un particular — puede haber sido una empresa (CIF), independientemente
 *  de si el nuevo titular lo es. Acepta DNI o NIE (con dígito de control verificado) o CIF (solo formato, el
 *  dígito de control de un CIF depende del tipo de sociedad y no se valida acá). */
function isValidSpanishIdDocument(value: string): boolean {
  const v = value.trim();
  if (CIF_RE.test(v)) return true;
  if (/^\d{8}[A-Za-z]$/.test(v)) return isValidSpanishDni(v);
  if (/^[XYZ]\d{7}[A-Za-z]$/i.test(v)) return isValidSpanishDni(v, true);
  return false;
}

@Component({
  selector: 'app-holder-data-step',
  standalone: true,
  imports: [FormsModule, BasikoLoader],
  templateUrl: './holder-data-step.html',
})
export class HolderDataStep implements OnInit {
  @Input() initialData: Partial<HolderData> | null = null;
  /** true = hay cambio de titularidad → se exige PreviousHolderDni si el titular no es empresa */
  @Input() isHolderChange = false;
  /** No se llama "submit": colisiona con el evento nativo del <form> interno y hace bubbling hacia el padre */
  @Output() submitted = new EventEmitter<HolderData>();

  private suppliesSvc = inject(SuppliesService);

  holderData: HolderData = {
    fullName: '', nationalId: '', phoneCountry: '+34', phoneNumber: '', email: '',
    isCompanyHolder: false, tradeName: '', contactName: '', contactDni: '', cnae: '', previousHolderDni: '',
  };
  holderSubmitted = false;
  validatingPhone = signal(false);
  private phoneServerError: string | null = null;

  /** Cuando es empresa, el formulario se parte en 2 pasos (identificación → contacto) para no amontonar campos */
  companyStep = signal<1 | 2>(1);
  private companyStep1Submitted = false;

  ngOnInit() {
    if (this.initialData) this.holderData = { ...this.holderData, ...this.initialData };
  }

  countryOptions = [
    { dial: '+34',  name: 'España' },
    { dial: '+351', name: 'Portugal' },
    { dial: '+33',  name: 'Francia' },
  ];

  get fullNameError(): string | null {
    if (!this.holderSubmitted && !this.companyStep1Submitted) return null;
    return this.holderData.fullName.trim() ? null : 'Este campo es obligatorio';
  }

  get dniError(): string | null {
    if (!this.holderSubmitted && !this.companyStep1Submitted) return null;
    if (!this.holderData.nationalId.trim()) return 'Este campo es obligatorio';
    if (this.holderData.isCompanyHolder) {
      return /^[A-HJNPQRSUVW]\d{7}[0-9A-J]$/i.test(this.holderData.nationalId.trim())
        ? null : 'Introduce un CIF válido';
    }
    const dni = this.holderData.nationalId.trim();
    if (/^\d{8}[A-Za-z]$/.test(dni)) return isValidSpanishDni(dni) ? null : 'La letra del DNI no coincide con el número';
    if (/^[XYZ]\d{7}[A-Za-z]$/i.test(dni)) return isValidSpanishDni(dni, true) ? null : 'La letra del NIE no coincide con el número';
    // Un particular a veces se identifica con el CIF de su autónomo/sociedad — se acepta igual, sin checksum (ver isValidSpanishIdDocument)
    if (CIF_RE.test(dni)) return null;
    return 'Introduce un DNI, NIE o CIF válido';
  }

  get contactNameError(): string | null {
    if (!this.holderSubmitted || !this.holderData.isCompanyHolder) return null;
    return this.holderData.contactName.trim() ? null : 'Este campo es obligatorio';
  }

  get contactDniError(): string | null {
    if (!this.holderSubmitted || !this.holderData.isCompanyHolder) return null;
    const dni = this.holderData.contactDni.trim();
    if (!dni) return 'Este campo es obligatorio';
    if (/^(\d{8}|[XYZ]\d{7})[A-Za-z]$/i.test(dni)) {
      return isValidSpanishDni(dni, true) ? null : 'La letra del DNI/NIE no coincide con el número';
    }
    // El contacto a veces se identifica con el CIF de su propia sociedad — se acepta igual, sin checksum
    if (CIF_RE.test(dni)) return null;
    return 'Introduce un DNI, NIE o CIF válido';
  }

  get cnaeError(): string | null {
    if (!this.holderSubmitted || !this.holderData.isCompanyHolder) return null;
    return this.holderData.cnae.trim() ? null : 'Este campo es obligatorio';
  }

  get previousHolderDniError(): string | null {
    if (!this.holderSubmitted || !this.isHolderChange || this.holderData.isCompanyHolder) return null;
    const dni = this.holderData.previousHolderDni.trim();
    if (!dni) return 'Este campo es obligatorio';
    return isValidSpanishIdDocument(dni) ? null : 'Introduce un DNI, NIE o CIF válido';
  }

  get phoneError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.phoneNumber.trim()) return 'Este campo es obligatorio';
    if (!this.isValidPhone()) return 'Introduce un número de teléfono válido';
    return this.phoneServerError;
  }

  get emailError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.email.trim()) return 'Este campo es obligatorio';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.holderData.email.trim())
      ? null : 'Introduce un correo electrónico válido';
  }

  onPhoneNumberInput(value: string) {
    this.phoneServerError = null;
    const maxDigits = this.holderData.phoneCountry === '+34' ? 9 : 15;
    this.holderData.phoneNumber = value.replace(/\D/g, '').slice(0, maxDigits);
  }

  private isValidPhone(): boolean {
    const digits = this.holderData.phoneNumber.replace(/\D/g, '');
    if (this.holderData.phoneCountry === '+34') return /^[6789]\d{8}$/.test(digits);
    return digits.length >= 6 && digits.length <= 15;
  }

  formInputClasses(invalid: boolean): string {
    const base = 'w-full py-3.5 px-4 bg-white border-[1.5px] rounded-lg text-[0.9rem] text-[#0F172A] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#94A3B8]';
    return invalid
      ? `${base} border-[#EF4444]`
      : `${base} border-black/12 focus:border-[#227CFF] focus:shadow-[0_0_0_3px_rgba(34,124,255,0.10)]`;
  }

  toggleCompanyHolder() {
    this.holderData.isCompanyHolder = !this.holderData.isCompanyHolder;
    this.companyStep.set(1);
    this.companyStep1Submitted = false;
  }

  /** El <form> tiene un solo (submit) para los 3 sub-vistas: si es empresa y está en el paso 1, ese submit
   *  solo avanza al paso 2; en cualquier otro caso (particular, o empresa en el paso 2) es el envío final. */
  onFormSubmit() {
    if (this.holderData.isCompanyHolder && this.companyStep() === 1) {
      this.goToCompanyStep1Next();
    } else {
      this.submitForm();
    }
  }

  private goToCompanyStep1Next() {
    this.companyStep1Submitted = true;
    if (this.fullNameError || this.dniError) return;
    this.companyStep.set(2);
  }

  backToCompanyStep1() {
    this.companyStep.set(1);
  }

  /** Stepper clickeable: volver al paso 1 siempre se permite libremente; saltar al paso 2 valida primero
   *  (no tiene sentido "navegar libre" hacia adelante sin los datos mínimos del paso 1). */
  goToCompanyStep(step: 1 | 2) {
    if (step === 1) { this.companyStep.set(1); return; }
    this.goToCompanyStep1Next();
  }

  submitForm() {
    this.holderSubmitted = true;
    if (this.fullNameError || this.dniError || this.phoneError || this.emailError
      || this.contactNameError || this.contactDniError || this.cnaeError || this.previousHolderDniError) return;
    if (this.validatingPhone()) return;

    this.validatingPhone.set(true);
    const prefix = this.holderData.phoneCountry.replace('+', '');
    const digits = this.holderData.phoneNumber.replace(/\D/g, '');
    this.suppliesSvc.validatePhone(prefix, digits).subscribe({
      next: res => {
        this.validatingPhone.set(false);
        if (!res.isValid) { this.phoneServerError = res.message; return; }
        this.submitted.emit(this.holderData);
      },
      // Si el validador en sí falla (red, 401, etc.) no bloqueamos el alta — es una ayuda, no un gate duro
      error: () => {
        this.validatingPhone.set(false);
        this.submitted.emit(this.holderData);
      },
    });
  }
}
