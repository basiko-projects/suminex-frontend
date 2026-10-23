import { Component, EventEmitter, Input, Output } from '@angular/core';
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
export class ProductSelectStep {
  @Input() products: EligibleProduct[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() select = new EventEmitter<number>();
}
