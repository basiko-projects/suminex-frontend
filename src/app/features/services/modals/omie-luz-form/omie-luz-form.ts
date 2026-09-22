import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ServicesService } from '../../../../core/services/services.service';
import { CreateOmieDistributionDto } from '../../../../core/models/service.model';
import { SuminexLoader } from '../../../../shared/components/suminex-loader/suminex-loader';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-omie-luz-form',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, ToggleSwitchModule, SuminexLoader, Icon],
  templateUrl: './omie-luz-form.html',
})
export class OmieLuzFormComponent implements OnInit {
  @Input() tariffId   = 0;
  @Input() tariffCode = '';
  @Input() editOmie: any = null;
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc = inject(ServicesService);
  saving    = signal(false);
  apiError  = '';
  sub       = false;
  periods   = ['P1','P2','P3','P4','P5','P6'];
  factors: (number|null)[] = Array(6).fill(null);
  commonVal: number|null = null;
  form = { name: '', margin: null as number|null, isActive: true, validFrom: '', validUntil: '' };

  get periodCount() { return this.tariffCode === '2.0TD' ? 3 : 6; }
  get visiblePeriods() { return this.periods.slice(0, this.periodCount); }
  /** Máximo 3 columnas por fila — con 6 períodos esto reparte en dos filas de 3 en vez de una fila apretada de 6 */
  get columnCount() { return Math.min(this.periodCount, 3); }

  ngOnInit() {
    if (!this.editOmie) return;
    this.form.name      = this.editOmie.name      ?? '';
    this.form.margin    = this.editOmie.margin     ?? null;
    this.form.isActive  = this.editOmie.isActive   ?? true;
    this.form.validFrom = this.editOmie.validFrom?.slice(0, 10)  ?? '';
    this.form.validUntil = this.editOmie.validUntil?.slice(0, 10) ?? '';
    this.periods.forEach((p, i) => {
      const match = this.editOmie.periods?.find((ep: any) => ep.period === p);
      this.factors[i] = match ? match.factor : null;
    });
  }

  applyAll() {
    if (this.commonVal !== null)
      this.factors = this.factors.map((v, i) => i < this.periodCount ? this.commonVal : v);
  }

  submit() {
    this.sub = true;
    if (!this.form.name || !this.form.validFrom) return;
    this.apiError = '';
    const periods = this.visiblePeriods
      .map((p, i) => ({ period: p, factor: this.factors[i] }))
      .filter(item => item.factor !== null) as { period: string; factor: number }[];

    this.saving.set(true);

    if (this.editOmie?.id) {
      const putDto = {
        name:       this.form.name,
        margin:     this.form.margin,
        isActive:   this.form.isActive,
        validFrom:  this.form.validFrom,
        validUntil: this.form.validUntil || null,
        periods,
      };
      this.svc.updateOmieDistribution(this.tariffId, this.editOmie.id, putDto).subscribe({
        next: () => { this.saving.set(false); this.saved.emit(); },
        error: (e: any) => { this.saving.set(false); this.apiError = e?.error?.error ?? 'Error al guardar.'; },
      });
    } else {
      const postDto: CreateOmieDistributionDto = {
        name:       this.form.name,
        margin:     this.form.margin,
        validFrom:  this.form.validFrom,
        validUntil: this.form.validUntil || null,
        periods,
      };
      this.svc.createOmie(this.tariffId, postDto).subscribe({
        next: () => { this.saving.set(false); this.saved.emit(); },
        error: (e: any) => { this.saving.set(false); this.apiError = e?.error?.error ?? 'Error al guardar.'; },
      });
    }
  }
}
