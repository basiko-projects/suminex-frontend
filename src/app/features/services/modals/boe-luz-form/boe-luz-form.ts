import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ServicesService } from '../../../../core/services/services.service';
import { CreateBoePeriodsDto } from '../../../../core/models/service.model';
import { SuminexLoader } from '../../../../shared/components/suminex-loader/suminex-loader';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-boe-luz-form',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, SuminexLoader, Icon],
  templateUrl: './boe-luz-form.html',
})
export class BoeLuzFormComponent implements OnInit {
  @Input() tariffId   = 0;
  @Input() tariffCode = '';
  @Input() editBoe: { periods: { period: string; priceKwDay: number }[]; validFrom: string; validUntil?: string | null } | null = null;
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc = inject(ServicesService);
  saving    = signal(false);
  apiError  = '';
  sub       = false;
  periods   = ['P1','P2','P3','P4','P5','P6'];
  validFrom = '';
  validUntil = '';
  values: (number|null)[] = Array(6).fill(null);
  commonVal: number|null = null;

  get periodCount() { return this.tariffCode === '2.0TD' ? 3 : 6; }
  get visiblePeriods() { return this.periods.slice(0, this.periodCount); }
  /** Máximo 3 columnas por fila — con 6 períodos esto reparte en dos filas de 3 en vez de una fila apretada de 6 */
  get columnCount() { return Math.min(this.periodCount, 3); }

  ngOnInit() {
    if (!this.editBoe) return;
    this.validFrom  = this.editBoe.validFrom?.slice(0, 10) ?? '';
    this.validUntil = this.editBoe.validUntil?.slice(0, 10) ?? '';
    this.periods.forEach((p, i) => {
      const match = this.editBoe!.periods.find(ep => ep.period === p);
      // API devuelve priceKwDay (÷365); el form espera €/kW·año → multiplicamos ×365
      this.values[i] = match ? parseFloat((match.priceKwDay * 365).toFixed(4)) : null;
    });
  }

  applyAll() { if (this.commonVal !== null) this.values = this.values.map((v, i) => i < this.periodCount ? this.commonVal : v); }

  submit() {
    this.sub = true;
    if (!this.validFrom) return;
    this.apiError = '';
    const dto: CreateBoePeriodsDto = {
      validFrom:  this.validFrom,
      validUntil: this.validUntil || null,
      periods: this.visiblePeriods
        .map((p, i) => ({ period: p, value: this.values[i] }))
        .filter(item => item.value !== null) as { period: string; value: number }[],
    };
    if (!dto.periods.length) { this.apiError = 'Introduce al menos un período BOE.'; return; }
    this.saving.set(true);
    const req = this.editBoe
      ? this.svc.updateBoe(this.tariffId, dto)
      : this.svc.createBoe(this.tariffId, dto);
    req.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (e: any) => { this.saving.set(false); this.apiError = e?.error?.error ?? 'Error al guardar.'; },
    });
  }
}
