import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupplyPointData } from '../../new-supply.types';
import { SupplyKind } from '../../../../core/models/supply.model';
import { SuppliesService } from '../../../../core/services/supplies.service';
import { BasikoLoader } from '../../../../shared/components/basiko-loader/basiko-loader';

@Component({
  selector: 'app-supply-point-step',
  standalone: true,
  imports: [FormsModule, BasikoLoader],
  templateUrl: './supply-point-step.html',
})
export class SupplyPointStep implements OnInit {
  @Input() selectedSupply: SupplyKind = null;
  @Input() initialData: Partial<SupplyPointData> | null = null;
  /** No se llama "submit": colisiona con el evento nativo del <form> interno y hace bubbling hacia el padre */
  @Output() submitted = new EventEmitter<SupplyPointData>();

  private suppliesSvc = inject(SuppliesService);

  supplyPointData: SupplyPointData = {
    streetAddress: '', number: '', floor: '', door: '',
    postalCode: '', province: '', city: '',
    cups: '', bankAccount: '', phoneToPort: '',
  };
  supplyPointSubmitted = false;
  validatingIban = signal(false);
  private ibanServerError: string | null = null;

  ngOnInit() {
    if (this.initialData) this.supplyPointData = { ...this.supplyPointData, ...this.initialData };
    // El OCR a veces lee el CUPS con espacios entre bloques — se normaliza también acá, por si el usuario nunca toca el campo
    this.supplyPointData.cups = this.supplyPointData.cups.toUpperCase().replace(/\s+/g, '');
  }

  get streetAddressError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.streetAddress.trim() ? null : 'Este campo es obligatorio';
  }

  get numberError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.number.trim() ? null : 'Este campo es obligatorio';
  }

  get postalCodeError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    if (!this.supplyPointData.postalCode.trim()) return 'Este campo es obligatorio';
    return /^\d{5}$/.test(this.supplyPointData.postalCode.trim())
      ? null : 'El código postal debe tener 5 dígitos';
  }

  get provinceError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.province.trim() ? null : 'Este campo es obligatorio';
  }

  get cityError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.city.trim() ? null : 'Este campo es obligatorio';
  }

  get cupsError(): string | null {
    if (!this.supplyPointSubmitted || !this.requiresCups()) return null;
    const cups = this.supplyPointData.cups.trim();
    if (!cups) return 'Este campo es obligatorio';
    return /^ES\d{16}[A-Z0-9]{2,4}$/i.test(cups)
      ? null : 'Introduce un CUPS válido (ES + 16 dígitos + letras)';
  }

  get phoneToPortError(): string | null {
    if (!this.supplyPointSubmitted || this.requiresCups()) return null;
    const digits = this.supplyPointData.phoneToPort.replace(/\D/g, '');
    if (!digits) return 'Este campo es obligatorio';
    return /^[6789]\d{8}$/.test(digits) ? null : 'Introduce un número de teléfono válido';
  }

  get bankAccountError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    const iban = this.supplyPointData.bankAccount.replace(/\s+/g, '');
    if (!iban) return 'Este campo es obligatorio';
    if (!/^ES\d{22}$/i.test(iban)) return 'Introduce un IBAN español válido';
    return this.ibanServerError;
  }

  onPhoneToPortInput(value: string) {
    this.supplyPointData.phoneToPort = value.replace(/\D/g, '').slice(0, 9);
  }

  onBankAccountInput(value: string) {
    this.ibanServerError = null;
    this.supplyPointData.bankAccount = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
  }

  /** El OCR a veces lee el CUPS con espacios entre bloques — nunca deben llegar al backend ni a la validación */
  onCupsInput(value: string) {
    this.supplyPointData.cups = value.toUpperCase().replace(/\s+/g, '');
  }

  requiresCups(): boolean {
    return this.selectedSupply === 'electricity' || this.selectedSupply === 'gas';
  }

  formInputClasses(invalid: boolean): string {
    const base = 'w-full py-3.5 px-4 bg-white border-[1.5px] rounded-lg text-[0.9rem] text-[#0F172A] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#94A3B8]';
    return invalid
      ? `${base} border-[#EF4444]`
      : `${base} border-black/12 focus:border-[#227CFF] focus:shadow-[0_0_0_3px_rgba(34,124,255,0.10)]`;
  }

  submitForm() {
    this.supplyPointSubmitted = true;
    if (this.streetAddressError || this.numberError || this.postalCodeError || this.provinceError
      || this.cityError || this.cupsError || this.phoneToPortError || this.bankAccountError) return;
    if (this.validatingIban()) return;

    this.validatingIban.set(true);
    const iban = this.supplyPointData.bankAccount.replace(/\s+/g, '');
    this.suppliesSvc.validateIban(iban).subscribe({
      next: res => {
        this.validatingIban.set(false);
        if (!res.isValid) { this.ibanServerError = res.message; return; }
        this.submitted.emit(this.supplyPointData);
      },
      // Si el validador en sí falla (red, 401, etc.) no bloqueamos el alta — es una ayuda, no un gate duro
      error: () => {
        this.validatingIban.set(false);
        this.submitted.emit(this.supplyPointData);
      },
    });
  }
}
