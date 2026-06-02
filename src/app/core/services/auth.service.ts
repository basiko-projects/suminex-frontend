import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

interface LoginPayload {
  accessToken?:      string; // current field name
  token?:            string; // future field name
  refreshToken:      string;
  accessTokenExpiry: string;
  userId:            string;
  fullName:          string;
  role:              string;
}

// API may return payload directly OR wrapped in { data: { ... } }
type LoginResponse = LoginPayload | { data: LoginPayload };

const COOKIE_OPTS = `path=/; SameSite=Strict; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
const REFRESH_TTL_DAYS = 30;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY   = 'suminex_token';
  private readonly REFRESH_KEY = 'suminex_refresh';
  private readonly USER_KEY    = 'suminex_user';
  private readonly USERID_KEY  = 'suminex_userid';

  isLoggedIn  = signal(!!this.getCookie(this.TOKEN_KEY));
  currentUser = signal<{ email: string; name: string } | null>(this.getStoredUser());
  userId      = signal<string | null>(this.getCookie(this.USERID_KEY));

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password, clientType: 'web' })
      .pipe(
        tap((raw) => {
          console.debug('[Auth] login raw response:', raw);
          // Unwrap optional data envelope
          const res: LoginPayload = ('data' in raw && raw.data) ? raw.data : raw as LoginPayload;
          console.debug('[Auth] login parsed payload:', res);

          const jwt = res.accessToken ?? res.token;
          if (!jwt) {
            console.error('[Auth] No token found in login response');
            return;
          }

          const expiry = res.accessTokenExpiry
            ? new Date(res.accessTokenExpiry)
            : new Date(Date.now() + 12 * 60 * 60 * 1000); // fallback 12h

          this.setCookieUntil(this.TOKEN_KEY, jwt, expiry);
          this.setCookieUntil(this.USER_KEY, JSON.stringify({ email, name: res.fullName }), expiry);
          if (res.userId) {
            this.setCookieUntil(this.USERID_KEY, res.userId, expiry);
            this.userId.set(res.userId);
          }

          if (res.refreshToken) {
            const refreshExpiry = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
            this.setCookieUntil(this.REFRESH_KEY, res.refreshToken, refreshExpiry);
          }

          this.isLoggedIn.set(true);
          this.currentUser.set({ email, name: res.fullName });
        })
      );
  }

  logout() {
    this.deleteCookie(this.TOKEN_KEY);
    this.deleteCookie(this.REFRESH_KEY);
    this.deleteCookie(this.USER_KEY);
    this.deleteCookie(this.USERID_KEY);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.userId.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    const t = this.getCookie(this.TOKEN_KEY);
    return t && t !== 'undefined' && t !== 'null' ? t : null;
  }

  getUserId(): string | null {
    // Prefer stored signal; fall back to decoding the JWT sub claim
    if (this.userId()) return this.userId();
    try {
      const token = this.getToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.sub ?? payload.userId ?? payload.nameid ?? null;
      if (id) this.userId.set(id);
      return id;
    } catch { return null; }
  }

  getRefreshToken(): string | null {
    const t = this.getCookie(this.REFRESH_KEY);
    return t && t !== 'undefined' && t !== 'null' ? t : null;
  }

  private getStoredUser(): { email: string; name: string } | null {
    const raw = this.getCookie(this.USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  private setCookieUntil(name: string, value: string, expiry: Date): void {
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiry.toUTCString()}; ${COOKIE_OPTS}`;
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${COOKIE_OPTS}`;
  }
}
