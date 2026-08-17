import { Component, Input, OnChanges, inject, signal } from '@angular/core';

import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ServicesService } from '../../core/services/services.service';
import { ServiceListItem } from '../../core/models/service.model';
import { TarifaFormComponent } from './modals/tarifa-form';
import { SuminexLoaderComponent } from '../../shared/components/suminex-loader';

@Component({
  selector: 'app-tarifas-list',
  standalone: true,
  imports: [TarifaFormComponent, SuminexLoaderComponent],
  template: `
    <!-- List header -->
    <div class="list-hdr">
      <div>
        <span class="list-count">{{ filtered.length }} tarifa{{ filtered.length !== 1 ? 's' : '' }}</span>
      </div>
      <button class="btn-add" (click)="openCreate()">
        <i class="pi pi-plus"></i> Nueva tarifa
      </button>
    </div>

    @if (loading()) {
      <div class="skeleton-wrap">
        @for (i of [1,2,3,4,5]; track i) {
          <div class="skel-row">
            <div class="skel-block" style="width:80px;height:22px;border-radius:20px"></div>
            <div class="skel-block" style="width:200px;height:14px"></div>
            <div class="skel-block" style="width:130px;height:14px"></div>
            <div class="skel-block" style="width:60px;height:22px;border-radius:20px"></div>
          </div>
        }
      </div>
    } @else {
      <div class="table-wrap">
        <table class="srv-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (filtered.length === 0) {
              <tr>
                <td colspan="3">
                  <div class="empty-row">
                    <i class="pi pi-inbox"></i>
                    <span>No hay tarifas de {{ typeLabel }}</span>
                    <button class="btn-add-sm" (click)="openCreate()">
                      <i class="pi pi-plus"></i> Crear primera tarifa
                    </button>
                  </div>
                </td>
              </tr>
            }
            @for (t of filtered; track t.id) {
              <tr class="srv-row" (click)="viewDetail(t)" style="cursor:pointer">
                <td>
                  <span class="code-chip" [style.background]="typeBg" [style.color]="typeColor" [style.borderColor]="typeBorder">
                    {{ t.tariffCode || '—' }}
                  </span>
                </td>
                <td>
                  <span class="row-name">{{ t.name }}</span>
                </td>
                <td>
                  <div class="row-actions" (click)="$event.stopPropagation()">
                    <button class="act-btn" title="Ver detalle" (click)="viewDetail(t)">
                      <i class="pi pi-eye"></i>
                    </button>
                    <button class="act-btn" title="Editar" (click)="openEdit(t)">
                      <i class="pi pi-pencil"></i>
                    </button>
                    <button class="act-btn act-danger" title="Eliminar" (click)="openDelete(t)">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Toast -->
    @if (toast()) {
      <div class="toast" [class.toast-ok]="toast()!.type==='ok'" [class.toast-err]="toast()!.type==='err'">
        <i [class]="'pi ' + (toast()!.type==='ok' ? 'pi-check-circle' : 'pi-times-circle')"></i>
        {{ toast()!.msg }}
      </div>
    }

    <!-- Delete modal -->
    @if (deleteTarget) {
      <div class="modal-overlay" (click)="deleteTarget = null">
        <div class="modal-box confirm-box" (click)="$event.stopPropagation()">
          <div class="confirm-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <h3 class="confirm-title">¿Eliminar tarifa {{ deleteTarget.tariffCode }}?</h3>
          <p class="confirm-msg">Esta acción eliminará también todos los productos, períodos y configuraciones asociadas. No se puede deshacer.</p>
          <div class="confirm-footer">
            <button class="btn-cancel" (click)="deleteTarget = null">Cancelar</button>
            <button class="btn-danger" [disabled]="deleting()" (click)="confirmDelete()">
              @if (deleting()) { <app-suminex-loader [size]="14" /> } Eliminar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit/Create form modal -->
    @if (formVisible) {
      <app-tarifa-form
        [serviceType]="serviceType"
        [editItem]="editItem"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }
  `,
  styles: [`
    :host { display: block; font-family: Inter, system-ui, sans-serif; }

    .list-hdr {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .list-count { font-size: var(--font-sm, 12px); color: var(--text-muted, #9299B8); }

    .btn-add {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: var(--radius-md, 8px);
      background: var(--accent, #4F46E5); color: #fff; border: none;
      font-size: var(--font-base, 13px); font-weight: 500; cursor: pointer;
      transition: background 140ms; font-family: inherit;
    }
    .btn-add:hover { background: var(--accent-hover, #4338CA); }
    .btn-add .pi { font-size: 11px; }

    /* Table */
    .table-wrap { border: 1px solid var(--border-color, #D5D9E8); border-radius: var(--radius-lg, 12px); overflow: hidden; }
    .srv-table { width: 100%; border-collapse: collapse; }
    .srv-table thead tr {
      background: var(--bg-subtle, #E8EBF4);
      border-bottom: 1px solid var(--border-color, #D5D9E8);
    }
    .srv-table th {
      padding: 10px 14px; text-align: left;
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted, #9299B8);
    }
    .srv-table td { padding: 11px 14px; border-bottom: 1px solid var(--border-color, #D5D9E8); vertical-align: middle; }
    .srv-row:last-child td { border-bottom: none; }
    .srv-row { background: var(--bg-surface, #fff); transition: background 120ms; }
    .srv-row:hover { background: var(--bg-subtle, #E8EBF4); }

    .code-chip {
      display: inline-block; padding: 3px 9px; border-radius: 20px;
      font-size: 11px; font-weight: 700; font-family: monospace;
      border: 1px solid;
    }
    .row-name { font-size: var(--font-base, 13px); font-weight: 500; color: var(--text-primary, #1C2033); }
    .status-chip {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600;
    }
    .st-active   { background: var(--success-bg, #F0FDF8); color: var(--success, #059669); border: 1px solid var(--success-border, #A7F3D0); }
    .st-inactive { background: var(--bg-subtle, #E8EBF4); color: var(--text-muted, #9299B8); border: 1px solid var(--border-color, #D5D9E8); }
    .date-cell { font-size: var(--font-sm, 12px); color: var(--text-muted, #9299B8); }
    .no-end { color: var(--text-muted, #9299B8); font-style: italic; }

    .row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
    .act-btn {
      width: 28px; height: 28px; border-radius: var(--radius-sm, 6px);
      border: 1px solid var(--border-color, #D5D9E8); background: transparent;
      color: var(--text-muted, #9299B8); display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 120ms;
    }
    .act-btn:hover { border-color: var(--accent-border, #C7D2FE); color: var(--accent, #4F46E5); background: var(--accent-light, #EEF2FF); }
    .act-btn.act-danger:hover { border-color: var(--danger-border, #FECACA); color: var(--danger, #DC2626); background: var(--danger-bg, #FEF2F2); }
    .act-btn .pi { font-size: 11px; }

    /* Skeleton */
    .skeleton-wrap { display: flex; flex-direction: column; gap: 6px; }
    .skel-row {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 14px; background: var(--bg-surface, #fff);
      border: 1px solid var(--border-color, #D5D9E8); border-radius: var(--radius-md, 8px);
    }
    .skel-block { background: var(--bg-subtle, #E8EBF4); border-radius: 4px; flex-shrink: 0; animation: skel 1.2s ease-in-out infinite alternate; }
    @keyframes skel { from { opacity: 0.6; } to { opacity: 1; } }

    /* Empty */
    .empty-row { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 20px; color: var(--text-muted, #9299B8); }
    .empty-row .pi { font-size: 28px; }
    .empty-row span { font-size: var(--font-base, 13px); }
    .btn-add-sm {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 12px; border-radius: var(--radius-md, 8px);
      background: var(--accent-light, #EEF2FF); color: var(--accent, #4F46E5);
      border: 1px solid var(--accent-border, #C7D2FE);
      font-size: var(--font-sm, 12px); font-weight: 500; cursor: pointer; font-family: inherit;
    }

    /* Toast */
    .toast {
      position: fixed; bottom: 20px; right: 20px;
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: var(--radius-md, 8px);
      font-size: var(--font-base, 13px); font-weight: 500;
      box-shadow: var(--shadow-md); z-index: 1000;
      animation: toastIn 200ms ease-out;
    }
    @keyframes toastIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .toast-ok  { background: var(--success-bg, #F0FDF8); color: var(--success, #059669); border-left: 3px solid var(--success, #059669); }
    .toast-err { background: var(--danger-bg, #FEF2F2);  color: var(--danger, #DC2626);  border-left: 3px solid var(--danger, #DC2626); }

    /* Delete modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 200;
      animation: fadeIn 150ms ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-box {
      background: var(--bg-surface, #fff); border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-lg); width: 420px;
      animation: slideIn 200ms ease-out;
    }
    @keyframes slideIn { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .confirm-box { padding: 28px; text-align: center; }
    .confirm-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: var(--danger-bg, #FEF2F2); color: var(--danger, #DC2626);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 22px;
    }
    .confirm-title { font-size: var(--font-lg, 15px); font-weight: 700; color: var(--text-primary, #1C2033); margin: 0 0 10px; }
    .confirm-msg { font-size: var(--font-sm, 12px); color: var(--text-secondary, #5A6180); line-height: 1.6; margin: 0 0 24px; }
    .confirm-footer { display: flex; gap: 8px; justify-content: center; }
    .btn-cancel {
      padding: 9px 18px; border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-color, #D5D9E8); background: transparent;
      color: var(--text-secondary, #5A6180); font-size: var(--font-base, 13px); cursor: pointer; font-family: inherit;
    }
    .btn-cancel:hover { background: var(--bg-subtle, #E8EBF4); }
    .btn-danger {
      padding: 9px 18px; border-radius: var(--radius-md, 8px);
      background: var(--danger, #DC2626); color: #fff; border: none;
      font-size: var(--font-base, 13px); font-weight: 600; cursor: pointer; font-family: inherit;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-danger:hover:not(:disabled) { background: #B91C1C; }
    .btn-danger:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class TarifasListComponent implements OnChanges {
  @Input() serviceType = 'LUZ';

  private svc    = inject(ServicesService);
  private router = inject(Router);

  allServices: ServiceListItem[] = [];
  filtered:    ServiceListItem[] = [];
  loading      = signal(true);
  deleting     = signal(false);
  toast        = signal<{ msg: string; type: 'ok' | 'err' } | null>(null);

  formVisible   = false;
  editItem:     ServiceListItem | null = null;
  deleteTarget: ServiceListItem | null = null;

  get typeLabel() {
    return ({ LUZ: 'Luz', GAS: 'Gas', MOBILE: 'Móvil', INTERNET: 'Internet' } as Record<string, string>)[this.serviceType] ?? this.serviceType;
  }
  get typeColor() {
    return ({ LUZ: '#D97706', GAS: '#059669', MOBILE: '#7C3AED', INTERNET: '#0284C7' } as Record<string, string>)[this.serviceType] ?? '#227CFF';
  }
  get typeBg() {
    return ({ LUZ: '#FEF9EE', GAS: '#F0FDF8', MOBILE: '#F5F3FF', INTERNET: '#F0F9FF' } as Record<string, string>)[this.serviceType] ?? '#EAF2FF';
  }
  get typeBorder() {
    return ({ LUZ: '#FDE68A', GAS: '#A7F3D0', MOBILE: '#DDD6FE', INTERNET: '#BAE6FD' } as Record<string, string>)[this.serviceType] ?? '#C7D2FE';
  }

  ngOnChanges() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getServices().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: groups => {
        const group = groups.find(g => g.serviceType === this.serviceType);
        // Map ServiceTariff to ServiceListItem shape for backward compatibility
        const items = (group?.tariffs ?? []).map(t => ({
          id: t.id, name: t.name, tariffCode: t.code,
          serviceType: group!.serviceType as any,
          isActive: true, validFrom: null, validUntil: null,
          providerId: 0, providerName: '',
        }));
        this.allServices = items as any;
        this.filtered    = items as any;
      },
    });
  }

  viewDetail(t: ServiceListItem) { this.router.navigate(['/services/tarifas', t.id]); }

  openCreate() { this.editItem = null; this.formVisible = true; }
  openEdit(t: ServiceListItem) { this.editItem = t; this.formVisible = true; }
  closeForm() { this.formVisible = false; this.editItem = null; }

  openDelete(t: ServiceListItem) { this.deleteTarget = t; }

  confirmDelete() {
    if (!this.deleteTarget) return;
    this.deleting.set(true);
    this.svc.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget = null;
        this.showToast('Tarifa eliminada correctamente', 'ok');
        this.load();
      },
      error: (e: any) => {
        this.deleting.set(false);
        this.showToast(e?.error?.error ?? 'No se pudo eliminar', 'err');
      },
    });
  }

  onSaved() {
    this.closeForm();
    this.showToast('Tarifa guardada correctamente', 'ok');
    this.load();
  }

  private showToast(msg: string, type: 'ok' | 'err') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
