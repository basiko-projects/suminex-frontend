import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComparisonsService } from '../../core/services/comparisons.service';
import { ServicesService } from '../../core/services/services.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ServiceType, ServiceTariff, ServiceGroup } from '../../core/models/service.model';
import { LuzOcrResult, OcrInvoiceResult } from '../../core/models/comparison.model';
import { CategoryCode, CreateSupplyBody } from '../../core/models/supply.model';
import { computeSupplyComparison, SupplyComparisonResult } from './supply-comparison';
import { ConfigurarProductoComponent } from './configurar-producto';
import { ComparatorResult } from './comparator.models';
import { SuminexLoaderComponent } from '../../shared/components/suminex-loader';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type SupplyKind = 'electricity' | 'gas' | 'internet' | null;
type OwnershipChange = 'with-change' | 'without-change' | null;
type OcrStatus = 'idle' | 'uploading' | 'error' | 'done';

interface SupplyOption {
  id: SupplyKind;
  label: string;
  description: string;
  icon: string;
  available: boolean;
}

@Component({
  selector: 'app-new-supply',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, ConfigurarProductoComponent, SuminexLoaderComponent],
  template: `
    <div class="page">

      @if (status() === 'idle') {

      @if (step() > 1) {
        <button class="back-btn" (click)="goBack()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
      }

      <!-- ─── STEP 1: Supply type ─── -->
      @if (step() === 1) {
        <div class="page-header">
          <h1 class="page-title">¿Que tipo de suministro quieres dar de alta?</h1>
          <p class="page-subtitle">Elige el tipo de suministro que quieres dar de alta</p>
        </div>

        <div class="supply-grid">
          @for (option of supplyOptions; track option.id) {
            <button
              class="supply-card"
              [class.supply-card--disabled]="!option.available"
              [disabled]="!option.available"
              (click)="option.available ? selectSupply(option.id) : null">
              <div class="supply-icon-wrap">
                <div class="supply-icon-circle" [class.supply-icon-circle--inactive]="!option.available">
                  <i [class]="'pi ' + option.icon"></i>
                </div>
                <div class="supply-divider" [class.supply-divider--inactive]="!option.available"></div>
              </div>
              <p class="supply-label" [class.supply-label--inactive]="!option.available">
                {{ option.available ? option.label : 'Próximamente' }}
              </p>
              <p class="supply-description">{{ option.description }}</p>
            </button>
          }
        </div>
      }

      <!-- ─── STEP 2: Invoice upload + comparator ─── -->
      @if (step() === 2) {
        <div class="page-header">
          <h1 class="page-title">Sube tu última factura</h1>
          <p class="page-subtitle">La analizamos y te mostramos cuánto pagarías con Suminex</p>
        </div>

        @if (ocrStatus() === 'idle') {
          <div class="upload-area"
               (click)="invoiceCompareInput.click()"
               (dragover)="$event.preventDefault()"
               (drop)="onInvoiceDrop($event)">
            <input #invoiceCompareInput type="file" accept="image/*,.pdf" hidden
                   (change)="onInvoiceInputChange($event)" />
            <i class="pi pi-file-pdf upload-icon"></i>
            <p class="upload-label">Última factura</p>
            <p class="upload-hint">Arrastra el archivo aquí o haz clic para seleccionar</p>
            <span class="upload-formats">JPG, PNG o PDF · Máx. 10MB</span>
          </div>
        }

        @if (ocrStatus() === 'uploading') {
          <div class="compare-loading">
            <app-suminex-loader [size]="28" />
            <span>Leyendo tu factura y calculando tu comparativa...</span>
          </div>
        }

        @if (ocrStatus() === 'error') {
          <div class="compare-error">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ ocrErrorMsg() }}</span>
          </div>
          <button class="btn-next" (click)="retryInvoice()">Intentar de nuevo</button>
        }

        @if (ocrStatus() === 'done' && !matchedTariffDetail()) {
          <div class="compare-grid">
            <div class="compare-card">
              <span class="compare-card-label">Tu consumo actual</span>
              <span class="compare-card-provider">{{ comparison()?.currentProviderName ?? 'Tu compañía actual' }}</span>
              <span class="compare-card-price">{{ comparison()?.currentTotal ?? 0 | number:'1.2-2' }} €</span>
            </div>
            <div class="compare-card compare-card--suminex">
              <span class="compare-card-label">Con Suminex</span>
              @if (comparison(); as c) {
                <span class="compare-card-provider">{{ c.bestTariffName }}</span>
                <span class="compare-card-price">{{ c.estimatedTotal | number:'1.2-2' }} €</span>
              } @else {
                <span class="compare-card-provider">Sin tarifa comparable disponible</span>
              }
            </div>
          </div>

          @if (comparison(); as c) {
            <div class="compare-savings" [class.compare-savings--negative]="c.savingsAmount < 0">
              @if (c.savingsAmount >= 0) {
                <i class="pi pi-arrow-down"></i>
                Ahorras {{ c.savingsAmount | number:'1.2-2' }} € al mes ({{ c.savingsPercent | number:'1.0-1' }}%)
              } @else {
                <i class="pi pi-arrow-up"></i>
                Pagarías {{ -c.savingsAmount | number:'1.2-2' }} € más al mes con Suminex
              }
            </div>
          }

          <button class="btn-next" (click)="continueAfterComparison()">Continuar</button>
          <button class="btn-secondary compare-change-btn" (click)="retryInvoice()">Cambiar factura</button>
        }

        @if (showConfigurarProducto() && matchedTariffDetail() && luzOcrData()) {
          <app-configurar-producto
            [tariff]="matchedTariffDetail()!"
            [ocr]="luzOcrData()!"
            (closed)="closeConfigurarProducto()"
            (continued)="onConfiguratorContinued($event)"
          />
        }
      }

      <!-- ─── STEP 3: Ownership change ─── -->
      @if (step() === 3) {
        <div class="page-header">
          <h1 class="page-title">¿Con o sin cambio de titularidad?</h1>
          <p class="page-subtitle">Selecciona cómo deseas realizar el alta del suministro</p>
        </div>

        <div class="ownership-grid">

          <button class="ownership-card" (click)="selectOwnership('with-change')">
            <div class="ownership-illustration">
              <img src="/ownership-image.svg" alt="Cambio de titularidad" draggable="false" />
            </div>
            <span class="ownership-label">Cambio de titularidad</span>
          </button>

          <button class="ownership-card" (click)="selectOwnership('without-change')">
            <div class="ownership-illustration">
              <img src="/ownership-image.svg" alt="Sin cambio de titular" draggable="false" />
            </div>
            <span class="ownership-label">Sin cambio de titular</span>
          </button>

        </div>
      }

      <!-- ─── STEP 4: Holder data ─── -->
      @if (step() === 4) {
        <div class="page-header">
          <h1 class="page-title">Datos del nuevo titular</h1>
          <p class="page-subtitle">Bienvenido a Suminex</p>
        </div>

        <form class="step-form" (submit)="$event.preventDefault(); submitHolderData()">
          <div class="form-field" [class.invalid]="fullNameError">
            <label class="form-label">Nombre del titular *</label>
            <input type="text" class="form-input" [(ngModel)]="holderData.fullName"
                   name="fullName" placeholder="Javier Vayá Sifre" />
            @if (fullNameError) { <span class="field-error">{{ fullNameError }}</span> }
          </div>
          <div class="form-field" [class.invalid]="dniError">
            <label class="form-label">DNI del titular *</label>
            <input type="text" class="form-input" [(ngModel)]="holderData.nationalId"
                   name="nationalId" placeholder="12345678A" />
            @if (dniError) { <span class="field-error">{{ dniError }}</span> }
          </div>
          <div class="form-field" [class.invalid]="phoneError">
            <label class="form-label">Teléfono de contacto *</label>
            <div class="phone-row">
              <select class="form-input phone-country" [(ngModel)]="holderData.phoneCountry" name="phoneCountry">
                @for (c of countryOptions; track c.dial) {
                  <option [value]="c.dial">{{ c.name }} ({{ c.dial }})</option>
                }
              </select>
              <input type="tel" class="form-input phone-number" [(ngModel)]="holderData.phoneNumber"
                     name="phoneNumber" placeholder="600 000 000" />
            </div>
            @if (phoneError) { <span class="field-error">{{ phoneError }}</span> }
          </div>
          <div class="form-field" [class.invalid]="emailError">
            <label class="form-label">Correo electrónico *</label>
            <input type="email" class="form-input" [(ngModel)]="holderData.email"
                   name="email" placeholder="titular@ejemplo.es" />
            @if (emailError) { <span class="field-error">{{ emailError }}</span> }
          </div>
          <button type="submit" class="btn-next">Siguiente</button>
        </form>
      }

      <!-- ─── STEP 5: Supply point data ─── -->
      @if (step() === 5) {
        <div class="page-header">
          <h1 class="page-title">Datos del punto de suministro</h1>
          <p class="page-subtitle">Bienvenido a Suminex</p>
        </div>

        <form class="step-form" (submit)="$event.preventDefault(); submitSupplyPoint()">
          <div class="form-field" [class.invalid]="streetAddressError">
            <label class="form-label">Dirección del punto de suministro *</label>
            <input type="text" class="form-input" [(ngModel)]="supplyPointData.streetAddress"
                   name="streetAddress" placeholder="Calle" />
            @if (streetAddressError) { <span class="field-error">{{ streetAddressError }}</span> }
          </div>
          <div class="form-row">
            <div class="form-field">
              <input type="text" class="form-input" [(ngModel)]="supplyPointData.floor"
                     name="floor" placeholder="Piso" />
            </div>
            <div class="form-field">
              <input type="text" class="form-input" [(ngModel)]="supplyPointData.door"
                     name="door" placeholder="Puerta" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-field" [class.invalid]="postalCodeError">
              <input type="text" class="form-input" [(ngModel)]="supplyPointData.postalCode"
                     name="postalCode" placeholder="Código Postal" maxlength="5" />
              @if (postalCodeError) { <span class="field-error">{{ postalCodeError }}</span> }
            </div>
            <div class="form-field" [class.invalid]="provinceError">
              <input type="text" class="form-input" [(ngModel)]="supplyPointData.province"
                     name="province" placeholder="Provincia" />
              @if (provinceError) { <span class="field-error">{{ provinceError }}</span> }
            </div>
          </div>
          <div class="form-field" [class.invalid]="cityError">
            <input type="text" class="form-input" [(ngModel)]="supplyPointData.city"
                   name="city" placeholder="Localidad" />
            @if (cityError) { <span class="field-error">{{ cityError }}</span> }
          </div>
          @if (selectedSupply() === 'electricity' || selectedSupply() === 'gas') {
            <div class="form-field" [class.invalid]="cupsError">
              <label class="form-label">CUPS *</label>
              <input type="text" class="form-input" [(ngModel)]="supplyPointData.cups"
                     name="cups" placeholder="ES0021309584339948938JN0F" />
              @if (cupsError) { <span class="field-error">{{ cupsError }}</span> }
            </div>
          } @else {
            <div class="form-field" [class.invalid]="phoneToPortError">
              <label class="form-label">Teléfono a portar *</label>
              <input type="tel" class="form-input" [(ngModel)]="supplyPointData.phoneToPort"
                     name="phoneToPort" placeholder="600 000 000" />
              @if (phoneToPortError) { <span class="field-error">{{ phoneToPortError }}</span> }
            </div>
          }
          <div class="form-field" [class.invalid]="bankAccountError">
            <label class="form-label">Cuenta bancaria (IBAN) *</label>
            <input type="text" class="form-input" [(ngModel)]="supplyPointData.bankAccount"
                   name="bankAccount" placeholder="ES35 3454 6753 2435 4434" />
            @if (bankAccountError) { <span class="field-error">{{ bankAccountError }}</span> }
          </div>
          <button type="submit" class="btn-next">Siguiente</button>
        </form>
      }

      <!-- ─── STEP 6: Documents ─── -->
      @if (step() === 6) {
        <div class="page-header">
          <h1 class="page-title">Documentación necesaria</h1>
          <p class="page-subtitle">Adjunta los documentos requeridos para completar el alta</p>
        </div>

        <div class="step-form">

          <div class="upload-field">
            <div class="upload-area" [class.upload-area--done]="documents.idFront"
                 [class.upload-area--error]="documentsSubmitted && !documents.idFront"
                 (click)="idFrontInput.click()"
                 (dragover)="$event.preventDefault()"
                 (drop)="onDrop($event, 'idFront')">
              <input #idFrontInput type="file" accept="image/*,.pdf" hidden
                     (change)="onFileSelect($event, 'idFront')" />
              @if (documents.idFront) {
                <i class="pi pi-check-circle upload-icon upload-icon--success"></i>
                <p class="upload-filename">{{ documents.idFront.name }}</p>
                <p class="upload-hint">Haz clic para cambiar</p>
              } @else {
                <i class="pi pi-id-card upload-icon"></i>
                <p class="upload-label">DNI Anverso *</p>
                <p class="upload-hint">Arrastra el archivo aquí o haz clic para seleccionar</p>
                <span class="upload-formats">JPG, PNG o PDF · Máx. 10MB</span>
              }
            </div>
            @if (documentsSubmitted && !documents.idFront) { <span class="field-error">Este documento es obligatorio</span> }
          </div>

          <div class="upload-field">
            <div class="upload-area" [class.upload-area--done]="documents.idBack"
                 [class.upload-area--error]="documentsSubmitted && !documents.idBack"
                 (click)="idBackInput.click()"
                 (dragover)="$event.preventDefault()"
                 (drop)="onDrop($event, 'idBack')">
              <input #idBackInput type="file" accept="image/*,.pdf" hidden
                     (change)="onFileSelect($event, 'idBack')" />
              @if (documents.idBack) {
                <i class="pi pi-check-circle upload-icon upload-icon--success"></i>
                <p class="upload-filename">{{ documents.idBack.name }}</p>
                <p class="upload-hint">Haz clic para cambiar</p>
              } @else {
                <i class="pi pi-id-card upload-icon"></i>
                <p class="upload-label">DNI Reverso *</p>
                <p class="upload-hint">Arrastra el archivo aquí o haz clic para seleccionar</p>
                <span class="upload-formats">JPG, PNG o PDF · Máx. 10MB</span>
              }
            </div>
            @if (documentsSubmitted && !documents.idBack) { <span class="field-error">Este documento es obligatorio</span> }
          </div>

          @if (uploadedInvoiceName()) {
            <div class="upload-field">
              <div class="upload-area upload-area--done">
                <i class="pi pi-check-circle upload-icon upload-icon--success"></i>
                <p class="upload-filename">{{ uploadedInvoiceName() }}</p>
                <p class="upload-hint">Última factura (ya subida en el paso de comparación)</p>
              </div>
            </div>
          }

          <button class="btn-next" (click)="submitDocuments()">Finalizar alta</button>
        </div>
      }

      } <!-- end @if (status() === 'idle') -->

      <!-- ─── RESULT SCREEN ─── -->
      @if (status() !== 'idle') {
        <div class="result-wrap">

          <!-- Animated SVG icon -->
          @if (status() === 'success') {
            <div class="icon-wrap">
              <svg class="result-svg" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" fill="rgba(34,197,94,0.12)"/>
                <circle cx="40" cy="40" r="36" stroke="#22C55E" stroke-width="2.5"
                        stroke-dasharray="226" stroke-dashoffset="226"
                        class="anim-circle"/>
                <polyline points="22,41 34,53 58,27" stroke="#16A34A" stroke-width="5"
                          stroke-linecap="round" stroke-linejoin="round" fill="none"
                          stroke-dasharray="62" stroke-dashoffset="62"
                          class="anim-mark"/>
              </svg>
              <span class="sparkle sp-0">✦</span>
              <span class="sparkle sp-1">✦</span>
              <span class="sparkle sp-2">✦</span>
              <span class="sparkle sp-3">✦</span>
              <span class="sparkle sp-4">✦</span>
              <span class="sparkle sp-5">✦</span>
              <span class="sparkle sp-6">✦</span>
              <span class="sparkle sp-7">✦</span>
            </div>
          }
          @if (status() === 'error') {
            <div class="icon-wrap">
              <svg class="result-svg" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" fill="rgba(239,68,68,0.08)"/>
                <circle cx="40" cy="40" r="36" stroke="#EF4444" stroke-width="2.5"
                        stroke-dasharray="226" stroke-dashoffset="226"
                        class="anim-circle anim-circle--error"/>
                <line x1="27" y1="27" x2="53" y2="53" stroke="#EF4444" stroke-width="5"
                      stroke-linecap="round"
                      stroke-dasharray="37" stroke-dashoffset="37"
                      class="anim-mark anim-mark--x1"/>
                <line x1="53" y1="27" x2="27" y2="53" stroke="#EF4444" stroke-width="5"
                      stroke-linecap="round"
                      stroke-dasharray="37" stroke-dashoffset="37"
                      class="anim-mark anim-mark--x2"/>
              </svg>
              <span class="sparkle-err se-0">✕</span>
              <span class="sparkle-err se-1">✕</span>
              <span class="sparkle-err se-2">✕</span>
              <span class="sparkle-err se-3">✕</span>
              <span class="sparkle-err se-4">✕</span>
              <span class="sparkle-err se-5">✕</span>
              <span class="sparkle-err se-6">✕</span>
              <span class="sparkle-err se-7">✕</span>
            </div>
          }

          <h2 class="result-title" [class.result-title--error]="status() === 'error'">
            {{ status() === 'success'
              ? 'Se ha dado de alta al suministro correctamente'
              : 'Ha ocurrido un error al dar de alta el suministro' }}
          </h2>
          <p class="result-sub">
            {{ status() === 'success'
              ? 'El nuevo suministro ha sido registrado y será procesado en los próximos días hábiles.'
              : (submitError() || 'Por favor, inténtalo de nuevo o contacta con soporte si el problema persiste.') }}
          </p>

          @if (status() === 'success') {
            <a routerLink="/supplies" class="btn-next result-btn">Ver suministros</a>
          }
          <button class="btn-secondary" (click)="reset()">
            {{ status() === 'success' ? 'Dar de alta otro suministro' : 'Volver a intentarlo' }}
          </button>
        </div>
      }

    </div>
  `,
  styles: [`
    .page {
      padding-bottom: 3rem;
      font-family: 'DM Sans', system-ui, sans-serif;
    }

    /* Back button */
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: none; cursor: pointer;
      color: #64748B; font-size: 0.85rem; font-weight: 500;
      padding: 0; margin-bottom: 1.25rem;
      font-family: inherit; transition: color 120ms;
    }
    .back-btn:hover { color: #0F172A; }
    .back-btn .pi { font-size: 0.78rem; }

    /* Page header */
    .page-header { margin-bottom: 2rem; }
    .page-title {
      font-size: 1.75rem; font-weight: 700;
      color: #0F172A; margin: 0 0 0.35rem;
      letter-spacing: -0.025em; line-height: 1.2;
    }
    .page-subtitle { font-size: 0.875rem; color: #64748B; margin: 0; }

    /* ── Step 1: Supply grid ── */
    .supply-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 640px) { .supply-grid { grid-template-columns: 1fr; } }
    @media (min-width: 480px) and (max-width: 640px) { .supply-grid { grid-template-columns: repeat(2, 1fr); } }

    .supply-card {
      background: #FFFFFF;
      border: 1.5px solid rgba(0,0,0,0.10);
      border-radius: 14px;
      padding: 1.5rem 1.25rem 1.25rem;
      text-align: left; cursor: pointer;
      transition: all 150ms ease;
      display: flex; flex-direction: column;
      font-family: inherit;
    }
    .supply-card:hover:not(:disabled) {
      border-color: #227CFF;
      box-shadow: 0 0 0 3px rgba(34,124,255,0.10);
      transform: translateY(-1px);
    }
    .supply-card--disabled { background: #F8FAFC; cursor: not-allowed; }

    .supply-icon-wrap { margin-bottom: 1.25rem; }
    .supply-icon-circle {
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(34,124,255,0.08);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.75rem;
    }
    .supply-icon-circle .pi { font-size: 1.1rem; color: #227CFF; }
    .supply-icon-circle--inactive { background: #F1F5F9; }
    .supply-icon-circle--inactive .pi { color: #CBD5E1; }

    .supply-divider {
      width: 36px; height: 2px;
      background: #227CFF; border-radius: 2px;
    }
    .supply-divider--inactive { background: #E2E8F0; }

    .supply-label {
      font-size: 1rem; font-weight: 700;
      color: #0F172A; margin: 0 0 0.35rem;
    }
    .supply-label--inactive { color: #94A3B8; }
    .supply-description { font-size: 0.78rem; color: #94A3B8; margin: 0; line-height: 1.4; }

    /* ── Step 2: Invoice comparator ── */
    .compare-loading {
      display: flex; align-items: center; gap: 10px;
      padding: 2rem; color: #64748B; font-size: 0.9rem;
    }
    .compare-loading .pi { font-size: 1.1rem; color: #227CFF; }

    .compare-error {
      display: flex; align-items: center; gap: 8px;
      padding: 0.75rem 0.9rem; border-radius: 10px; margin-bottom: 1rem;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3);
      color: #DC2626; font-size: 0.85rem;
    }

    .compare-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem; margin-bottom: 1.25rem;
    }
    @media (max-width: 560px) { .compare-grid { grid-template-columns: 1fr; } }

    .compare-card {
      background: #FFFFFF; border: 1.5px solid rgba(0,0,0,0.10);
      border-radius: 14px; padding: 1.25rem;
      display: flex; flex-direction: column; gap: 0.35rem;
    }
    .compare-card--suminex { border-color: #227CFF; background: #EAF2FF; }
    .compare-card-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; }
    .compare-card-provider { font-size: 0.85rem; font-weight: 600; color: #475569; }
    .compare-card-price { font-size: 1.5rem; font-weight: 800; color: #0F172A; }

    .compare-savings {
      display: flex; align-items: center; gap: 8px;
      padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1.25rem;
      background: rgba(34,197,94,0.10); color: #16A34A;
      font-size: 0.9rem; font-weight: 700;
    }
    .compare-savings--negative { background: rgba(239,68,68,0.08); color: #DC2626; }
    .compare-change-btn { margin-top: 0.75rem; }

    /* ── Step 3: Ownership ── */
    .ownership-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
      max-width: 680px;
    }
    @media (max-width: 560px) { .ownership-grid { grid-template-columns: 1fr; } }

    .ownership-card {
      background: #FFFFFF;
      border: 1.5px solid rgba(0,0,0,0.10);
      border-radius: 16px;
      padding: 1.5rem 1.25rem 1.25rem;
      cursor: pointer; transition: all 150ms ease;
      display: flex; flex-direction: column; align-items: center;
      font-family: inherit; text-align: center;
    }
    .ownership-card:hover {
      border-color: #227CFF;
      box-shadow: 0 0 0 3px rgba(34,124,255,0.10);
      transform: translateY(-2px);
    }
    .ownership-illustration {
      width: 100%; margin-bottom: 1rem;
    }
    .ownership-illustration img {
      width: 100%; height: auto; display: block;
      pointer-events: none; user-select: none;
    }
    .ownership-label { font-size: 1rem; font-weight: 700; color: #0F172A; }

    /* ── Steps 4 & 5: Forms ── */
    .step-form {
      display: flex; flex-direction: column;
      gap: 1.125rem;
    }
    .form-field { display: flex; flex-direction: column; gap: 0.45rem; }
    .form-label { font-size: 0.82rem; font-weight: 700; color: #0F172A; }
    .form-input {
      width: 100%; padding: 0.875rem 1rem;
      background: #FFFFFF;
      border: 1.5px solid rgba(0,0,0,0.12);
      border-radius: 12px;
      font-size: 0.9rem; color: #0F172A;
      outline: none; transition: border-color 150ms, box-shadow 150ms;
      font-family: inherit; box-sizing: border-box;
    }
    .form-input::placeholder { color: #94A3B8; }
    .form-input:focus {
      border-color: #227CFF;
      box-shadow: 0 0 0 3px rgba(34,124,255,0.10);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }

    .form-field.invalid .form-input { border-color: #EF4444; }
    .field-error { font-size: 0.76rem; color: #DC2626; }

    .phone-row { display: grid; grid-template-columns: 150px 1fr; gap: 0.6rem; }
    @media (max-width: 480px) { .phone-row { grid-template-columns: 1fr; } }
    .phone-country { cursor: pointer; }

    .btn-next {
      width: 100%; padding: 0.9rem 1rem;
      background: #227CFF; color: #fff;
      border: none; border-radius: 12px;
      font-size: 0.95rem; font-weight: 700;
      cursor: pointer; font-family: inherit;
      transition: background 150ms; margin-top: 0.5rem;
    }
    .btn-next:hover { background: #1A6FE8; }

    /* ── Step 6: Document upload ── */
    .upload-field { display: flex; flex-direction: column; gap: 0.4rem; }
    .upload-area {
      border: 2px dashed rgba(0,0,0,0.14);
      border-radius: 14px; padding: 2rem 1.5rem;
      display: flex; flex-direction: column;
      align-items: center; text-align: center;
      cursor: pointer; transition: all 150ms ease;
      background: #FAFAFA;
    }
    .upload-area:hover { border-color: #227CFF; background: #EAF2FF; }
    .upload-area--done {
      border-style: solid; border-color: #22C55E;
      background: rgba(34,197,94,0.04);
    }
    .upload-area--error { border-color: #EF4444; }
    .upload-icon { font-size: 1.75rem; color: #94A3B8; margin-bottom: 0.625rem; }
    .upload-icon--success { color: #22C55E; }
    .upload-label { font-size: 0.9rem; font-weight: 700; color: #0F172A; margin: 0 0 0.3rem; }
    .upload-filename { font-size: 0.875rem; font-weight: 600; color: #16A34A; margin: 0 0 0.2rem; word-break: break-all; }
    .upload-hint { font-size: 0.78rem; color: #94A3B8; margin: 0; }
    .upload-formats { display: inline-block; margin-top: 0.5rem; font-size: 0.72rem; color: #CBD5E1; }

    /* ── Result screen ── */
    .result-wrap {
      display: flex; flex-direction: column;
      align-items: center; text-align: center;
      padding: 4rem 1.5rem 3rem;
      max-width: 480px; margin: 0 auto;
      animation: fade-up 0.4s ease forwards;
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Animated SVG icon */
    .icon-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .result-svg {
      display: block;
      width: 140px; height: 140px;
    }

    /* Sparkles */
    .sparkle {
      position: absolute;
      font-size: 0.75rem;
      color: #22C55E;
      opacity: 0;
      pointer-events: none;
      animation-duration: 1s;
      animation-timing-function: ease-out;
      animation-fill-mode: forwards;
    }
    .sp-0 { font-size: 0.9rem;  animation-name: sp-top;    animation-delay: 1.4s; }
    .sp-1 { font-size: 0.65rem; animation-name: sp-tr;     animation-delay: 1.55s; }
    .sp-2 { font-size: 0.8rem;  animation-name: sp-right;  animation-delay: 1.45s; }
    .sp-3 { font-size: 0.6rem;  animation-name: sp-br;     animation-delay: 1.6s; }
    .sp-4 { font-size: 0.85rem; animation-name: sp-bottom; animation-delay: 1.5s; }
    .sp-5 { font-size: 0.6rem;  animation-name: sp-bl;     animation-delay: 1.4s; }
    .sp-6 { font-size: 0.75rem; animation-name: sp-left;   animation-delay: 1.55s; }
    .sp-7 { font-size: 0.65rem; animation-name: sp-tl;     animation-delay: 1.45s; }

    @keyframes sp-top    { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(0,-85px) scale(1.3)} }
    @keyframes sp-tr     { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(60px,-60px) scale(1.3)} }
    @keyframes sp-right  { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(88px,0) scale(1.3)} }
    @keyframes sp-br     { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(60px,60px) scale(1.3)} }
    @keyframes sp-bottom { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(0,85px) scale(1.3)} }
    @keyframes sp-bl     { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(-60px,60px) scale(1.3)} }
    @keyframes sp-left   { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(-88px,0) scale(1.3)} }
    @keyframes sp-tl     { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 35%{opacity:1} 100%{opacity:0;transform:translate(-60px,-60px) scale(1.3)} }

    /* Error burst — same directions, red ✕ */
    .sparkle-err {
      position: absolute;
      color: #EF4444;
      opacity: 0;
      pointer-events: none;
      animation-duration: 1s;
      animation-timing-function: ease-out;
      animation-fill-mode: forwards;
    }
    .se-0 { font-size: 0.9rem;  animation-name: sp-top;    animation-delay: 1.55s; }
    .se-1 { font-size: 0.6rem;  animation-name: sp-tr;     animation-delay: 1.7s;  }
    .se-2 { font-size: 0.8rem;  animation-name: sp-right;  animation-delay: 1.6s;  }
    .se-3 { font-size: 0.55rem; animation-name: sp-br;     animation-delay: 1.75s; }
    .se-4 { font-size: 0.85rem; animation-name: sp-bottom; animation-delay: 1.65s; }
    .se-5 { font-size: 0.55rem; animation-name: sp-bl;     animation-delay: 1.55s; }
    .se-6 { font-size: 0.75rem; animation-name: sp-left;   animation-delay: 1.7s;  }
    .se-7 { font-size: 0.6rem;  animation-name: sp-tl;     animation-delay: 1.6s;  }

    @keyframes circle-draw {
      to { stroke-dashoffset: 0; }
    }
    @keyframes mark-draw {
      to { stroke-dashoffset: 0; }
    }

    .anim-circle {
      animation: circle-draw 1s cubic-bezier(0.65,0,0.35,1) forwards;
    }
    .anim-circle--error {
      animation: circle-draw 1s cubic-bezier(0.65,0,0.35,1) forwards;
    }
    .anim-mark {
      animation: mark-draw 0.7s ease forwards;
      animation-delay: 0.85s;
    }
    .anim-mark--x1 {
      animation: mark-draw 0.55s ease 0.85s forwards;
    }
    .anim-mark--x2 {
      animation: mark-draw 0.55s ease 1.2s forwards;
    }

    .result-title {
      font-size: 1.5rem; font-weight: 700;
      color: #0F172A; margin: 0 0 0.75rem;
      letter-spacing: -0.02em; line-height: 1.3;
    }
    .result-title--error { color: #DC2626; }

    .result-sub {
      font-size: 0.9rem; color: #64748B;
      margin: 0 0 2rem; line-height: 1.6;
    }
    .result-btn {
      text-decoration: none; margin-bottom: 0.75rem;
      max-width: 320px;
    }
    .btn-secondary {
      background: none; border: 1.5px solid rgba(0,0,0,0.12);
      border-radius: 12px; padding: 0.875rem 1rem;
      width: 100%; max-width: 320px;
      font-size: 0.9rem; font-weight: 600;
      color: #475569; cursor: pointer;
      font-family: inherit; transition: all 150ms;
    }
    .btn-secondary:hover { border-color: #227CFF; color: #227CFF; background: #EAF2FF; }
  `]
})
export class NewSupplyComponent {
  private comparisons = inject(ComparisonsService);
  private servicesSvc = inject(ServicesService);
  private suppliesSvc = inject(SuppliesService);

  private readonly supplyKindToServiceType: Record<'electricity' | 'gas' | 'internet', ServiceType> = {
    electricity: 'LUZ',
    gas: 'GAS',
    internet: 'INTERNET',
  };

  step = signal<Step>(1);
  selectedSupply = signal<SupplyKind>(null);
  ownershipType = signal<OwnershipChange>(null);
  status = signal<'idle' | 'success' | 'error'>('idle');

  ocrStatus = signal<OcrStatus>('idle');
  ocrErrorMsg = signal('');
  comparison = signal<SupplyComparisonResult | null>(null);

  matchedTariffDetail = signal<ServiceTariff | null>(null);
  luzOcrData = signal<LuzOcrResult | null>(null);
  showConfigurarProducto = signal(false);
  luzComparatorResult = signal<ComparatorResult | null>(null);
  ocrDocumentId = signal<string | null>(null);
  uploadedInvoiceName = signal<string | null>(null);
  comparisonHistoryId = signal<string | null>(null);
  submitError = signal('');

  supplyOptions: SupplyOption[] = [
    { id: 'electricity', label: 'Suministro de luz',      description: 'Dar de alta nuevo suministro de luz',      icon: 'pi-bolt',       available: true  },
    { id: 'gas',         label: 'Suministro de gas',      description: 'Dar de alta nuevo suministro de gas',      icon: 'pi-cloud',      available: true  },
    { id: 'internet',    label: 'Suministro de Internet', description: 'Dar de alta nuevo suministro de internet', icon: 'pi-wifi',       available: true  },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'pi-circle',     available: false },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'pi-circle',     available: false },
    { id: null,          label: 'Próximamente',            description: 'Dar de alta nuevo suministro',             icon: 'pi-circle',     available: false },
  ];

  countryOptions = [
    { dial: '+34',  name: 'España' },
    { dial: '+351', name: 'Portugal' },
    { dial: '+33',  name: 'Francia' },
  ];

  holderData = { fullName: '', nationalId: '', phoneCountry: '+34', phoneNumber: '', email: '' };
  holderSubmitted = false;

  supplyPointData = {
    streetAddress: '', floor: '', door: '',
    postalCode: '', province: '', city: '',
    cups: '', bankAccount: '', phoneToPort: '',
  };
  supplyPointSubmitted = false;

  documents: { idFront: File | null; idBack: File | null } = {
    idFront: null,
    idBack: null,
  };
  documentsSubmitted = false;

  get fullNameError(): string | null {
    if (!this.holderSubmitted) return null;
    return this.holderData.fullName.trim() ? null : 'Este campo es obligatorio';
  }

  get dniError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.nationalId.trim()) return 'Este campo es obligatorio';
    return /^\d{8}[A-Za-z]$/.test(this.holderData.nationalId.trim())
      ? null : 'Introduce un DNI válido (8 dígitos y una letra)';
  }

  get phoneError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.phoneNumber.trim()) return 'Este campo es obligatorio';
    return this.isValidPhone() ? null : 'Introduce un número de teléfono válido';
  }

  get emailError(): string | null {
    if (!this.holderSubmitted) return null;
    if (!this.holderData.email.trim()) return 'Este campo es obligatorio';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.holderData.email.trim())
      ? null : 'Introduce un correo electrónico válido';
  }

  get streetAddressError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.streetAddress.trim() ? null : 'Este campo es obligatorio';
  }

  get postalCodeError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    if (!this.supplyPointData.postalCode.trim()) return 'Este campo es obligatorio';
    return /^\d{5}$/.test(this.supplyPointData.postalCode.trim())
      ? null : 'El código postal debe tener 5 dígitos';
  }

  get provinceError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.province.trim() ? null : 'Este campo es obligatorio';
  }

  get cityError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    return this.supplyPointData.city.trim() ? null : 'Este campo es obligatorio';
  }

  get cupsError(): string | null {
    if (!this.supplyPointSubmitted || !this.requiresCups()) return null;
    const cups = this.supplyPointData.cups.trim();
    if (!cups) return 'Este campo es obligatorio';
    return /^ES\d{16}[A-Z0-9]{2,4}$/i.test(cups)
      ? null : 'Introduce un CUPS válido (ES + 16 dígitos + letras)';
  }

  get phoneToPortError(): string | null {
    if (!this.supplyPointSubmitted || this.requiresCups()) return null;
    const digits = this.supplyPointData.phoneToPort.replace(/\D/g, '');
    if (!digits) return 'Este campo es obligatorio';
    return /^[6789]\d{8}$/.test(digits) ? null : 'Introduce un número de teléfono válido';
  }

  private requiresCups(): boolean {
    return this.selectedSupply() === 'electricity' || this.selectedSupply() === 'gas';
  }

  get bankAccountError(): string | null {
    if (!this.supplyPointSubmitted) return null;
    const iban = this.supplyPointData.bankAccount.replace(/\s+/g, '');
    if (!iban) return 'Este campo es obligatorio';
    return /^ES\d{22}$/i.test(iban) ? null : 'Introduce un IBAN español válido';
  }

  private isValidPhone(): boolean {
    const digits = this.holderData.phoneNumber.replace(/\D/g, '');
    if (this.holderData.phoneCountry === '+34') return /^[6789]\d{8}$/.test(digits);
    return digits.length >= 6 && digits.length <= 15;
  }

  selectSupply(kind: SupplyKind) {
    this.selectedSupply.set(kind);
    this.ocrStatus.set('idle');
    this.ocrErrorMsg.set('');
    this.comparison.set(null);
    this.matchedTariffDetail.set(null);
    this.luzOcrData.set(null);
    this.showConfigurarProducto.set(false);
    this.ocrDocumentId.set(null);
    this.comparisonHistoryId.set(null);
    this.uploadedInvoiceName.set(null);
    this.step.set(2);
  }

  onInvoiceInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadAndCompare(file);
  }

  onInvoiceDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadAndCompare(file);
  }

  private uploadAndCompare(file: File) {
    const kind = this.selectedSupply();
    if (kind === null) return;
    const serviceType = this.supplyKindToServiceType[kind];

    this.uploadedInvoiceName.set(file.name);
    this.ocrStatus.set('uploading');
    this.ocrErrorMsg.set('');

    this.comparisons.extract(file, serviceType).subscribe({
      next: ({ ocrDocumentId, ocrData }) => {
        this.ocrDocumentId.set(ocrDocumentId);
        this.prefillFromOcr(ocrData);
        this.servicesSvc.getServices().subscribe({
          next: groups => {
            if (serviceType === 'LUZ' && ocrData.luz) {
              this.resolveLuzTariff(ocrData.luz, groups);
            } else {
              this.comparison.set(computeSupplyComparison(ocrData, groups));
              this.ocrStatus.set('done');
            }
          },
          error: () => {
            this.comparison.set(null);
            this.ocrStatus.set('done');
          },
        });
      },
      error: (e) => {
        this.ocrErrorMsg.set(e?.error?.error ?? e?.error?.message ?? 'No se pudo leer la factura. Inténtalo de nuevo.');
        this.ocrStatus.set('error');
      },
    });
  }

  /** Autorrellena Titular y Punto de suministro con lo que ya trae la factura, para que el comercial solo tenga que revisar. */
  private prefillFromOcr(ocrData: OcrInvoiceResult) {
    const titular = ocrData.luz?.titular ?? ocrData.gas?.titular ?? ocrData.internet?.titular;
    const cups = ocrData.luz?.cups ?? ocrData.gas?.cups ?? null;
    if (!titular) return;

    if (titular.nombre)   this.holderData.fullName = titular.nombre;
    if (titular.dni)      this.holderData.nationalId = titular.dni;
    if (titular.telefono) this.holderData.phoneNumber = titular.telefono.replace(/\D/g, '');
    if (titular.email)    this.holderData.email = titular.email;

    if (titular.calle) {
      this.supplyPointData.streetAddress = titular.numero ? `${titular.calle} ${titular.numero}` : titular.calle;
    }
    if (titular.piso)         this.supplyPointData.floor = titular.piso;
    if (titular.puerta)       this.supplyPointData.door = titular.puerta;
    if (titular.codigoPostal) this.supplyPointData.postalCode = titular.codigoPostal;
    if (titular.provincia)    this.supplyPointData.province = titular.provincia;
    if (titular.municipio)    this.supplyPointData.city = titular.municipio;
    if (cups)                 this.supplyPointData.cups = cups;
  }

  private resolveLuzTariff(luz: LuzOcrResult, groups: ServiceGroup[]) {
    const normalize = (s: string | null | undefined) => (s ?? '').trim().toUpperCase().replace(/\s+/g, '');
    const luzGroup = groups.find(g => normalize(g.serviceType) === 'LUZ');
    const matchedTariff = luzGroup?.tariffs.find(t => normalize(t.code) === normalize(luz.tarifa));

    if (!matchedTariff) {
      console.warn(
        '[NewSupply] No se encontró tarifa Suminex para el código OCR:', luz.tarifa,
        '— códigos disponibles en catálogo LUZ:', luzGroup?.tariffs.map(t => t.code),
      );
      this.comparison.set(null);
      this.ocrStatus.set('done');
      return;
    }

    console.debug('[NewSupply] Tarifa Suminex encontrada para', luz.tarifa, '→', matchedTariff);
    this.luzOcrData.set(luz);
    this.matchedTariffDetail.set(matchedTariff);
    this.showConfigurarProducto.set(true);
    this.ocrStatus.set('done');
  }

  retryInvoice() {
    this.ocrStatus.set('idle');
    this.ocrErrorMsg.set('');
    this.comparison.set(null);
    this.matchedTariffDetail.set(null);
    this.luzOcrData.set(null);
    this.showConfigurarProducto.set(false);
  }

  closeConfigurarProducto() {
    this.showConfigurarProducto.set(false);
  }

  onConfiguratorContinued(result: ComparatorResult) {
    this.luzComparatorResult.set(result);
    this.saveComparison(result);
    this.continueAfterComparison();
  }

  /** POST /api/comparisons/save — persistencia best-effort, no bloquea el avance del wizard si falla */
  private saveComparison(result: ComparatorResult) {
    const ocrDocumentId = this.ocrDocumentId();
    const tariff = this.matchedTariffDetail();
    const luz = this.luzOcrData();
    if (!ocrDocumentId || !tariff || !luz) return;

    const snapshot = {
      ocrDocumentId,
      serviceId: tariff.id,
      cups: luz.cups,
      productName: result.producto,
      providerName: tariff.name,
      annualConsumption: result.annualConsumptionKwh,
      annualSavings: result.ahorroXAnio,
      monthlySavings: result.ahorroEstudio,
      savingsPercent: result.ahorroPorcent,
      commissionAmount: result.comision,
      commissionPercent: result.comisionFraccion * 100,
      energyCommission: result.comisionEnergiaEur,
      energyFee: result.feeEnergiaEfectivo,
      powerFee: result.feePotenciaEfectivo,
      omieAveragePrice: result.omieAveragePrice,
    };

    const resultData = {
      Dias: result.diasFactura,
      Comision: result.comision,
      IeActual: result.ieActual,
      IeOferta: result.ieOferta,
      Periodos: result.periodos.map(p => ({
        Periodo: Number(p.periodo.slice(1)) - 1,
        CosteEnergia: p.costeEnergia,
        CostePotencia: p.costePotencia,
        PrecioEnergiaOferta: p.precioEnergiaOferta,
        PrecioPotenciaOferta: p.precioPotenciaOferta,
      })),
      IvaActual: result.ivaActual,
      IvaOferta: result.ivaOferta,
      AhorroAnual: result.ahorroXAnio,
      TotalActual: result.totalActual,
      TotalOferta: result.totalOferta,
      BaseIEActual: result.baseIEActual,
      BaseIEOferta: result.baseIEOferta,
      AhorroMensual: result.ahorroEstudio,
      AhorroPorcent: result.ahorroPorcent,
      SubTotalActual: result.subTotalActual,
      SubTotalOferta: result.subTotalOferta,
      PrecioMedioOmie: result.omieAveragePrice,
    };

    this.comparisons.save({ ...snapshot, resultData }).subscribe({
      next: ({ comparisonHistoryId }) => this.comparisonHistoryId.set(comparisonHistoryId),
      error: (e) => console.warn('[NewSupply] No se pudo guardar la comparativa', e),
    });
  }

  continueAfterComparison() { this.step.set(3); }

  selectOwnership(type: OwnershipChange) {
    this.ownershipType.set(type);
    this.step.set(4);
  }

  submitHolderData() {
    this.holderSubmitted = true;
    if (this.fullNameError || this.dniError || this.phoneError || this.emailError) return;
    this.holderSubmitted = false;
    this.step.set(5);
  }

  submitSupplyPoint() {
    this.supplyPointSubmitted = true;
    if (this.streetAddressError || this.postalCodeError || this.provinceError
      || this.cityError || this.cupsError || this.phoneToPortError || this.bankAccountError) return;
    this.supplyPointSubmitted = false;
    this.step.set(6);
  }

  submitDocuments() {
    this.documentsSubmitted = true;
    if (!this.documents.idFront || !this.documents.idBack) return;
    this.finalize();
  }

  goBack() {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as Step);
  }

  onFileSelect(event: Event, doc: keyof typeof this.documents) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.documents[doc] = input.files[0];
  }

  onDrop(event: DragEvent, doc: keyof typeof this.documents) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.documents[doc] = file;
  }

  finalize() {
    const kind = this.selectedSupply();
    const serviceId = this.matchedTariffDetail()?.id ?? this.comparison()?.bestTariffId ?? null;
    if (!kind || serviceId == null) {
      this.submitError.set('No se encontró la tarifa comparada. Vuelve a intentarlo desde el paso de la factura.');
      this.status.set('error');
      return;
    }

    const estimatedSavings = this.luzComparatorResult()?.ahorroXAnio
      ?? (this.comparison()?.savingsAmount ?? 0) * 12;

    const body: CreateSupplyBody = {
      serviceId,
      serviceType: this.supplyKindToServiceType[kind] as CategoryCode,
      originFlow: 'Comparator',
      estimatedSavings,
      comparisonHistoryId: this.comparisonHistoryId() ?? undefined,
      ocrDocumentId: this.ocrDocumentId() ?? undefined,
      holderName: this.holderData.fullName.trim(),
      holderDni: this.holderData.nationalId.trim(),
      holderPhone: `${this.holderData.phoneCountry}${this.holderData.phoneNumber.replace(/\D/g, '')}`,
      holderEmail: this.holderData.email.trim(),
      isUserTheHolder: this.ownershipType() === 'without-change',
      holderIban: this.supplyPointData.bankAccount.replace(/\s+/g, '') || undefined,
      cups: this.requiresCups() ? this.supplyPointData.cups.trim() : undefined,
      phoneToPort: this.requiresCups() ? undefined : this.supplyPointData.phoneToPort.replace(/\D/g, ''),
      street: this.supplyPointData.streetAddress.trim() || undefined,
      floor: this.supplyPointData.floor.trim() || undefined,
      door: this.supplyPointData.door.trim() || undefined,
      postalCode: this.supplyPointData.postalCode.trim() || undefined,
      province: this.supplyPointData.province.trim() || undefined,
      locality: this.supplyPointData.city.trim() || undefined,
    };

    this.submitError.set('');
    this.suppliesSvc.create(body).subscribe({
      next: created => this.finalizeVerifyIdentity(created.id),
      error: (e) => {
        this.submitError.set(e?.error?.error ?? e?.error?.message ?? '');
        this.status.set('error');
      },
    });
  }

  private finalizeVerifyIdentity(supplyId: string) {
    const front = this.documents.idFront;
    const back = this.documents.idBack;
    if (!front || !back) {
      this.submitError.set('Faltan las imágenes del DNI.');
      this.status.set('error');
      return;
    }
    this.suppliesSvc.verifyIdentity(supplyId, front, back).subscribe({
      next: () => this.status.set('success'),
      error: (e) => {
        this.submitError.set(e?.error?.error ?? e?.error?.message ?? '');
        this.status.set('error');
      },
    });
  }

  reset() {
    this.status.set('idle');
    this.step.set(1);
    this.selectedSupply.set(null);
    this.ownershipType.set(null);
    this.ocrStatus.set('idle');
    this.ocrErrorMsg.set('');
    this.comparison.set(null);
    this.matchedTariffDetail.set(null);
    this.luzOcrData.set(null);
    this.showConfigurarProducto.set(false);
    this.luzComparatorResult.set(null);
    this.ocrDocumentId.set(null);
    this.comparisonHistoryId.set(null);
    this.uploadedInvoiceName.set(null);
    this.submitError.set('');
    this.holderSubmitted = false;
    this.supplyPointSubmitted = false;
    this.documentsSubmitted = false;
    this.holderData = { fullName: '', nationalId: '', phoneCountry: '+34', phoneNumber: '', email: '' };
    this.supplyPointData = { streetAddress: '', floor: '', door: '', postalCode: '', province: '', city: '', cups: '', bankAccount: '', phoneToPort: '' };
    this.documents = { idFront: null, idBack: null };
  }
}
