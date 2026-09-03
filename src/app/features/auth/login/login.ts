import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SuminexLoader } from '../../../shared/components/suminex-loader/suminex-loader';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, SuminexLoader],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');
  submitted = false;
  showPwd = signal(false);

  inputClasses(invalid: boolean): string {
    const base = 'login-input w-full py-2.5 pr-3.5 pl-10 bg-[#252525] border-[1.5px] rounded-[10px] text-sm text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-white/30 focus:shadow-[0_0_0_3px_rgba(34,124,255,0.20)]';
    return invalid ? `${base} border-[#EF4444]` : `${base} border-white/12 focus:border-[#227CFF]`;
  }

  login() {
    this.submitted = true;
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(e?.error?.error ?? e?.error?.message ?? 'Credenciales incorrectas.');
        this.loading.set(false);
      },
    });
  }
}
