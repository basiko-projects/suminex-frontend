import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HolderData } from '../../new-supply.types';

@Component({
  selector: 'app-holder-data-step',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './holder-data-step.html',
})
export class HolderDataStep implements OnInit {
  @Input() initialData: Partial<HolderData> | null = null;
  /** No se llama "submit": colisiona con el evento nativo del <form> interno y hace bubbling hacia el padre */
  @Output() submitted = new EventEmitter<HolderData>();

  holderData: HolderData = { fullName: '', nationalId: '', phoneCountry: '+34', phoneNumber: '', email: '' };
  holderSubmitted = false;

  ngOnInit() {
    if (this.initialData) this.holderData = { ...this.holderData, ...this.initialData };
  }

  countryOptions = [
    { dial: '+34',  name: 'España' },
    { dial: '+351', name: 'Portugal' },
    { dial: '+33',  name: 'Francia' },
  ];

  get fullNameError(): string | null {
    if (!this.holderSubmitted) return null;
    return this.holderData.fullName.trim() ? null : 'Este campo es obligatorio';
  }

  get dniError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.nationalId.trim()) return 'Este campo es obligatorio';
    return /^\d{8}[A-Za-z]$/.test(this.holderData.nationalId.trim())
      ? null : 'Introduce un DNI válido (8 dígitos y una letra)';
  }

  get phoneError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.phoneNumber.trim()) return 'Este campo es obligatorio';
    return this.isValidPhone() ? null : 'Introduce un número de teléfono válido';
  }

  get emailError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.email.trim()) return 'Este campo es obligatorio';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.holderData.email.trim())
      ? null : 'Introduce un correo electrónico válido';
  }

  onPhoneNumberInput(value: string) {
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

  submitForm() {
    this.holderSubmitted = true;
    if (this.fullNameError || this.dniError || this.phoneError || this.emailError) return;
    this.submitted.emit(this.holderData);
  }
}
