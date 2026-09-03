import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-suminex-loader',
  standalone: true,
  templateUrl: './suminex-loader.html',
})
export class SuminexLoader {
  @Input() size = 20;
  /** Sobre fondos de color (p.ej. botones azules) el trazo azul se vuelve invisible — ponlo en blanco en ese caso */
  @Input() onColor = false;
}
