import { Component, EventEmitter, Output } from '@angular/core';

export interface SupplyDocuments {
  idFront: File;
  idBack: File;
}

@Component({
  selector: 'app-documents-step',
  standalone: true,
  templateUrl: './documents-step.html',
})
export class DocumentsStep {
  @Output() submitted = new EventEmitter<SupplyDocuments>();

  documents: { idFront: File | null; idBack: File | null } = { idFront: null, idBack: null };
  documentsSubmitted = false;

  onFileSelect(event: Event, doc: keyof typeof this.documents) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.documents[doc] = input.files[0];
  }

  onDrop(event: DragEvent, doc: keyof typeof this.documents) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.documents[doc] = file;
  }

  uploadAreaClasses(done: unknown, error: boolean): string {
    const base = 'border-2 rounded-[14px] py-8 px-6 flex flex-col items-center text-center cursor-pointer transition-all hover:border-[#227CFF] hover:bg-[#EAF2FF]';
    if (done) return `${base} border-solid border-[#22C55E] bg-[#22C55E]/4`;
    if (error) return `${base} border-dashed border-[#EF4444] bg-[#FAFAFA]`;
    return `${base} border-dashed border-black/14 bg-[#FAFAFA]`;
  }

  uploadIconClasses(success: unknown): string {
    return success ? 'text-[1.75rem] text-[#22C55E] mb-2.5' : 'text-[1.75rem] text-[#94A3B8] mb-2.5';
  }

  submitDocuments() {
    this.documentsSubmitted = true;
    if (!this.documents.idFront || !this.documents.idBack) return;
    this.submitted.emit({ idFront: this.documents.idFront, idBack: this.documents.idBack });
  }
}
