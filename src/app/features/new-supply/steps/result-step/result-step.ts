import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-result-step',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './result-step.html',
})
export class ResultStep {
  @Input() status: 'idle' | 'success' | 'error' = 'success';
  @Input() submitError = '';
  /** Alta OK pero identidad no verificada (register-with-identity con verificationSuccess: false) — se muestra como aviso, no como error */
  @Input() verificationWarning: string | null = null;
  /** Nombre del campo detectado a partir del mensaje de error del backend — si viene, se ofrece "Corregir" en vez de solo reintentar */
  @Input() correctFieldLabel: string | null = null;
  @Output() retry = new EventEmitter<void>();
  @Output() correct = new EventEmitter<void>();

  resultTitleClasses(isError: boolean): string {
    const base = 'text-2xl font-bold m-0 mb-3 -tracking-[0.02em] leading-[1.3]';
    return isError ? `${base} text-[#DC2626]` : `${base} text-[#0F172A]`;
  }
}
