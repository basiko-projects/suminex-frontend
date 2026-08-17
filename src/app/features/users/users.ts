import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { UserItem, UserRole } from '../../core/models/user.model';
import { UserFormComponent } from './user-form';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PopoverModule, Popover } from 'primeng/popover';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table/data-table';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    ButtonModule, TagModule, SelectModule, TooltipModule, ToastModule, ConfirmDialogModule, PopoverModule,
    UserFormComponent, DataTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    @if (formVisible) {
      <app-user-form
        [editUser]="editingUser"
        (saved)="onUserSaved()"
        (cancelled)="closeForm()"
      />
    }

    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
      </div>
    }

    <!-- Shared table -->
    <app-data-table
      title="Usuarios"
      subtitle="Todos los usuarios registrados en la plataforma"
      [columns]="tableColumns"
      [rows]="items"
      [total]="total"
      [page]="page"
      [pageSize]="pageSize"
      [loading]="loading()"
      [rowTemplate]="rowTpl"
      emptyMessage="No hay usuarios con los filtros aplicados"
      (pageChange)="onPageChange($event)"
      (pageSizeChange)="onPageSizeChange($event)"
      (filterIconClick)="onFilterIconClick($event, rolPop, estadoPop, verificadoPop)">
      <p-button dtActions label="Nuevo usuario" icon="pi pi-user-plus" size="small" (onClick)="formVisible = true" />
    </app-data-table>

    <!-- Filter popovers -->
    <p-popover #rolPop>
      <div class="filter-pop">
        <span class="filter-pop-title">Rol</span>
        <p-select [options]="roleOpts" [(ngModel)]="filterRole"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos" [showClear]="true"
                  (onChange)="search(); rolPop.hide()" />
      </div>
    </p-popover>

    <p-popover #estadoPop>
      <div class="filter-pop">
        <span class="filter-pop-title">Estado</span>
        <p-select [options]="activeOpts" [(ngModel)]="filterActive"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos" [showClear]="true"
                  (onChange)="search(); estadoPop.hide()" />
      </div>
    </p-popover>

    <p-popover #verificadoPop>
      <div class="filter-pop">
        <span class="filter-pop-title">Verificación</span>
        <p-select [options]="verifiedOpts" [(ngModel)]="filterVerified"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos" [showClear]="true"
                  (onChange)="search(); verificadoPop.hide()" />
      </div>
    </p-popover>

    <!-- Row template -->
    <ng-template #rowTpl let-u>
      <td>
        <div class="user-info">
          <span class="u-name">{{ u.fullName }}</span>
          <span class="u-email">{{ u.email }}</span>
        </div>
      </td>
      <td class="cell-mono">{{ u.phone || '—' }}</td>
      <td style="text-align:center">
        <span [class]="'role-pill role-' + u.role.toLowerCase()">{{ u.role }}</span>
      </td>
      <td style="text-align:center">
        <p-tag [value]="u.isActive ? 'Activo' : 'Inactivo'"
               [severity]="u.isActive ? 'success' : 'danger'" />
      </td>
      <td style="text-align:center">
        <p-tag [value]="u.isVerified ? 'Verificado' : 'Pendiente'"
               [severity]="u.isVerified ? 'success' : 'warn'" />
      </td>
      <td class="cell-dim">{{ u.createdAt | date:'dd/MM/yy' }}</td>
      <td style="text-align:center">
        <div class="row-actions">
          <button class="icon-btn" (click)="openEdit(u)" pTooltip="Editar">
            <i class="pi pi-pencil"></i>
          </button>
          <button class="icon-btn icon-btn-danger" (click)="confirmDelete(u)" pTooltip="Eliminar">
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </td>
    </ng-template>
  `,
  styles: [`
    /* Filter popovers */
    .filter-pop { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.25rem; min-width: 200px; }
    .filter-pop-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sx-text-3); }

    /* Error banner */
    .load-error-banner {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-radius: 10px;
      background: var(--sx-red-bg); border: 1px solid var(--sx-red);
      color: var(--sx-red); font-size: 0.85rem; margin-bottom: 1rem;
    }
    .load-error-retry {
      margin-left: auto; background: transparent; border: 1px solid var(--sx-red);
      color: var(--sx-red); border-radius: 6px; padding: 4px 10px;
      font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px;
    }

    /* Row cells — data-table's scoped CSS doesn't reach ng-template cells, so td padding lives here */
    td { padding: 0.85rem 1.5rem; vertical-align: middle; font-size: 14px; font-weight: 500; color: #292D32; }
    td:first-child { padding-left: 3rem; }
    td:last-child  { padding-right: 3rem; }

    .user-info { display: flex; flex-direction: column; gap: 0.1rem; }
    .u-name    { font-weight: 600; font-size: 14px; color: var(--sx-text); }
    .u-email   { font-size: 0.73rem; color: var(--sx-text-3); }

    .cell-mono { font-size: 0.83rem; color: var(--sx-text-2); font-variant-numeric: tabular-nums; }
    .cell-dim  { font-size: 0.83rem; color: var(--sx-text-2); }

    /* ── Role pill ── */
    .role-pill {
      display: inline-block;
      font-size: 0.69rem; font-weight: 700;
      padding: 0.25rem 0.75rem; border-radius: 20px;
      text-transform: uppercase; letter-spacing: 0.07em;
    }
    .role-admin  { background: rgba(34,124,255,0.13); color: #227CFF; }
    .role-client { background: rgba(34,124,255,0.13); color: #227CFF; }
    .role-user   { background: rgba(34,124,255,0.13); color: #227CFF; }
    .role-agent  { background: rgba(22,163,74,0.13);  color: #16A34A; }

    /* ── Row actions ── */
    .row-actions { display: flex; align-items: center; justify-content: center; gap: 4px; }
    .icon-btn {
      width: 30px; height: 30px; border-radius: 7px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-2); display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 140ms ease;
    }
    .icon-btn .pi { font-size: 0.75rem; }
    .icon-btn:hover { background: var(--sx-surface-2); color: var(--sx-text); border-color: var(--sx-border-2); }
    .icon-btn-danger:hover { background: var(--sx-red-bg); color: var(--sx-red); border-color: var(--sx-red); }
  `]
})
export class UsersComponent implements OnInit {
  private svc     = inject(UsersService);
  private msg     = inject(MessageService);
  private confirm = inject(ConfirmationService);

  items:        UserItem[] = [];
  total         = 0;
  loading       = signal(true);
  loadError     = '';
  formVisible   = false;
  editingUser:  UserItem | null = null;
  page          = 1;
  pageSize      = 20;

  get tableColumns(): DataTableColumn[] {
    return [
      { key: 'user',     label: 'Usuario' },
      { key: 'phone',    label: 'Teléfono' },
      { key: 'role',     label: 'Rol',        align: 'center', filterIcon: true, filterActive: this.filterRole !== null },
      { key: 'status',   label: 'Estado',     align: 'center', filterIcon: true, filterActive: this.filterActive !== null },
      { key: 'verified', label: 'Verificado', align: 'center', filterIcon: true, filterActive: this.filterVerified !== null },
      { key: 'created',  label: 'Alta' },
      { key: 'actions',  label: 'Acciones',   align: 'center', width: '90px' },
    ];
  }

  filterRole:     UserRole | null = null;
  filterActive:   boolean | null  = null;
  filterVerified: boolean | null  = null;

  roleOpts = [
    { label: 'Admin',  value: 'Admin'  },
    { label: 'Client', value: 'Client' },
    { label: 'Agent',  value: 'Agent'  },
  ];
  activeOpts = [
    { label: 'Activos',   value: true  },
    { label: 'Inactivos', value: false },
  ];
  verifiedOpts = [
    { label: 'Verificados',    value: true  },
    { label: 'No verificados', value: false },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError = '';
    this.svc.getAll({
      page:       this.page,
      pageSize:   this.pageSize,
      role:       this.filterRole     ?? undefined,
      isActive:   this.filterActive   !== null ? this.filterActive!   : undefined,
      isVerified: this.filterVerified !== null ? this.filterVerified! : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next:  r => { this.items = r.items ?? []; this.total = r.totalCount ?? 0; },
      error: e => {
        this.loadError = e?.status === 401
          ? 'Sin autorización. Verifica tu sesión.'
          : 'Error al cargar los usuarios. Inténtalo de nuevo.';
      },
    });
  }

  openEdit(u: UserItem) { this.editingUser = u; this.formVisible = true; }
  closeForm()          { this.formVisible = false; this.editingUser = null; }

  onUserSaved() {
    const isEdit = !!this.editingUser;
    this.closeForm();
    this.msg.add({ severity: 'success', summary: isEdit ? 'Usuario actualizado' : 'Usuario creado', detail: isEdit ? 'Los cambios se guardaron correctamente.' : 'El usuario se creó correctamente.' });
    this.search();
  }

  confirmDelete(u: UserItem) {
    this.confirm.confirm({
      message:     `¿Eliminar al usuario <strong>${u.fullName}</strong>? Esta acción no se puede deshacer.`,
      header:      'Confirmar eliminación',
      icon:        'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.delete(u.id).subscribe({
          next:  () => { this.msg.add({ severity: 'success', summary: 'Eliminado', detail: `${u.fullName} fue eliminado.` }); this.search(); },
          error: e  => { this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.message ?? 'No se pudo eliminar el usuario.' }); },
        });
      },
    });
  }

  search() { this.page = 1; this.load(); }

  clear() {
    this.filterRole     = null;
    this.filterActive   = null;
    this.filterVerified = null;
    this.search();
  }

  onPageChange(p: number)        { this.page = p; this.load(); }
  onPageSizeChange(size: number) { this.pageSize = size; this.page = 1; this.load(); }

  onFilterIconClick(e: { key: string; event: Event }, rolPop: Popover, estadoPop: Popover, verificadoPop: Popover) {
    if (e.key === 'role')     rolPop.toggle(e.event);
    if (e.key === 'status')   estadoPop.toggle(e.event);
    if (e.key === 'verified') verificadoPop.toggle(e.event);
  }
}
