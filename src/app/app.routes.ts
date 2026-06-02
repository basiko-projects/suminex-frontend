import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'services', loadComponent: () => import('./features/services/services-list').then(m => m.ServicesListComponent) },
      { path: 'comparison-history', loadComponent: () => import('./features/comparison-history/comparison-history').then(m => m.ComparisonHistoryComponent) },
      { path: 'supplies', loadComponent: () => import('./features/supplies/supplies').then(m => m.SuppliesComponent) },
      { path: 'users',    loadComponent: () => import('./features/users/users').then(m => m.UsersComponent) },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
