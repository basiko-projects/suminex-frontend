import { Component, OnInit, inject, ViewChild, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvidersService } from '../../core/services/providers.service';
import { Provider, ProviderForm } from '../../core/models/provider.model';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    ToggleSwitchModule, TagModule, ToastModule, ConfirmDialogModule,
    IconFieldModule, InputIconModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <div>
        <h1>Proveedores</h1>
        <p class="page-subtitle">Gestiona las compañías proveedoras de servicios energéticos</p>
      </div>
      <p-button label="Nuevo proveedor" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
      </div>
    }

    <div class="table-card">
      <div class="table-toolbar">
        <p-iconfield>
          <p-inputicon class="pi pi-search" />
          <input pInputText [(ngModel)]="globalFilter"
                 (input)="dt.filterGlobal(globalFilter, 'contains')"
                 placeholder="Buscar proveedor..." />
        </p-iconfield>
        <span class="record-count">{{ providers.length }} registros</span>
      </div>

      <p-table
        #dt
        [value]="providers"
        [loading]="loading()"
        [paginator]="true"
        [rows]="10"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Página {currentPage} de {totalPages} — Total: {totalRecords}"
        [rowsPerPageOptions]="[10, 20, 50]"
        class="p-datatable-sm"
        [globalFilterFields]="['name','cif']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Nombre <p-sortIcon field="name" /></th>
            <th>CIF</th>
            <th pSortableColumn="serviceCount" style="text-align:center">Servicios <p-sortIcon field="serviceCount" /></th>
            <th pSortableColumn="createdAt">Alta <p-sortIcon field="createdAt" /></th>
            <th style="text-align:center">Estado</th>
            <th style="text-align:right">Acciones</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-p>
          <tr>
            <td>
              <div class="provider-name-cell">
                <div class="provider-avatar">{{ p.name.charAt(0) }}</div>
                <span class="fw-600">{{ p.name }}</span>
              </div>
            </td>
            <td><code>{{ p.cif }}</code></td>
            <td style="text-align:center">
              <span class="count-pill">{{ p.serviceCount }}</span>
            </td>
            <td class="text-muted text-sm">{{ p.createdAt | date:'dd/MM/yyyy' }}</td>
            <td style="text-align:center">
              <p-tag [value]="p.isActive ? 'Activo' : 'Inactivo'"
                     [severity]="p.isActive ? 'success' : 'danger'" />
            </td>
            <td>
              <div class="row-actions" style="justify-content:flex-end">
                <button class="icon-btn" (click)="edit(p)" title="Editar">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="icon-btn icon-btn-danger" (click)="confirmDelete(p)" title="Desactivar">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6">
              <div class="empty-state">
                <i class="pi pi-building"></i>
                <span>No hay proveedores registrados</span>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Dialog -->
    <p-dialog
      [(visible)]="dialogVisible"
      [header]="isEdit ? 'Editar proveedor' : 'Nuevo proveedor'"
      [modal]="true"
      [style]="{width:'460px'}"
      [draggable]="false"
    >
      <div class="dialog-form">
        <div class="field">
          <label>Nombre *</label>
          <input pInputText [(ngModel)]="form.name" class="w-full" placeholder="Ej: Iberdrola" />
        </div>
        <div class="field">
          <label>CIF *</label>
          <input pInputText [(ngModel)]="form.cif" class="w-full" placeholder="A12345678" />
        </div>
        @if (isEdit) {
          <div class="field-row">
            <label>Estado activo</label>
            <p-toggleswitch [(ngModel)]="form.isActive" />
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
        <p-button [label]="isEdit ? 'Guardar cambios' : 'Crear proveedor'"
                  icon="pi pi-check" [loading]="saving" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--sx-border); }
    .page-header h1 { font-size:1.6rem; font-weight:700; letter-spacing:-0.02em; color:var(--sx-text); }
    .page-subtitle { color:var(--sx-text-2); font-size:0.83rem; margin-top:0.25rem; }

    .table-toolbar {
      display:flex; justify-content:space-between; align-items:center;
      padding:1rem 1.25rem; border-bottom:1px solid var(--sx-border);
    }
    .record-count { font-size:0.78rem; color:var(--sx-text-3); font-weight:500; }

    .provider-name-cell { display:flex; align-items:center; gap:0.75rem; }
    .provider-avatar {
      width:32px; height:32px; border-radius:9px;
      background:var(--sx-primary-bg); border:1px solid var(--sx-border-2);
      color:var(--sx-primary-text); font-size:0.8rem; font-weight:700;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .fw-600 { font-weight:600; }

    .count-pill {
      display:inline-flex; align-items:center; justify-content:center;
      background:var(--sx-surface-2); border:1px solid var(--sx-border);
      color:var(--sx-text-2); font-size:0.75rem; font-weight:600;
      min-width:28px; padding:0.15rem 0.5rem; border-radius:20px;
    }

    .icon-btn {
      width:32px; height:32px; border-radius:8px;
      border:1px solid var(--sx-border); background:transparent;
      color:var(--sx-text-2); display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all 150ms ease;
    }
    .icon-btn:hover { background:var(--sx-surface-2); color:var(--sx-text); border-color:var(--sx-border-2); }
    .icon-btn-danger:hover { background:var(--sx-red-bg); color:var(--sx-red); border-color:var(--sx-red); }
    .icon-btn .pi { font-size:0.8rem; }

    .text-muted { color:var(--sx-text-2); }
    .text-sm { font-size:0.82rem; }

    .empty-state {
      display:flex; flex-direction:column; align-items:center; gap:0.75rem;
      padding:3rem; color:var(--sx-text-3);
    }
    .empty-state .pi { font-size:2rem; }
    .empty-state span { font-size:0.875rem; }

    .dialog-form { display:flex; flex-direction:column; gap:1.25rem; padding:0.25rem 0; }
    .field { display:flex; flex-direction:column; gap:0.5rem; }
    .field-row { display:flex; align-items:center; justify-content:space-between; padding:0.25rem 0; }
    label { font-size:0.78rem; font-weight:600; color:var(--sx-text-2); text-transform:uppercase; letter-spacing:0.05em; }
  `]
})
export class ProvidersComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  private svc     = inject(ProvidersService);
  private msg     = inject(MessageService);
  private confirm = inject(ConfirmationService);

  providers: Provider[] = [];
  loading = signal(true);
  loadError = '';
  dialogVisible = false;
  isEdit = false;
  saving = false;
  globalFilter = '';
  selectedProvider: Provider | null = null;
  form: ProviderForm & { isActive?: boolean } = { name: '', cif: '', isActive: true };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll().pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  d => { this.providers = d; },
      error: e => { this.loadError = e?.status === 401 ? 'Sin autorización. Verifica tu sesión.' : 'Error al cargar los proveedores. Inténtalo de nuevo.'; },
    });
  }

  openNew() {
    this.isEdit = false;
    this.form = { name: '', cif: '', isActive: true };
    this.dialogVisible = true;
  }

  edit(p: Provider) {
    this.isEdit = true;
    this.selectedProvider = p;
    this.form = { name: p.name, cif: p.cif, isActive: p.isActive };
    this.dialogVisible = true;
  }

  save() {
    if (!this.form.name || !this.form.cif) {
      this.msg.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Nombre y CIF son obligatorios.' });
      return;
    }
    this.saving = true;
    const obs$ = this.isEdit
      ? this.svc.update(this.selectedProvider!.id, this.form)
      : this.svc.create(this.form);

    (obs$ as any).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Guardado', detail: `Proveedor ${this.isEdit ? 'actualizado' : 'creado'} correctamente.` });
        this.dialogVisible = false;
        this.saving = false;
        this.load();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
        this.saving = false;
      },
    });
  }

  confirmDelete(p: Provider) {
    this.confirm.confirm({
      message: `¿Desactivar el proveedor <strong>${p.name}</strong>?`,
      header: 'Confirmar acción',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.svc.delete(p.id).subscribe({
          next: () => { this.msg.add({ severity: 'success', summary: 'Desactivado', detail: 'Proveedor desactivado.' }); this.load(); },
          error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar.' }),
        });
      },
    });
  }
}
