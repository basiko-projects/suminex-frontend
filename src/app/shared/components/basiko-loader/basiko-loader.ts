import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-basiko-loader',
  standalone: true,
  templateUrl: './basiko-loader.html',
})
export class BasikoLoader {
  @Input() size = 20;
  /** Sobre fondos de color (p.ej. botones azules) el trazo azul se vuelve invisible — ponlo en blanco en ese caso */
  @Input() onColor = false;
}
