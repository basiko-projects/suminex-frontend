import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FiscalProfileDialogService } from '../../services/fiscal-profile-dialog.service';
import { FiscalProfileService } from '../../../core/services/fiscal-profile.service';
import { UpsertFiscalProfileDto } from '../../../core/models/fiscal-profile.model';
import { SuminexLoader } from '../suminex-loader/suminex-loader';
import { Icon } from '../icon/icon';

const EMPTY_FORM: UpsertFiscalProfileDto = {
  taxId: '', businessName: '', fiscalStreet: '', fiscalCity: '', fiscalPostalCode: '', fiscalProvince: '',
  iban: '', appliesVat: true, vatRate: 21,
};

@Component({
  selector: 'app-fiscal-profile-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, ToggleSwitchModule, SuminexLoader, Icon],
  templateUrl: './fiscal-profile-dialog.html',
})
export class FiscalProfileDialog {
  dialogSvc = inject(FiscalProfileDialogService);
  private fiscalSvc = inject(FiscalProfileService);

  loading  = signal(false);
  saving   = signal(false);
  apiError = signal('');
  sub      = false;
  form: UpsertFiscalProfileDto = { ...EMPTY_FORM };

  constructor() {
    effect(() => {
      if (this.dialogSvc.visible()) this.loadProfile();
    });
  }

  private loadProfile() {
    this.sub = false;
    this.apiError.set('');
    this.form = { ...EMPTY_FORM };

    // Editando el perfil de otro usuario: no hay endpoint para leer sus datos existentes, se parte de un formulario vacío
    if (this.dialogSvc.target()) return;

    this.loading.set(true);
    this.fiscalSvc.get().subscribe({
      next: (profile) => {
        this.loading.set(false);
        if (profile) this.form = { ...EMPTY_FORM, ...profile };
      },
      error: () => { this.loading.set(false); },
    });
  }

  get taxIdError(): string | null {
    if (!this.sub) return null;
    return this.form.taxId.trim() ? null : 'Este campo es obligatorio';
  }

  get businessNameError(): string | null {
    if (!this.sub) return null;
    return this.form.businessName.trim() ? null : 'Este campo es obligatorio';
  }

  get ibanError(): string | null {
    if (!this.sub) return null;
    return this.form.iban.trim() ? null : 'Este campo es obligatorio';
  }

  onIbanInput(value: string) {
    this.form.iban = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
  }

  close() {
    this.dialogSvc.close();
  }

  submit() {
    this.sub = true;
    if (this.taxIdError || this.businessNameError || this.ibanError) return;
    this.apiError.set('');
    this.saving.set(true);
    const target = this.dialogSvc.target();
    const req = target ? this.fiscalSvc.upsertFor(target.userId, this.form) : this.fiscalSvc.upsert(this.form);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogSvc.markSaved();
        this.close();
      },
      error: (e) => {
        this.saving.set(false);
        this.apiError.set(e?.error?.error ?? e?.error?.message ?? 'No se pudo guardar. Inténtalo de nuevo.');
      },
    });
  }
}
