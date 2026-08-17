import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SuminexLoaderComponent } from '../../../shared/components/suminex-loader';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, SuminexLoaderComponent],
  template: `
    <div class="login-bg">
      <div class="login-card">

        <!-- Brand -->
        <div class="brand">
          <img src="/logo_suminex.svg" alt="Suminex" class="brand-logo" />
          <h1 class="brand-title">Iniciar sesión</h1>
        </div>

        <!-- Form -->
        <form class="login-form" (submit)="$event.preventDefault(); login()">

          <div class="field" [class.invalid]="submitted && !email">
            <div class="input-wrap">
              <i class="pi pi-envelope input-icon"></i>
              <input type="email" [(ngModel)]="email" name="email"
                     placeholder="Correo" autocomplete="email" />
            </div>
            @if (submitted && !email) {
              <span class="field-error">Este campo es obligatorio</span>
            }
          </div>

          <div class="field" [class.invalid]="submitted && !password">
            <div class="input-wrap">
              <i class="pi pi-lock input-icon"></i>
              <input [type]="showPwd() ? 'text' : 'password'"
                     [(ngModel)]="password" name="password"
                     placeholder="Contraseña" autocomplete="current-password" />
              <button class="pwd-toggle" type="button" (click)="showPwd.set(!showPwd())">
                <i [class]="'pi ' + (showPwd() ? 'pi-eye-slash' : 'pi-eye')"></i>
              </button>
            </div>
            @if (submitted && !password) {
              <span class="field-error">Este campo es obligatorio</span>
            }
          </div>

          @if (error()) {
            <div class="login-error">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error() }}</span>
            </div>
          }

          <button class="login-btn" type="submit" [disabled]="loading()">
            @if (loading()) {
              <app-suminex-loader [size]="16" /> Verificando...
            } @else {
              Iniciar sesión
            }
          </button>
        </form>

        <p class="login-footer">
          ¿Necesitas acceso?
          <a href="mailto:soporte@suminex.es" class="footer-link">Contacta con soporte</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh;
      background: linear-gradient(180deg, #227CFF 0%, #1255CC 30%, #071230 65%, #030810 100%);
      display: flex; align-items: center; justify-content: center;
      font-family: 'DM Sans', system-ui, sans-serif;
      padding: 1.5rem;
    }

    .login-card {
      background: #161616;
      border-radius: 20px;
      padding: 44px 36px 36px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.55);
    }

    /* Brand */
    .brand { margin-bottom: 36px; text-align: center; }
    .brand-logo {
      height: 30px; width: auto;
      display: block; margin: 0 auto 16px;
    }
    .brand-title {
      font-size: 28px; font-weight: 700;
      color: #FFFFFF; margin: 0;
      letter-spacing: -0.02em; line-height: 1.2;
    }

    /* Form */
    .login-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .input-wrap {
      position: relative; display: flex; align-items: center;
    }
    .input-icon {
      position: absolute; left: 14px; font-size: 14px;
      color: rgba(255,255,255,0.30); pointer-events: none;
    }
    .input-wrap input {
      width: 100%; padding: 10px 14px 10px 40px;
      background: #252525;
      border: 1.5px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      font-size: 14px; color: #FFFFFF;
      outline: none; transition: border-color 150ms, box-shadow 150ms;
      font-family: inherit;
      box-sizing: border-box;
    }
    .input-wrap input::placeholder { color: rgba(255,255,255,0.30); }
    .input-wrap input:focus {
      border-color: #227CFF;
      box-shadow: 0 0 0 3px rgba(34,124,255,0.20);
    }
    .input-wrap input:-webkit-autofill,
    .input-wrap input:-webkit-autofill:hover,
    .input-wrap input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px #252525 inset !important;
      -webkit-text-fill-color: #FFFFFF !important;
      caret-color: #FFFFFF;
      transition: background-color 5000s ease-in-out 0s;
    }
    .field.invalid .input-wrap input { border-color: #EF4444; }
    .field-error { font-size: 11px; color: #F87171; padding-left: 2px; }

    .pwd-toggle {
      position: absolute; right: 12px;
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.30); padding: 4px;
      display: flex; align-items: center;
    }
    .pwd-toggle:hover { color: rgba(255,255,255,0.65); }
    .pwd-toggle .pi { font-size: 15px; }

    .login-error {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 8px;
      background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35);
      color: #F87171; font-size: 12px;
    }
    .login-error .pi { font-size: 13px; flex-shrink: 0; }

    .login-btn {
      width: 100%; padding: 13px 16px; margin-top: 8px;
      background: #227CFF; color: #fff;
      border: 1.5px solid #227CFF;
      border-radius: 10px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 150ms; font-family: inherit;
    }
    .login-btn:hover:not(:disabled) {
      background: #1A6FE8;
      border-color: #1A6FE8;
    }
    .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .login-btn .pi { font-size: 13px; }

    .login-footer {
      text-align: center; margin-top: 28px; margin-bottom: 0;
      font-size: 12px; color: rgba(255,255,255,0.35);
      line-height: 1.5;
    }
    .footer-link {
      color: #227CFF; text-decoration: none; font-weight: 500;
    }
    .footer-link:hover { text-decoration: underline; }
  `]
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
