import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, InputTextModule, PasswordModule, ButtonModule, IconFieldModule, InputIconModule],
  template: `
    <div class="login-bg">

      <!-- Glow effects -->
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>

      <div class="login-card">

        <!-- Logo -->
        <div class="login-logo">
          <div class="logo-icon">
            <i class="pi pi-bolt"></i>
          </div>
          <h1 class="logo-text">SUMINE<span class="logo-x">X</span></h1>
          <p class="logo-sub">Portal de Administración</p>
        </div>

        <!-- Form -->
        <div class="login-form">
          <div class="field">
            <label>Correo electrónico</label>
            <p-iconfield>
              <p-inputicon class="pi pi-envelope" />
              <input pInputText [(ngModel)]="email" type="email"
                     placeholder="admin@suminex.es" class="w-full"
                     (keyup.enter)="login()" />
            </p-iconfield>
          </div>

          <div class="field">
            <label>Contraseña</label>
            <p-password [(ngModel)]="password" [feedback]="false" [toggleMask]="true"
                        class="w-full" inputStyleClass="w-full"
                        placeholder="••••••••"
                        (keyup.enter)="login()" />
          </div>

          @if (error) {
            <div class="error-msg">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error }}</span>
            </div>
          }

          <p-button label="Iniciar sesión" icon="pi pi-sign-in"
                    styleClass="w-full login-btn"
                    [loading]="loading" (onClick)="login()" />
        </div>

        <p class="login-footer">Acceso exclusivo para administradores</p>

      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh;
      background: var(--sx-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    /* Background glow blobs */
    .glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }
    .glow-1 {
      width: 500px; height: 500px;
      background: rgba(61,142,255,0.18);
      top: -150px; left: -150px;
    }
    .glow-2 {
      width: 400px; height: 400px;
      background: rgba(61,142,255,0.08);
      bottom: -100px; right: -100px;
    }

    /* Card */
    .login-card {
      position: relative;
      background: var(--sx-surface);
      border: 1px solid var(--sx-border-2);
      border-radius: 24px;
      padding: 2.75rem;
      width: 100%;
      max-width: 420px;
      box-shadow: var(--sx-shadow-lg), 0 0 0 1px var(--sx-border);
    }

    /* Top blue line */
    .login-card::before {
      content: '';
      position: absolute;
      top: 0; left: 10%; right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--sx-primary), transparent);
    }

    /* Logo */
    .login-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2.25rem;
      gap: 0.5rem;
    }
    .logo-icon {
      width: 56px; height: 56px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--sx-primary-btn), var(--sx-primary));
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 30px rgba(61,142,255,0.18);
      margin-bottom: 0.25rem;
    }
    .logo-icon .pi { font-size: 1.4rem; color: #fff; }
    .logo-text {
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: 4px;
      color: var(--sx-text);
      margin: 0;
    }
    .logo-x { color: var(--sx-primary); }
    .logo-sub {
      font-size: 0.78rem;
      color: var(--sx-text-2);
      font-weight: 500;
      letter-spacing: 0.05em;
    }

    /* Error */
    .error-msg {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--sx-red-bg);
      border: 1px solid rgba(248,113,113,0.25);
      color: var(--sx-red);
      font-size: 0.82rem;
      padding: 0.65rem 0.875rem;
      border-radius: 10px;
    }
    .error-msg .pi { font-size: 0.85rem; flex-shrink: 0; }

    /* Form */
    .login-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--sx-text-2);
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    :host ::ng-deep .login-btn {
      height: 44px;
      font-size: 0.9rem !important;
      letter-spacing: 0.02em;
    }

    .login-footer {
      text-align: center;
      font-size: 0.72rem;
      color: var(--sx-text-3);
      margin-top: 1.5rem;
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

  onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Enter') this.login();
  }

  login() {
    if (!this.email || !this.password) {
      this.error = 'Por favor, completa todos los campos.';
      return;
    }
    this.loading = true;
    this.error   = '';
    this.auth.login(this.email, this.password).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error = e?.error?.message ?? 'Credenciales incorrectas. Inténtalo de nuevo.'; this.loading = false; },
    });
  }
}
