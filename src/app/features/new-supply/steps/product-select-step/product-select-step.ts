import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { ServiceTariffProduct } from '../../../../core/models/service.model';
import { BasikoLoader } from '../../../../shared/components/basiko-loader/basiko-loader';
import { Icon } from '../../../../shared/components/icon/icon';

export type EligibleProduct = ServiceTariffProduct & { tariffName: string };

@Component({
  selector: 'app-product-select-step',
  standalone: true,
  imports: [BasikoLoader, Icon],
  templateUrl: './product-select-step.html',
})
export class ProductSelectStep implements OnChanges {
  @Input() products: EligibleProduct[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() select = new EventEmitter<number>();

  /** Filtro por tarifa (ej. 2.0TD/3.0TD/6.1TD) — solo tiene sentido en alta manual, cuando hay más de una
   *  tarifa entre los productos elegibles. En automática el OCR ya deja una sola tarifa, así que no aparece. */
  selectedTariff = signal<string | null>(null);

  /** Selección pendiente dentro de las cards — se confirma con el botón "Continuar", no al primer click. */
  pendingProductId = signal<number | null>(null);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['products']) {
      this.selectedTariff.set(null);
      this.pendingProductId.set(null);
    }
  }

  get tariffOptions(): string[] {
    return Array.from(new Set(this.products.map(p => p.tariffName)));
  }

  get filteredProducts(): EligibleProduct[] {
    const tariff = this.selectedTariff();
    return tariff ? this.products.filter(p => p.tariffName === tariff) : this.products;
  }

  cardClasses(selected: boolean): string {
    const base = 'text-left flex flex-col gap-3 p-5 rounded-lg border-[1.5px] bg-white cursor-pointer transition-all';
    return selected
      ? `${base} border-[#227CFF] shadow-[0_0_0_3px_rgba(34,124,255,0.10)]`
      : `${base} border-black/10 hover:border-[#227CFF] hover:shadow-[0_0_0_3px_rgba(34,124,255,0.10)] hover:-translate-y-0.5`;
  }

  confirm() {
    const id = this.pendingProductId();
    if (id === null) return;
    this.select.emit(id);
  }
}
