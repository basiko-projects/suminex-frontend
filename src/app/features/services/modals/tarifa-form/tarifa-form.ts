import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ServicesService } from '../../../../core/services/services.service';
import { ServiceListItem } from '../../../../core/models/service.model';
import { BasikoLoader } from '../../../../shared/components/basiko-loader/basiko-loader';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-tarifa-form',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, BasikoLoader, Icon],
  templateUrl: './tarifa-form.html',
})
export class TarifaFormComponent implements OnInit {
  @Input() serviceId   = '';
  @Input() serviceType = 'LUZ';
  @Input() editItem: ServiceListItem | null = null;
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc = inject(ServicesService);
  saving   = signal(false);
  apiError = '';
  sub      = false;

  form = { name: '', code: '' };

  get serviceTypeLabel() {
    return ({ LUZ:'Luz', GAS:'Gas', MOBILE:'Móvil', INTERNET:'Internet' } as any)[this.serviceType] ?? this.serviceType;
  }

  ngOnInit() {
    if (this.editItem) {
      this.form.name = this.editItem.name;
      this.form.code = this.editItem.tariffCode ?? '';
    }
  }

  submit() {
    this.sub = true;
    if (!this.form.name) return;
    this.apiError = '';
    this.saving.set(true);
    const req = this.svc.createTariff({
      serviceId: this.serviceId,
      name:      this.form.name,
      code:      this.form.code || null,
    });
    req.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (e: any) => { this.saving.set(false); this.apiError = e?.error?.error ?? e?.error?.message ?? 'Error al guardar.'; },
    });
  }
}
