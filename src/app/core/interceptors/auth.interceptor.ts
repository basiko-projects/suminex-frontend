import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    console.debug('[authInterceptor] Adding Authorization header, token prefix:', token.substring(0, 20));
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  } else {
    console.warn('[authInterceptor] No token found for request:', req.url);
  }
  return next(req);
};
