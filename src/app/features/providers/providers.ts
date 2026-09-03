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
import { DataTableComponent, DataTableColumn } from '../../shared/data-table/data-table';
import { SuminexLoader } from '../../shared/components/suminex-loader/suminex-loader';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    ButtonModule, DialogModule, InputTextModule,
    ToggleSwitchModule, TagModule, ToastModule, ConfirmDialogModule,
    SuminexLoader, DataTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './providers.html',
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
