import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SupplyKind, SupplyOption } from '../../../core/models/supply.model';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-supply-type-step',
  standalone: true,
  imports: [Icon],
  templateUrl: './supply-type-step.html',
  styleUrl: './supply-type-step.css',
})
export class SupplyTypeStep {
  @Input() options: SupplyOption[] = [];
  @Output() select = new EventEmitter<SupplyKind>();

  supplyCardClasses(available: boolean): string {
    const base = 'bg-white border-[1.5px] rounded-lg pt-6 px-5 pb-5 text-left cursor-pointer transition-all flex flex-col';
    return available
      ? `${base} border-black/10 enabled:hover:border-[#227CFF] enabled:hover:shadow-[0_0_0_3px_rgba(34,124,255,0.10)] enabled:hover:-translate-y-px`
      : `${base} border-black/10 bg-[#F8FAFC] cursor-not-allowed`;
  }

  iconCircleClasses(available: boolean): string {
    const base = 'w-11 h-11 rounded-full flex items-center justify-center mb-3';
    return available ? `${base} bg-[#227CFF]/8` : `${base} bg-[#F1F5F9]`;
  }

  iconCircleIconClasses(available: boolean): string {
    return available ? 'w-4.5 h-4.5 text-[#227CFF]' : 'w-4.5 h-4.5 text-[#CBD5E1]';
  }

  dividerClasses(available: boolean): string {
    const base = 'w-9 h-0.5 rounded-sm';
    return available ? `${base} bg-[#227CFF]` : `${base} bg-[#E2E8F0]`;
  }

  supplyLabelClasses(available: boolean): string {
    const base = 'text-base font-bold mb-1.5';
    return available ? `${base} text-[#0F172A]` : `${base} text-[#94A3B8]`;
  }
}
