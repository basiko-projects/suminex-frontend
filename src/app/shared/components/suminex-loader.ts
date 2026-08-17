import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-suminex-loader',
  standalone: true,
  template: `
    <img src="/suminex-loader-draw.svg" alt="Cargando"
         [style.width.px]="size" class="suminex-loader" />
  `,
  styles: [`
    .suminex-loader { display: inline-block; vertical-align: middle; height: auto; }
  `],
})
export class SuminexLoaderComponent {
  @Input() size = 20;
}
