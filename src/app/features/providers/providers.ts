import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvidersService } from '../../core/services/providers.service';
import { Provider, ProviderForm } from '../../core/models/provider.model';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SuminexLoaderComponent } from '../../shared/components/suminex-loader';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table/data-table';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    ButtonModule, DialogModule, InputTextModule,
    ToggleSwitchModule, TagModule, ToastModule, ConfirmDialogModule,
    SuminexLoaderComponent, DataTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
      </div>
    }

    <!-- Shared table -->
    <app-data-table
      title="Proveedores"
      subtitle="Gestiona las compañías proveedoras de servicios energéticos"
      [columns]="tableColumns"
      [rows]="pagedRows()"
      [total]="filteredTotal()"
      [page]="page()"
      [pageSize]="pageSize()"
      [loading]="loading()"
      [rowTemplate]="rowTpl"
      emptyMessage="No hay proveedores registrados"
      (searchChange)="onSearchChange($event)"
      (pageChange)="onPageChange($event)"
      (pageSizeChange)="onPageSizeChange($event)">
      <p-button dtActions label="Nuevo proveedor" icon="pi pi-plus" size="small" (onClick)="openNew()" />
    </app-data-table>

    <!-- Row template -->
    <ng-template #rowTpl let-p>
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
      <td style="text-align:center">
        <div class="row-actions">
          <button class="icon-btn" (click)="edit(p)" title="Editar">
            <i class="pi pi-pencil"></i>
          </button>
          <button class="icon-btn icon-btn-danger" (click)="confirmDelete(p)" title="Desactivar">
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </td>
    </ng-template>

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
                  icon="pi pi-check" [loading]="saving()" (onClick)="save()">
          <ng-template pTemplate="loadingicon">
            <app-suminex-loader [size]="14" />
          </ng-template>
        </p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    /* Row cells — data-table's scoped CSS doesn't reach ng-template cells */
    td { padding:0.85rem 1.5rem; vertical-align:middle; }
    td:first-child { padding-left:3rem; }
    td:last-child  { padding-right:3rem; }

    .row-actions { justify-content: center; }

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

    .dialog-form { display:flex; flex-direction:column; gap:1.25rem; padding:0.25rem 0; }
    .field { display:flex; flex-direction:column; gap:0.5rem; }
    .field-row { display:flex; align-items:center; justify-content:space-between; padding:0.25rem 0; }
    label { font-size:0.78rem; font-weight:600; color:var(--sx-text-2); text-transform:uppercase; letter-spacing:0.05em; }
  `]
})
export class ProvidersComponent implements OnInit {
  private svc     = inject(ProvidersService);
  private msg     = inject(MessageService);
  private confirm = inject(ConfirmationService);

  providers = signal<Provider[]>([]);
  loading = signal(true);
  loadError = '';
  dialogVisible = false;
  isEdit = false;
  saving = signal(false);
  selectedProvider: Provider | null = null;
  form: ProviderForm & { isActive?: boolean } = { name: '', cif: '', isActive: true };

  page = signal(1);
  pageSize = signal(20);
  searchTerm = signal('');

  tableColumns: DataTableColumn[] = [
    { key: 'name',     label: 'Nombre' },
    { key: 'cif',      label: 'CIF' },
    { key: 'services', label: 'Servicios', align: 'center' },
    { key: 'created',  label: 'Alta' },
    { key: 'status',   label: 'Estado',   align: 'center' },
    { key: 'actions',  label: 'Acciones', align: 'center', width: '100px' },
  ];

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.providers();
    if (!term) return list;
    return list.filter(p => p.name.toLowerCase().includes(term) || p.cif.toLowerCase().includes(term));
  });

  filteredTotal = computed(() => this.filtered().length);

  pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll().pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  d => { this.providers.set(d); },
      error: e => { this.loadError = e?.status === 401 ? 'Sin autorización. Verifica tu sesión.' : 'Error al cargar los proveedores. Inténtalo de nuevo.'; },
    });
  }

  onSearchChange(term: string)   { this.searchTerm.set(term); this.page.set(1); }
  onPageChange(p: number)        { this.page.set(p); }
  onPageSizeChange(size: number) { this.pageSize.set(size); this.page.set(1); }

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
    this.saving.set(true);
    const obs$ = this.isEdit
      ? this.svc.update(this.selectedProvider!.id, this.form)
      : this.svc.create(this.form);

    (obs$ as any).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Guardado', detail: `Proveedor ${this.isEdit ? 'actualizado' : 'creado'} correctamente.` });
        this.dialogVisible = false;
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
        this.saving.set(false);
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
