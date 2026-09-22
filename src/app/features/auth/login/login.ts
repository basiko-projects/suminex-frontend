import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SuminexLoader } from '../../../shared/components/suminex-loader/suminex-loader';
import { Icon } from '../../../shared/components/icon/icon';

interface Review {
  quote: string;
  name:  string;
  role:  string;
}

const REVIEW_INTERVAL_MS = 5000;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, SuminexLoader, Icon],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnDestroy {
  private auth   = inject(AuthService);
  private router = inject(Router);

  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');
  submitted = false;
  showPwd = signal(false);
  readonly currentYear = new Date().getFullYear();

  /** Placeholders de estructura — reemplazar por reseñas reales de clientes de Suminex cuando existan */
  reviews: Review[] = [
    { quote: 'Aquí va la reseña de un cliente sobre cómo Suminex simplificó la gestión de sus suministros.', name: 'Nombre del cliente', role: 'Cargo · Empresa' },
    { quote: 'Aquí va otra reseña destacando el tiempo que ahorró gracias a Suminex.', name: 'Nombre del cliente', role: 'Cargo · Empresa' },
    { quote: 'Aquí va una tercera reseña sobre lo fácil que es gestionar la facturación con Suminex.', name: 'Nombre del cliente', role: 'Cargo · Empresa' },
  ];
  currentReview = signal(0);
  private reviewTimer = setInterval(() => this.nextReview(), REVIEW_INTERVAL_MS);

  nextReview() {
    this.currentReview.update(i => (i + 1) % this.reviews.length);
  }

  selectReview(i: number) {
    this.currentReview.set(i);
    clearInterval(this.reviewTimer);
    this.reviewTimer = setInterval(() => this.nextReview(), REVIEW_INTERVAL_MS);
  }

  ngOnDestroy() {
    clearInterval(this.reviewTimer);
  }

  inputClasses(invalid: boolean): string {
    const base = 'login-input w-full h-[46px] px-3.5 bg-white border rounded-lg text-[14.5px] text-sx-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-sx-text-3 focus:shadow-[0_0_0_3px_rgba(34,124,255,0.15)]';
    return invalid ? `${base} border-sx-red` : `${base} border-sx-border-2 focus:border-sx-primary`;
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
