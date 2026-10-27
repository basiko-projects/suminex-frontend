import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'stats', loadComponent: () => import('./features/stats/stats').then(m => m.StatsComponent), canActivate: [adminGuard] },
      {
        path: 'services',
        loadComponent: () => import('./features/services/services-shell/services-shell').then(m => m.ServicesShellComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'services/tarifas/:id',
        loadComponent: () => import('./features/services/tarifa-detail/tarifa-detail').then(m => m.TarifaDetailComponent),
        canActivate: [adminGuard],
      },
      { path: 'comparison-history', loadComponent: () => import('./features/comparison-history/comparison-history').then(m => m.ComparisonHistoryComponent) },
      { path: 'supplies', loadComponent: () => import('./features/supplies/supplies').then(m => m.SuppliesComponent) },
      { path: 'new-supply', loadComponent: () => import('./features/new-supply/new-supply').then(m => m.NewSupplyComponent) },
      { path: 'comparator', loadComponent: () => import('./features/comparator/comparator').then(m => m.ComparatorComponent) },
      { path: 'users',    loadComponent: () => import('./features/users/users/users').then(m => m.UsersComponent), canActivate: [adminGuard] },
      { path: 'providers', loadComponent: () => import('./features/providers/providers').then(m => m.ProvidersComponent), canActivate: [adminGuard] },
      { path: 'billing',  loadComponent: () => import('./features/billing/billing').then(m => m.BillingComponent) },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
