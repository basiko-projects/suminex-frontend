import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { UserItem, UserRole } from '../../../core/models/user.model';
import { UserFormComponent } from '../user-form/user-form';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PopoverModule, Popover } from 'primeng/popover';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table';
import { FiscalProfileDialogService } from '../../../shared/services/fiscal-profile-dialog.service';
import { BillingContextService } from '../../../shared/services/billing-context.service';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    ButtonModule, TagModule, SelectModule, TooltipModule, ToastModule, ConfirmDialogModule, PopoverModule,
    UserFormComponent, DataTableComponent, Icon,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  private svc     = inject(UsersService);
  private msg     = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private router  = inject(Router);
  profileDialog   = inject(FiscalProfileDialogService);
  private billingContext = inject(BillingContextService);

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
    { label: 'Admin',       value: 'Admin' as UserRole       },
    { label: 'Cliente',     value: 'Client' as UserRole      },
    { label: 'Colaborador', value: 'Collaborator' as UserRole },
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

  openFiscalProfile(u: UserItem) {
    this.profileDialog.open({ userId: u.id, userName: u.fullName });
  }

  openBilling(u: UserItem) {
    this.billingContext.setTarget({ collaboratorId: u.id, collaboratorName: u.fullName });
    this.router.navigate(['/billing']);
  }

  /** PATCH /api/users/{id}/role — único mecanismo para cambiar el rol de un usuario. Binding de un solo sentido:
   *  u.role solo se actualiza si la llamada tiene éxito, así el <select> no cambia visualmente si falla. */
  onRoleChange(u: UserItem, newRole: UserRole) {
    if (newRole === u.role) return;
    this.svc.changeRole(u.id, newRole).subscribe({
      next: () => {
        u.role = newRole;
        this.msg.add({ severity: 'success', summary: 'Rol actualizado', detail: `${u.fullName} ahora es ${this.roleLabel(newRole)}.` });
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.message ?? 'No se pudo cambiar el rol.' });
      },
    });
  }

  roleLabel(role: UserRole): string {
    return this.roleOpts.find(o => o.value === role)?.label ?? role;
  }

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

  roleSelectClasses(role: string): string {
    const base = 'py-1 px-2.5 rounded-lg text-[0.69rem] font-bold uppercase tracking-wider border-none cursor-pointer';
    if (role === 'Collaborator') return `${base} bg-sx-green-bg text-sx-green`;
    if (role === 'Client')       return `${base} bg-sx-surface-2 text-sx-text-2`;
    return `${base} bg-sx-primary-bg text-sx-primary`;
  }
}
