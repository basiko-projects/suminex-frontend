import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvidersService } from '../../core/services/providers.service';
import { Provider, ExternalIntegrationCode } from '../../core/models/provider.model';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DataTableComponent, DataTableColumn } from '../../shared/components/data-table/data-table';
import { BasikoLoader } from '../../shared/components/basiko-loader/basiko-loader';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    ButtonModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ConfirmDialogModule,
    BasikoLoader, DataTableComponent, Icon,
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

  name = '';
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  externalIntegrationCode: ExternalIntegrationCode | null = null;
  submitted = false;

  integrationOpts: { label: string; value: ExternalIntegrationCode | null }[] = [
    { label: 'Ninguno',      value: null },
    { label: 'GanaEnergia',  value: 'GanaEnergia' },
  ];

  page = signal(1);
  pageSize = signal(10);
  searchTerm = signal('');

  tableColumns: DataTableColumn[] = [
    { key: 'logo',        label: '' },
    { key: 'name',        label: 'Nombre' },
    { key: 'integration', label: 'Integración', align: 'center' },
    { key: 'created',     label: 'Alta' },
    { key: 'actions',     label: 'Acciones', align: 'center', width: '100px' },
  ];

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.providers();
    if (!term) return list;
    return list.filter(p => p.name.toLowerCase().includes(term));
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
    this.submitted = false;
    this.name = '';
    this.logoFile = null;
    this.logoPreviewUrl = null;
    this.externalIntegrationCode = null;
    this.dialogVisible = true;
  }

  edit(p: Provider) {
    this.isEdit = true;
    this.submitted = false;
    this.selectedProvider = p;
    this.name = p.name;
    this.logoFile = null;
    this.logoPreviewUrl = p.logoUrl;
    this.externalIntegrationCode = p.externalIntegrationCode ?? null;
    this.dialogVisible = true;
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoFile = file;
    this.logoPreviewUrl = URL.createObjectURL(file);
  }

  save() {
    this.submitted = true;
    if (!this.name || (!this.isEdit && !this.logoFile)) return;

    const form = new FormData();
    form.append('Name', this.name);
    if (this.logoFile) form.append('Logo', this.logoFile);
    form.append('ExternalIntegrationCode', this.externalIntegrationCode ?? '');

    this.saving.set(true);
    const obs$ = this.isEdit
      ? this.svc.update(this.selectedProvider!.id, form)
      : this.svc.create(form);

    obs$.subscribe({
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
      message: `¿Eliminar el proveedor <strong>${p.name}</strong>? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.svc.delete(p.id).subscribe({
          next: () => { this.msg.add({ severity: 'success', summary: 'Eliminado', detail: 'Proveedor eliminado.' }); this.load(); },
          error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' }),
        });
      },
    });
  }
}
