import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/services/services.service';
import { ServiceListItem } from '../../../core/models/service.model';
import { SuminexLoaderComponent } from '../../../shared/components/suminex-loader';

@Component({
  selector: 'app-tarifa-form',
  standalone: true,
  imports: [FormsModule, SuminexLoaderComponent],
  template: `
    <div class="modal-overlay" (click)="cancelled.emit()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <h2 class="modal-title">{{ editItem ? 'Editar tarifa' : 'Nueva tarifa · ' + serviceTypeLabel }}</h2>
            <p class="modal-sub">{{ editItem ? 'Edita el nombre o código de la tarifa' : 'Los productos y precios se configuran después' }}</p>
          </div>
          <button class="close-btn" (click)="cancelled.emit()"><i class="pi pi-times"></i></button>
        </div>
        <div class="modal-body">
          @if (apiError) {
            <div class="api-err"><i class="pi pi-exclamation-circle"></i>{{ apiError }}</div>
          }
          <div class="field" style="margin-bottom:12px">
            <label>NOMBRE *</label>
            <input [(ngModel)]="form.name" placeholder="Ej: Tarifa doméstica" [class.err]="sub && !form.name" />
            @if (sub && !form.name) { <span class="ferr">Este campo es obligatorio</span> }
          </div>
          <div class="field">
            <label>CÓDIGO <span class="opt">(opcional)</span></label>
            <input [(ngModel)]="form.code" placeholder="Ej: 2.0TD" />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-cancel" (click)="cancelled.emit()" [disabled]="saving()">Cancelar</button>
          <button class="btn-primary" (click)="submit()" [disabled]="saving()">
            @if (saving()) { <app-suminex-loader [size]="14" /> }
            {{ editItem ? 'Guardar cambios' : 'Crear tarifa' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { font-family: Inter, system-ui, sans-serif; }
    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:500;animation:fadeIn 150ms ease; }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .modal-box { background:var(--bg-surface,#fff);border-radius:var(--radius-xl,16px);box-shadow:var(--shadow-lg);width:560px;max-height:90vh;overflow-y:auto;animation:slideIn 200ms ease-out; }
    @keyframes slideIn { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
    .modal-head { display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px 0; }
    .modal-title { font-size:16px;font-weight:700;color:var(--text-primary,#1C2033);margin:0 0 2px; }
    .modal-sub { font-size:12px;color:var(--text-muted,#9299B8);margin:0; }
    .close-btn { width:28px;height:28px;border-radius:6px;border:1px solid var(--border-color,#D5D9E8);background:transparent;color:var(--text-muted,#9299B8);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 120ms; }
    .close-btn:hover { color:var(--danger,#DC2626);border-color:var(--danger-border,#FECACA);background:var(--danger-bg,#FEF2F2); }
    .modal-body { padding:20px 24px; }
    .modal-foot { display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid var(--border-color,#D5D9E8); }
    .form-row { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px; }
    .field { display:flex;flex-direction:column;gap:4px; }
    .field.span-2 { grid-column:span 2; }
    .field label { font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-secondary,#5A6180); }
    .opt { font-weight:400;text-transform:none;font-size:10px;letter-spacing:0; }
    .field input { padding:9px 11px;border:1.5px solid var(--border-color,#D5D9E8);border-radius:var(--radius-md,8px);background:var(--bg-input,#F5F6FA);font-size:13px;color:var(--text-primary,#1C2033);outline:none;font-family:inherit;transition:border-color 140ms; }
    .field input:focus { border-color:var(--accent,#4F46E5);box-shadow:0 0 0 3px var(--accent-light,#EEF2FF); }
    .field input.err { border-color:var(--danger,#DC2626); }
    .ferr { font-size:11px;color:var(--danger,#DC2626); }
    .toggle-field { justify-content:flex-start; }
    .toggle-row { margin-top:2px; }
    .toggle-pill { padding:7px 14px;border-radius:20px;border:1.5px solid var(--border-color,#D5D9E8);background:transparent;color:var(--text-secondary,#5A6180);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 140ms; }
    .toggle-pill.on { background:var(--success-bg,#F0FDF8);border-color:var(--success-border,#A7F3D0);color:var(--success,#059669);font-weight:600; }
    .api-err { display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;background:var(--danger-bg,#FEF2F2);border:1px solid var(--danger-border,#FECACA);color:var(--danger,#DC2626);font-size:12px;margin-bottom:14px; }
    .btn-cancel { padding:9px 18px;border-radius:var(--radius-md,8px);border:1px solid var(--border-color,#D5D9E8);background:transparent;color:var(--text-secondary,#5A6180);font-size:13px;cursor:pointer;font-family:inherit; }
    .btn-cancel:hover { background:var(--bg-subtle,#E8EBF4); }
    .btn-primary { display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:var(--radius-md,8px);background:var(--accent,#4F46E5);color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 140ms; }
    .btn-primary:hover:not(:disabled) { background:var(--accent-hover,#4338CA); }
    .btn-primary:disabled,.btn-cancel:disabled { opacity:0.6;cursor:not-allowed; }
  `]
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
