import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ServicesService } from '../../../../core/services/services.service';
import { ServiceType } from '../../../../core/models/service.model';
import { BasikoLoader } from '../../../../shared/components/basiko-loader/basiko-loader';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-nuevo-servicio-form',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule, BasikoLoader, Icon],
  templateUrl: './nuevo-servicio-form.html',
})
export class NuevoServicioFormComponent {
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc = inject(ServicesService);

  saving   = signal(false);
  apiError = '';
  sub      = false;

  form: { name: string; serviceType: ServiceType } = { name: '', serviceType: 'LUZ' };

  serviceTypeOpts: { label: string; value: ServiceType }[] = [
    { label: 'Luz',      value: 'LUZ' },
    { label: 'Gas',      value: 'GAS' },
    { label: 'Móvil',    value: 'MOBILE' },
    { label: 'Internet', value: 'INTERNET' },
  ];

  submit() {
    this.sub = true;
    if (!this.form.name) return;
    this.apiError = '';
    this.saving.set(true);
    this.svc.create({
      name:        this.form.name,
      serviceType: this.form.serviceType,
    }).subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (e: any) => { this.saving.set(false); this.apiError = e?.error?.error ?? e?.error?.message ?? 'Error al guardar.'; },
    });
  }
}
