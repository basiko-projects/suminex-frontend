import { Injectable, signal } from '@angular/core';

export interface FiscalProfileDialogTarget {
  userId: string;
  userName: string;
}

/** Estado global del diálogo "Mis datos fiscales" — se abre desde el avatar (propio) o desde Usuarios (Admin, para un colaborador) */
@Injectable({ providedIn: 'root' })
export class FiscalProfileDialogService {
  visible = signal(false);
  /** null = el usuario está editando sus propios datos; con valor = Admin editando los de otro usuario */
  target = signal<FiscalProfileDialogTarget | null>(null);
  /** Se incrementa cada vez que se guarda el perfil, para que otras pantallas puedan reaccionar */
  savedAt = signal(0);

  open(target?: FiscalProfileDialogTarget) {
    this.target.set(target ?? null);
    this.visible.set(true);
  }

  close() {
    this.visible.set(false);
    this.target.set(null);
  }

  markSaved() { this.savedAt.update(v => v + 1); }
}
