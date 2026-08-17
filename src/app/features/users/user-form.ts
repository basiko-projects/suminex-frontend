import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { UserItem } from '../../core/models/user.model';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SuminexLoaderComponent } from '../../shared/components/suminex-loader';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule, ButtonModule, InputTextModule,
    PasswordModule, SelectModule, MessageModule, ToggleSwitchModule, SuminexLoaderComponent,
  ],
  template: `
    <p-dialog
      [visible]="true"
      [header]="editUser ? 'Editar usuario' : 'Nuevo usuario'"
      [modal]="true"
      [style]="{ width: '480px' }"
      [draggable]="false"
      [closable]="true"
      (onHide)="cancelled.emit()"
    >
      <div class="form-body">

        @if (apiError) {
          <div class="api-error">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ apiError }}</span>
          </div>
        }

        <div class="form-row">
          <div class="field">
            <label>Nombre completo <span class="req">*</span></label>
            <input pInputText [(ngModel)]="fullName" placeholder="Ej: María García"
                   class="w-full" [class.field-error]="submitted && !fullName" />
          </div>
        </div>

        <div class="form-row two-col">
          <div class="field">
            <label>Correo electrónico <span class="req">*</span></label>
            <input pInputText [(ngModel)]="email" type="email"
                   placeholder="correo@ejemplo.com"
                   class="w-full" [class.field-error]="submitted && !email" />
          </div>
          <div class="field">
            <label>Teléfono</label>
            <input pInputText [(ngModel)]="phone" placeholder="+34 600 000 000" class="w-full" />
          </div>
        </div>

        @if (editUser) {
          <div class="form-row two-col">
            <div class="field">
              <label>Rol <span class="req">*</span></label>
              <p-select [options]="roleOpts" [(ngModel)]="role"
                        optionLabel="label" optionValue="value"
                        placeholder="Seleccionar"
                        class="w-full" [class.field-error]="submitted && !role" />
            </div>
            <div class="field">
              <label>Estado</label>
              <div class="toggle-row">
                <p-toggleswitch [(ngModel)]="isActive" />
                <span class="toggle-label">{{ isActive ? 'Activo' : 'Inactivo' }}</span>
              </div>
            </div>
          </div>
        } @else {
          <div class="form-row">
            <div class="field">
              <label>Rol <span class="req">*</span></label>
              <p-select [options]="roleOpts" [(ngModel)]="role"
                        optionLabel="label" optionValue="value"
                        placeholder="Seleccionar"
                        class="w-full" [class.field-error]="submitted && !role" />
            </div>
          </div>
        }

        <div class="form-row">
          <div class="field">
            <label>
              Contraseña
              @if (!editUser) { <span class="req">*</span> }
              @if (editUser) { <span class="optional">(dejar vacío para no cambiar)</span> }
            </label>
            <p-password [(ngModel)]="password" [toggleMask]="true"
                        [feedback]="false"
                        [placeholder]="editUser ? '••••••••' : 'Mínimo 8 caracteres'"
                        class="w-full" inputClass="w-full"
                        [class.field-error]="submitted && !editUser && !password" />
          </div>
        </div>

      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true"
                  (onClick)="cancelled.emit()" [disabled]="saving()" />
        <p-button [label]="editUser ? 'Guardar cambios' : 'Crear usuario'"
                  icon="pi pi-check"
                  (onClick)="submit()" [loading]="saving()">
          <ng-template pTemplate="loadingicon">
            <app-suminex-loader [size]="14" />
          </ng-template>
        </p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .form-body { display: flex; flex-direction: column; gap: 0; }

    .form-row { margin-bottom: 1.1rem; }
    .form-row.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field label {
      font-size: 0.81rem; font-weight: 600;
      color: var(--sx-text-2);
    }
    .req      { color: #f87171; }
    .optional { font-weight: 400; font-size: 0.75rem; color: var(--sx-text-3); margin-left: 4px; }

    .toggle-row { display: flex; align-items: center; gap: 0.6rem; height: 38px; }
    .toggle-label { font-size: 0.83rem; color: var(--sx-text-2); }

    .api-error {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25);
      color: #f87171; border-radius: 8px;
      padding: 0.65rem 0.9rem; font-size: 0.82rem;
      margin-bottom: 1.1rem;
    }
    .api-error .pi { font-size: 0.9rem; flex-shrink: 0; }

    :host ::ng-deep .w-full { width: 100% !important; }
    :host ::ng-deep p-password { width: 100% !important; }
    :host ::ng-deep p-password .p-password { width: 100% !important; }
    :host ::ng-deep p-select.w-full > .p-select { width: 100% !important; }

    :host ::ng-deep .field-error .p-inputtext,
    :host ::ng-deep .field-error.p-inputtext,
    :host ::ng-deep .field-error .p-select,
    :host ::ng-deep .field-error > .p-password .p-inputtext {
      border-color: #f87171 !important;
    }
  `]
})
export class UserFormComponent implements OnInit {
  @Input() editUser: UserItem | null = null;
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc = inject(UsersService);

  saving    = signal(false);
  submitted = false;
  apiError  = '';

  fullName = '';
  email    = '';
  phone    = '';
  password = '';
  role: 'Admin' | 'Agent' = 'Agent';
  isActive = true;

  roleOpts = [
    { label: 'Administrador', value: 'Admin' },
    { label: 'Agente',        value: 'Agent' },
  ];

  ngOnInit() {
    if (this.editUser) {
      this.fullName = this.editUser.fullName;
      this.email    = this.editUser.email;
      this.phone    = this.editUser.phone ?? '';
      this.role     = (this.editUser.role === 'Admin' ? 'Admin' : 'Agent');
      this.isActive = this.editUser.isActive;
    }
  }

  submit() {
    this.submitted = true;
    this.apiError  = '';

    if (!this.fullName || !this.email || !this.role) return;
    if (!this.editUser && !this.password) return;

    this.saving.set(true);

    const obs = this.editUser
      ? this.svc.update(this.editUser.id, {
          fullName: this.fullName,
          email:    this.email,
          phone:    this.phone,
          role:     this.role,
          isActive: this.isActive,
          ...(this.password ? { password: this.password } : {}),
        })
      : this.svc.create({
          fullName: this.fullName,
          email:    this.email,
          phone:    this.phone,
          password: this.password,
          role:     this.role,
        });

    obs.subscribe({
      next:  () => { this.saving.set(false); this.saved.emit(); },
      error: e  => {
        this.saving.set(false);
        this.apiError = e?.error?.message ?? 'Error al guardar el usuario.';
      },
    });
  }
}
