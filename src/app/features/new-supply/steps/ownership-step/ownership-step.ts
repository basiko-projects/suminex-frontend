import { Component, EventEmitter, Output } from '@angular/core';
import { OwnershipChange } from '../../new-supply.types';

@Component({
  selector: 'app-ownership-step',
  standalone: true,
  templateUrl: './ownership-step.html',
})
export class OwnershipStep {
  @Output() select = new EventEmitter<OwnershipChange>();
}
