import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { isValidPassword } from '../../../core/helpers/password.helpers';
import { BasikoLoader } from '../../../shared/components/basiko-loader/basiko-loader';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [FormsModule, RouterLink, BasikoLoader, Icon],
  templateUrl: './set-password.html',
  styleUrl: './set-password.css',
})
export class SetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth  = inject(AuthService);

  userId = '';
  token  = '';
  linkMissing = false;

  newPassword     = '';
  confirmPassword = '';
  showPwd1  = signal(false);
  showPwd2  = signal(false);
  submitted = false;
  loading   = signal(false);
  error     = signal('');
  success   = signal(false);

  readonly currentYear = new Date().getFullYear();

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    this.userId = qp.get('userId') ?? '';
    this.token  = qp.get('token') ?? '';
    this.linkMissing = !this.userId || !this.token;
  }

  get passwordError(): string | null {
    if (!this.submitted) return null;
    if (!this.newPassword) return 'Este campo es obligatorio';
    if (!isValidPassword(this.newPassword)) return 'Mínimo 8 caracteres, con mayúscula, minúscula y número';
    return null;
  }

  get confirmError(): string | null {
    if (!this.submitted) return null;
    if (!this.confirmPassword) return 'Este campo es obligatorio';
    if (this.confirmPassword !== this.newPassword) return 'Las contraseñas no coinciden';
    return null;
  }

  inputClasses(invalid: boolean): string {
    const base = 'sp-input w-full h-[46px] px-3.5 bg-white border rounded-lg text-[14.5px] text-sx-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-sx-text-3 focus:shadow-[0_0_0_3px_rgba(34,124,255,0.15)]';
    return invalid ? `${base} border-sx-red` : `${base} border-sx-border-2 focus:border-sx-primary`;
  }

  submit() {
    this.submitted = true;
    this.error.set('');
    if (this.passwordError || this.confirmError) return;

    this.loading.set(true);
    this.auth.setPassword(this.userId, this.token, this.newPassword, this.confirmPassword).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message ?? 'No se pudo actualizar la contraseña. Inténtalo de nuevo.');
      },
    });
  }
}
