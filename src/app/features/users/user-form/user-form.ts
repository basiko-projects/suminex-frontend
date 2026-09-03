import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { UserItem } from '../../../core/models/user.model';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SuminexLoader } from '../../../shared/components/suminex-loader/suminex-loader';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule, ButtonModule, InputTextModule,
    PasswordModule, SelectModule, MessageModule, ToggleSwitchModule, SuminexLoader,
  ],
  templateUrl: './user-form.html',
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
  role: 'Admin' | 'Collaborator' = 'Collaborator';
  isActive = true;

  roleOpts = [
    { label: 'Administrador', value: 'Admin' },
    { label: 'Colaborador',   value: 'Collaborator' },
  ];

  ngOnInit() {
    if (this.editUser) {
      this.fullName = this.editUser.fullName;
      this.email    = this.editUser.email;
      this.phone    = this.editUser.phone ?? '';
      this.role     = (this.editUser.role === 'Admin' ? 'Admin' : 'Collaborator');
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
