import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { UserItem } from '../../../core/models/user.model';
import { generatePassword } from '../../../core/helpers/password.helpers';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { BasikoLoader } from '../../../shared/components/basiko-loader/basiko-loader';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule, ButtonModule, InputTextModule,
    PasswordModule, SelectModule, MessageModule, ToggleSwitchModule, BasikoLoader, Icon,
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

  fullName     = '';
  email        = '';
  phoneCountry = '+34';
  phoneNumber  = '';
  password     = '';
  role: 'Admin' | 'Collaborator' = 'Collaborator';
  isActive = true;

  roleOpts = [
    { label: 'Administrador', value: 'Admin' },
    { label: 'Colaborador',   value: 'Collaborator' },
  ];

  countryOptions = [
    { label: 'ES +34',  value: '+34'  },
    { label: 'PT +351', value: '+351' },
    { label: 'FR +33',  value: '+33'  },
  ];

  ngOnInit() {
    if (this.editUser) {
      this.fullName = this.editUser.fullName;
      this.email    = this.editUser.email;
      this.role     = (this.editUser.role === 'Admin' ? 'Admin' : 'Collaborator');
      this.isActive = this.editUser.isActive;

      const rawPhone = this.editUser.phone ?? '';
      const matchedCountry = this.countryOptions.find(c => rawPhone.startsWith(c.value));
      this.phoneCountry = matchedCountry?.value ?? '+34';
      this.phoneNumber  = (matchedCountry ? rawPhone.slice(matchedCountry.value.length) : rawPhone).replace(/\D/g, '');
    }
  }

  onPhoneNumberInput(value: string) {
    const maxDigits = this.phoneCountry === '+34' ? 9 : 15;
    this.phoneNumber = value.replace(/\D/g, '').slice(0, maxDigits);
  }

  generatePassword() {
    this.password = generatePassword();
  }

  copied = signal(false);

  copyPassword() {
    if (!this.password) return;
    navigator.clipboard.writeText(this.password).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  submit() {
    this.submitted = true;
    this.apiError  = '';

    if (!this.fullName || !this.email || !this.role) return;
    if (!this.editUser && !this.password) return;

    this.saving.set(true);
    const phone = this.phoneNumber ? `${this.phoneCountry}${this.phoneNumber}` : '';

    const obs = this.editUser
      ? this.svc.update(this.editUser.id, {
          fullName: this.fullName,
          email:    this.email,
          phone,
          role:     this.role,
          isActive: this.isActive,
          ...(this.password ? { password: this.password } : {}),
        })
      : this.svc.create({
          fullName: this.fullName,
          email:    this.email,
          phone,
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
