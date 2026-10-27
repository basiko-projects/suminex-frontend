import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Bloquea las rutas de administrador (Servicios, Proveedores, Estadísticas, Usuarios) para
 *  Client/Collaborator — antes solo se ocultaban del sidebar, pero escribiendo la URL se accedía igual. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/dashboard']);
};
