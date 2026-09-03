import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-result-step',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './result-step.html',
})
export class ResultStep {
  @Input() status: 'idle' | 'success' | 'error' = 'success';
  @Input() submitError = '';
  /** Alta OK pero identidad no verificada (register-with-identity con verificationSuccess: false) — se muestra como aviso, no como error */
  @Input() verificationWarning: string | null = null;
  @Output() retry = new EventEmitter<void>();

  resultTitleClasses(isError: boolean): string {
    const base = 'text-2xl font-bold m-0 mb-3 -tracking-[0.02em] leading-[1.3]';
    return isError ? `${base} text-[#DC2626]` : `${base} text-[#0F172A]`;
  }
}
