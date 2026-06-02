import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { UserItem, UserRole } from '../../core/models/user.model';
import { UserFormComponent } from './user-form';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, TagModule, SelectModule, TooltipModule, ToastModule, ConfirmDialogModule, UserFormComponent],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <div>
        <h1>Usuarios</h1>
        <p class="page-subtitle">Todos los usuarios registrados en la plataforma</p>
      </div>
      <div class="header-right">
        <div class="total-badge">
          <i class="pi pi-users"></i>
          <span>{{ total }} usuarios</span>
        </div>
        <p-button label="Nuevo usuario" icon="pi pi-user-plus" (onClick)="formVisible = true" />
      </div>
    </div>

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

    <!-- Una sola card: filtros + tabla -->
    <div class="main-card">

      <!-- Filtros dentro de la card -->
      <div class="card-filters">
        <p-select [options]="roleOpts" [(ngModel)]="filterRole"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos los roles" [showClear]="true"
                  (onChange)="search()" />
        <p-select [options]="activeOpts" [(ngModel)]="filterActive"
                  optionLabel="label" optionValue="value"
                  placeholder="Todos los estados" [showClear]="true"
                  (onChange)="search()" />
        <p-select [options]="verifiedOpts" [(ngModel)]="filterVerified"
                  optionLabel="label" optionValue="value"
                  placeholder="Verificación" [showClear]="true"
                  (onChange)="search()" />
        <p-button label="Buscar" icon="pi pi-search" size="small" (onClick)="search()" />
        <p-button icon="pi pi-times" size="small" severity="secondary" [text]="true"
                  (onClick)="clear()" pTooltip="Limpiar filtros" />
      </div>

      <!-- Separador -->
      <div class="card-sep"></div>

      <!-- Tabla sin card propia -->
      <p-table
        [value]="items"
        [loading]="loading()"
        [lazy]="true"
        (onLazyLoad)="onLazy($event)"
        [totalRecords]="total"
        [paginator]="true"
        [rows]="pageSize"
        class="p-datatable-sm"
      >
        <ng-template pTemplate="paginatorleft">
          <span class="pag-info">Página {{ page }} de {{ totalPages }} — Total: {{ total }}</span>
        </ng-template>

        <ng-template pTemplate="paginatorright">
          <div class="pag-right">
            <div class="jtp-wrap">
              <input type="number" class="jtp-input" [(ngModel)]="jumpPage"
                     [min]="1" [max]="totalPages"
                     (keyup.enter)="goToPage()" />
              <button class="jtp-btn" (click)="goToPage()">Ir</button>
            </div>
            <p-select [options]="pageSizeOpts" [(ngModel)]="pageSize"
                      optionLabel="label" optionValue="value"
                      (onChange)="onPageSizeChange()" />
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th>Usuario</th>
            <th>Teléfono</th>
            <th style="text-align:center">Rol</th>
            <th style="text-align:center">Estado</th>
            <th style="text-align:center">Verificado</th>
            <th>Alta</th>
            <th style="text-align:right; width:90px">Acciones</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-u>
          <tr>
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
            <td>
              <div class="row-actions">
                <button class="icon-btn" (click)="openEdit(u)" pTooltip="Editar">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="icon-btn icon-btn-danger" (click)="confirmDelete(u)" pTooltip="Eliminar">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-users"></i>
              <span>No hay usuarios con los filtros aplicados</span>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    /* ── Page header ── */
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.75rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);
    }
    .page-header h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .page-subtitle  { color: var(--text-muted); font-size: 0.83rem; margin-top: 0.25rem; }

    .header-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
    :host ::ng-deep .header-right p-button { display: inline-flex; }

    .total-badge {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(61,142,255,0.08); border: 1px solid rgba(61,142,255,0.2);
      color: var(--sx-primary); font-size: 0.82rem; font-weight: 600;
      padding: 0.5rem 1rem; border-radius: 10px;
    }

    /* ── Single unified card ── */
    .main-card {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 14px;
      /* Sin overflow:hidden para que los dropdowns del paginador no se corten */
    }

    .card-filters {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      flex-wrap: wrap;
      border-radius: 14px 14px 0 0;
    }

    .card-sep {
      height: 1px;
      background: var(--sx-border);
    }

    :host ::ng-deep .main-card .p-datatable { background: transparent; }
    :host ::ng-deep .main-card .p-datatable .p-datatable-table-container {
      border: none; border-radius: 0;
    }
    :host ::ng-deep .main-card .p-paginator {
      border-top: 1px solid var(--sx-border);
      border-radius: 0 0 14px 14px;
      background: transparent;
    }

    .user-info { display: flex; flex-direction: column; gap: 0.1rem; }
    .u-name    { font-weight: 600; font-size: 0.875rem; color: var(--sx-text); }
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
    .role-admin  { background: rgba(167,139,250,0.15); color: #A78BFA; }
    .role-client { background: rgba(61,142,255,0.13);  color: #3D8EFF; }
    .role-user   { background: rgba(61,142,255,0.13);  color: #3D8EFF; }
    .role-agent  { background: rgba(52,211,153,0.13);  color: #34D399; }

    /* ── Row actions ── */
    .row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
    .icon-btn {
      width: 30px; height: 30px; border-radius: 7px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-2); display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 140ms ease;
    }
    .icon-btn .pi { font-size: 0.75rem; }
    .icon-btn:hover { background: var(--sx-surface-2); color: var(--sx-text); border-color: var(--sx-border-2); }
    .icon-btn-danger:hover { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.3); }

    /* ── Empty ── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.75rem; padding: 3rem; color: var(--text-dim);
    }
    .empty-state .pi { font-size: 2rem; }
    .empty-state span { font-size: 0.875rem; }

    .pag-info { font-size: 0.78rem; color: var(--sx-text-2); font-weight: 500; white-space: nowrap; }
    .pag-right { display: flex; align-items: center; gap: 0.5rem; }
    .jtp-wrap  { display: flex; align-items: center; gap: 4px; }
    .jtp-input {
      width: 52px; height: 32px; border-radius: 6px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text); font-size: 0.8rem; text-align: center;
      padding: 0; outline: none;
    }
    .jtp-input:focus { border-color: var(--sx-primary); }
    .jtp-btn {
      height: 32px; padding: 0 0.65rem; border-radius: 6px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-2); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 120ms;
    }
    .jtp-btn:hover { border-color: var(--sx-primary); color: var(--sx-primary); }
  `]
})
export class UsersComponent {
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
  pageSize      = 10;
  jumpPage = 1;
  pageSizeOpts = [
    { label: '10 / pág', value: 10 },
    { label: '20 / pág', value: 20 },
    { label: '50 / pág', value: 50 },
  ];
  get totalPages(): number { return Math.ceil(this.total / this.pageSize) || 1; }

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

  onLazy(e: TableLazyLoadEvent) {
    if (e.rows) this.pageSize = e.rows;
    this.page = ((e.first ?? 0) / this.pageSize) + 1;
    this.load();
  }

  goToPage() {
    const p = Math.max(1, Math.min(this.jumpPage, this.totalPages));
    this.page = p;
    this.load();
  }
  onPageSizeChange() { this.page = 1; this.load(); }

}
