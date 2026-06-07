import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-bg">
      <div class="login-card">

        <!-- Brand -->
        <div class="brand">
          <h1 class="brand-name">SUMINE<span class="brand-x">X</span></h1>
          <p class="brand-sub">Portal de Administración</p>
        </div>

        <!-- Form -->
        <form class="login-form" (submit)="$event.preventDefault(); login()">

          <div class="field" [class.invalid]="submitted && !email">
            <label>CORREO ELECTRÓNICO</label>
            <div class="input-wrap">
              <i class="pi pi-envelope input-icon"></i>
              <input type="email" [(ngModel)]="email" name="email"
                     placeholder="admin@suminex.es" autocomplete="email" />
            </div>
            @if (submitted && !email) {
              <span class="field-error">Este campo es obligatorio</span>
            }
          </div>

          <div class="field" [class.invalid]="submitted && !password">
            <label>CONTRASEÑA</label>
            <div class="input-wrap">
              <i class="pi pi-lock input-icon"></i>
              <input [type]="showPwd() ? 'text' : 'password'"
                     [(ngModel)]="password" name="password"
                     placeholder="••••••••" autocomplete="current-password" />
              <button class="pwd-toggle" type="button" (click)="showPwd.set(!showPwd())">
                <i [class]="'pi ' + (showPwd() ? 'pi-eye-slash' : 'pi-eye')"></i>
              </button>
            </div>
            @if (submitted && !password) {
              <span class="field-error">Este campo es obligatorio</span>
            }
          </div>

          @if (error) {
            <div class="login-error">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error }}</span>
            </div>
          }

          <button class="login-btn" type="submit" [disabled]="loading">
            @if (loading) {
              <i class="pi pi-spin pi-spinner"></i> Verificando...
            } @else {
              Iniciar sesión <i class="pi pi-arrow-right"></i>
            }
          </button>
        </form>

        <p class="login-footer">
          Acceso exclusivo para administradores y agentes autorizados
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh;
      background: linear-gradient(160deg, #E8EBF4 0%, #EEF0F6 50%, #E4E8F2 100%);
      display: flex; align-items: center; justify-content: center;
      font-family: Inter, system-ui, sans-serif;
    }
    .dark .login-bg { background: linear-gradient(160deg, #0D0F1A 0%, #111420 100%); }

    .login-card {
      background: var(--bg-surface, #fff);
      border: 1px solid var(--border-color, #D5D9E8);
      border-radius: var(--radius-xl, 16px);
      padding: 32px;
      width: 380px;
      box-shadow: var(--shadow-lg);
    }

    /* Brand */
    .brand { text-align: center; margin-bottom: 24px; }
    .brand-name {
      font-size: 26px; font-weight: 800; letter-spacing: 4px;
      color: var(--text-primary, #1C2033); margin: 0 0 4px;
    }
    .brand-x { color: var(--accent, #4F46E5); }
    .brand-sub { font-size: var(--font-xs, 11px); color: var(--text-muted, #9299B8); margin: 0; letter-spacing: 0.05em; }

    /* Form */
    .login-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label {
      font-size: var(--font-xs, 11px); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-secondary, #5A6180);
    }
    .input-wrap {
      position: relative; display: flex; align-items: center;
    }
    .input-icon {
      position: absolute; left: 12px; font-size: 13px;
      color: var(--text-muted, #9299B8); pointer-events: none;
    }
    .input-wrap input {
      width: 100%; padding: 10px 12px 10px 36px;
      background: var(--bg-input, #F5F6FA);
      border: 1.5px solid var(--border-color, #D5D9E8);
      border-radius: var(--radius-md, 8px);
      font-size: var(--font-base, 13px); color: var(--text-primary, #1C2033);
      outline: none; transition: border-color 150ms, box-shadow 150ms;
      font-family: inherit;
    }
    .input-wrap input::placeholder { color: var(--text-muted, #9299B8); }
    .input-wrap input:focus {
      border-color: var(--accent, #4F46E5);
      box-shadow: 0 0 0 3px var(--accent-light, #EEF2FF);
    }
    .field.invalid .input-wrap input { border-color: var(--danger, #DC2626); }
    .field-error { font-size: var(--font-xs, 11px); color: var(--danger, #DC2626); }

    .pwd-toggle {
      position: absolute; right: 10px;
      background: none; border: none; cursor: pointer;
      color: var(--text-muted, #9299B8); padding: 4px;
      display: flex; align-items: center;
    }
    .pwd-toggle:hover { color: var(--text-secondary, #5A6180); }
    .pwd-toggle .pi { font-size: 14px; }

    .login-error {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: var(--radius-md, 8px);
      background: var(--danger-bg, #FEF2F2); border: 1px solid var(--danger-border, #FECACA);
      color: var(--danger, #DC2626); font-size: var(--font-sm, 12px);
    }
    .login-error .pi { font-size: 13px; flex-shrink: 0; }

    .login-btn {
      width: 100%; padding: 11px 16px; margin-top: 4px;
      background: var(--accent, #4F46E5); color: #fff;
      border: none; border-radius: var(--radius-md, 8px);
      font-size: var(--font-md, 14px); font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background 150ms; font-family: inherit;
    }
    .login-btn:hover:not(:disabled) { background: var(--accent-hover, #4338CA); }
    .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .login-btn .pi { font-size: 13px; }

    .login-footer {
      text-align: center; margin-top: 20px; margin-bottom: 0;
      font-size: var(--font-xs, 11px); color: var(--text-muted, #9299B8);
      line-height: 1.5;
    }
  `]
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  email    = '';
  password = '';
  loading  = false;
  error    = '';
  submitted = false;
  showPwd = signal(false);

  login() {
    this.submitted = true;
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error   = '';
    this.auth.login(this.email, this.password).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error   = e?.error?.error ?? e?.error?.message ?? 'Credenciales incorrectas.';
        this.loading = false;
      },
    });
  }
}
