import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/services/services.service';
import { CreateBoePeriodsDto } from '../../../core/models/service.model';

@Component({
  selector: 'app-boe-luz-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="cancelled.emit()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <h2 class="modal-title">{{ editBoe ? 'Editar' : 'Nueva' }} Potencia BOE · {{ tariffCode }}</h2>
            <p class="modal-sub">Precios regulados — sobrescribe todos los períodos anteriores</p>
          </div>
          <button class="close-btn" (click)="cancelled.emit()"><i class="pi pi-times"></i></button>
        </div>
        <div class="modal-body">
          @if (apiError) { <div class="api-err"><i class="pi pi-exclamation-circle"></i>{{ apiError }}</div> }
          <div class="form-row-2">
            <div class="field">
              <label>VÁLIDO DESDE *</label>
              <input type="date" [(ngModel)]="validFrom" [class.err]="sub && !validFrom" />
              @if (sub && !validFrom) { <span class="ferr">Obligatorio</span> }
            </div>
            <div class="field">
              <label>VÁLIDO HASTA <span class="opt">(opcional)</span></label>
              <input type="date" [(ngModel)]="validUntil" />
            </div>
          </div>
          <div class="period-section">
            <div class="period-hdr">
              <div>
                <span class="period-title">Valores BOE</span>
                <span class="period-sub">€/kW·año — el backend divide entre 365</span>
              </div>
              <div class="apply-row">
                <input type="number" [(ngModel)]="commonVal" placeholder="Valor común" step="0.000001" class="apply-input" />
                <button class="apply-btn" (click)="applyAll()">Aplicar a todos</button>
              </div>
            </div>
            <div class="period-grid" [style.grid-template-columns]="'repeat(' + periodCount + ', 1fr)'">
              @for (p of visiblePeriods; track p; let i = $index) {
                <div class="period-cell">
                  <label class="p-label">{{ p }}</label>
                  <input type="number" [(ngModel)]="values[i]" step="0.000001" placeholder="0.000000" class="p-input" />
                </div>
              }
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-cancel" (click)="cancelled.emit()" [disabled]="saving()">Cancelar</button>
          <button class="btn-primary" (click)="submit()" [disabled]="saving()">
            @if (saving()) { <i class="pi pi-spin pi-spinner"></i> } {{ editBoe ? 'Guardar cambios' : 'Guardar BOE' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { font-family: Inter, system-ui, sans-serif; }
    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:500;animation:fadeIn 150ms ease; }
    @keyframes fadeIn { from{opacity:0}to{opacity:1} }
    .modal-box { background:var(--bg-surface,#fff);border-radius:var(--radius-xl,16px);box-shadow:var(--shadow-lg);width:560px;max-height:90vh;overflow-y:auto;animation:slideIn 200ms ease-out; }
    @keyframes slideIn { from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1} }
    .modal-head { display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px 0; }
    .modal-title { font-size:16px;font-weight:700;color:var(--text-primary,#1C2033);margin:0 0 2px; }
    .modal-sub { font-size:12px;color:var(--text-muted,#9299B8);margin:0; }
    .close-btn { width:28px;height:28px;border-radius:6px;border:1px solid var(--border-color,#D5D9E8);background:transparent;color:var(--text-muted,#9299B8);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .close-btn:hover { color:var(--danger,#DC2626);border-color:var(--danger-border,#FECACA);background:var(--danger-bg,#FEF2F2); }
    .modal-body { padding:20px 24px; }
    .modal-foot { display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid var(--border-color,#D5D9E8); }
    .form-row-2 { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
    .field { display:flex;flex-direction:column;gap:4px; }
    .field label { font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-secondary,#5A6180); }
    .opt { font-weight:400;text-transform:none;font-size:10px; }
    .field input { padding:9px 11px;border:1.5px solid var(--border-color,#D5D9E8);border-radius:var(--radius-md,8px);background:var(--bg-input,#F5F6FA);font-size:13px;color:var(--text-primary,#1C2033);outline:none;font-family:inherit;width:100%; }
    .field input:focus { border-color:var(--accent,#4F46E5);box-shadow:0 0 0 3px var(--accent-light,#EEF2FF); }
    .field input.err { border-color:var(--danger,#DC2626); }
    .ferr { font-size:11px;color:var(--danger,#DC2626); }
    .period-section { border:1px solid var(--border-color,#D5D9E8);border-radius:var(--radius-lg,12px);padding:14px; }
    .period-hdr { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; }
    .period-title { font-size:13px;font-weight:600;color:var(--text-primary,#1C2033);display:block; }
    .period-sub { font-size:11px;color:var(--text-muted,#9299B8); }
    .apply-row { display:flex;gap:6px;align-items:center; }
    .apply-input { width:110px;padding:6px 9px;border:1.5px solid var(--border-color,#D5D9E8);border-radius:var(--radius-md,8px);background:var(--bg-input,#F5F6FA);font-size:12px;outline:none;font-family:inherit; }
    .apply-btn { padding:6px 10px;border-radius:var(--radius-md,8px);border:1px solid var(--border-color,#D5D9E8);background:transparent;font-size:11px;font-weight:500;cursor:pointer;color:var(--text-secondary,#5A6180);white-space:nowrap;font-family:inherit; }
    .apply-btn:hover { background:var(--accent-light,#EEF2FF);color:var(--accent,#4F46E5);border-color:var(--accent-border,#C7D2FE); }
    .period-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:8px; }
    .period-cell { display:flex;flex-direction:column;gap:3px; }
    .p-label { font-size:11px;font-weight:700;color:var(--text-muted,#9299B8);text-align:center; }
    .p-input { padding:7px 4px;border:1.5px solid var(--border-color,#D5D9E8);border-radius:var(--radius-sm,6px);background:var(--bg-input,#F5F6FA);font-size:12px;text-align:center;outline:none;font-family:inherit;width:100%; }
    .p-input:focus { border-color:var(--accent,#4F46E5); }
    .api-err { display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;background:var(--danger-bg,#FEF2F2);border:1px solid var(--danger-border,#FECACA);color:var(--danger,#DC2626);font-size:12px;margin-bottom:14px; }
    .btn-cancel { padding:9px 18px;border-radius:var(--radius-md,8px);border:1px solid var(--border-color,#D5D9E8);background:transparent;color:var(--text-secondary,#5A6180);font-size:13px;cursor:pointer;font-family:inherit; }
    .btn-primary { display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:var(--radius-md,8px);background:var(--accent,#4F46E5);color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 140ms; }
    .btn-primary:hover:not(:disabled) { background:var(--accent-hover,#4338CA); }
    .btn-primary:disabled,.btn-cancel:disabled { opacity:0.6;cursor:not-allowed; }
  `]
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
