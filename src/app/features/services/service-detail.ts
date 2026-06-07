import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ServicesService } from '../../core/services/services.service';
import { ServiceListItem, ServiceDetail } from '../../core/models/service.model';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="true" header="Detalle del servicio"
              [modal]="true" [style]="{width:'560px', maxHeight:'92vh'}"
              [draggable]="false" [closable]="true"
              (onHide)="closed.emit()">

      @if (loading()) {
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando detalle…</span>
        </div>
      } @else {

        <!-- Subtitle -->
        <div class="detail-subtitle">
          {{ item.tariffCode ? item.tariffCode + ' — ' : '' }}{{ detail?.products?.[0]?.name ?? item.name }}
        </div>

        <!-- Info chips -->
        <div class="info-row">
          @if (item.tariffCode) {
            <div class="info-chip">
              <span class="chip-label">Tarifa</span>
              <span class="chip-value">{{ item.tariffCode }}</span>
            </div>
          }
          <div class="info-chip">
            <span class="chip-label">Tipo</span>
            <span class="chip-value">{{ typeLabel(item.serviceType) }}</span>
          </div>
          <div class="info-chip">
            <span class="chip-label">Estado</span>
            <span class="chip-value" [class.green]="item.isActive" [class.muted]="!item.isActive">
              {{ item.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          @if (item.validFrom) {
            <div class="info-chip">
              <span class="chip-label">Vigencia</span>
              <span class="chip-value">{{ item.validFrom | slice:0:10 }}{{ item.validUntil ? ' → ' + (item.validUntil | slice:0:10) : '' }}</span>
            </div>
          }
        </div>

        <!-- ══ LUZ ══ -->
        @if (item.serviceType === 'LUZ' && detail?.products?.length) {
          @for (prod of detail!.products!; track $index) {

            @if (prod.commissionEnergyPct !== null && prod.commissionEnergyPct !== undefined) {
              <div class="commission-row">
                <span class="chip-label">Comisión energía</span>
                <span class="chip-value">{{ prod.commissionEnergyPct * 100 | number:'1.0-2' }}%</span>
              </div>
            }
            @if (prod.commissionPowerPct !== null && prod.commissionPowerPct !== undefined) {
              <div class="commission-row">
                <span class="chip-label">Comisión potencia</span>
                <span class="chip-value">{{ prod.commissionPowerPct * 100 | number:'1.0-2' }}%</span>
              </div>
            }

            <!-- Energía -->
            @if (prod.energyPeriods && prod.energyPeriods.length) {
              <div class="period-section">
                <div class="section-header">
                  <i class="pi pi-bolt" style="color:#FACC15"></i>
                  <span>Energía (€/kWh)</span>
                </div>
                <div class="period-grid">
                  @for (ep of prod.energyPeriods; track ep.period) {
                    <div class="period-card">
                      <span class="period-lbl">{{ ep.period }}</span>
                      <span class="period-val">{{ ep.priceKwh | number:'1.0-6' }}</span>
                      @if (ep.baseValue !== null && ep.baseValue !== undefined) {
                        <span class="period-base">base: {{ ep.baseValue | number:'1.0-6' }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Potencia -->
            @if (prod.powerPeriods && prod.powerPeriods.length) {
              <div class="period-section">
                <div class="section-header">
                  <i class="pi pi-circle" style="color:#60A5FA"></i>
                  <span>Potencia (€/kW·día)</span>
                </div>
                <div class="period-grid">
                  @for (pp of prod.powerPeriods; track pp.period) {
                    <div class="period-card">
                      <span class="period-lbl">{{ pp.period }}</span>
                      <span class="period-val">{{ pp.priceKwDay | number:'1.0-8' }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          }
        }

        <!-- ══ GAS ══ -->
        @if (item.serviceType === 'GAS' && detail?.gasDetail) {
          <div class="period-section">
            <div class="section-header">
              <i class="pi pi-fire" style="color:#FB923C"></i>
              <span>Detalle gas</span>
            </div>
            <div class="info-row mt-sm">
              <div class="info-chip"><span class="chip-label">Tipo</span><span class="chip-value">{{ detail!.gasDetail!.productType }}</span></div>
              @if (detail!.gasDetail!.fixedTermDay !== null) {
                <div class="info-chip"><span class="chip-label">T. Fijo (€/día)</span><span class="chip-value">{{ detail!.gasDetail!.fixedTermDay | number:'1.0-5' }}</span></div>
              }
              @if (detail!.gasDetail!.marginKwh !== null) {
                <div class="info-chip"><span class="chip-label">Margen (€/kWh)</span><span class="chip-value">{{ detail!.gasDetail!.marginKwh | number:'1.0-6' }}</span></div>
              }
            </div>
            @if (detail!.gasDetail!.tiers && detail!.gasDetail!.tiers.length) {
              <div class="tiers-table">
                <div class="tier-head"><span>Orden</span><span>Desde</span><span>Hasta</span><span>€/kWh</span></div>
                @for (t of detail!.gasDetail!.tiers; track t.tierOrder) {
                  <div class="tier-row">
                    <span>{{ t.tierOrder }}</span>
                    <span>{{ t.minKwh | number }}</span>
                    <span>{{ t.maxKwh !== null ? (t.maxKwh | number) : '∞' }}</span>
                    <span>{{ t.priceKwh | number:'1.0-5' }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ══ MOBILE ══ -->
        @if (item.serviceType === 'MOBILE' && detail?.mobileDetail) {
          <div class="period-section">
            <div class="section-header">
              <i class="pi pi-mobile" style="color:#A78BFA"></i>
              <span>Detalle móvil</span>
            </div>
            <div class="detail-pairs">
              <div class="pair"><span>Cuota mensual</span><strong>{{ detail!.mobileDetail!.monthlyFee | number:'1.2-2' }} €</strong></div>
              @if (detail!.mobileDetail!.dataGb) {
                <div class="pair"><span>Datos</span><strong>{{ detail!.mobileDetail!.dataGb }} GB</strong></div>
              }
              <div class="pair"><span>Red</span><strong>{{ detail!.mobileDetail!.network }}</strong></div>
              @if (detail!.mobileDetail!.voiceMinutes) {
                <div class="pair"><span>Voz</span><strong>{{ detail!.mobileDetail!.voiceMinutes }} min</strong></div>
              }
              @if (detail!.mobileDetail!.permanenceMonths) {
                <div class="pair"><span>Permanencia</span><strong>{{ detail!.mobileDetail!.permanenceMonths }} meses</strong></div>
              }
            </div>
          </div>
        }

        <!-- ══ INTERNET ══ -->
        @if (item.serviceType === 'INTERNET' && detail?.internetDetail) {
          <div class="period-section">
            <div class="section-header">
              <i class="pi pi-wifi" style="color:#60A5FA"></i>
              <span>Detalle internet</span>
            </div>
            <div class="detail-pairs">
              <div class="pair"><span>Cuota mensual</span><strong>{{ detail!.internetDetail!.monthlyFee | number:'1.2-2' }} €</strong></div>
              <div class="pair"><span>Bajada</span><strong>{{ detail!.internetDetail!.speedDownMbps }} Mbps</strong></div>
              <div class="pair"><span>Subida</span><strong>{{ detail!.internetDetail!.speedUpMbps }} Mbps</strong></div>
              <div class="pair"><span>Tecnología</span><strong>{{ detail!.internetDetail!.technology }}</strong></div>
              @if (detail!.internetDetail!.permanenceMonths) {
                <div class="pair"><span>Permanencia</span><strong>{{ detail!.internetDetail!.permanenceMonths }} meses</strong></div>
              }
              <div class="pair"><span>Router incluido</span><strong>{{ detail!.internetDetail!.routerIncluded ? 'Sí' : 'No' }}</strong></div>
            </div>
          </div>
        }

      }

      <ng-template pTemplate="footer">
        <p-button label="Cerrar" severity="secondary" [outlined]="true" (onClick)="closed.emit()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .loading-state {
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      padding: 3rem; color: var(--sx-text-3); font-size: 0.875rem;
    }
    .loading-state .pi { font-size: 1.25rem; color: var(--sx-primary); }

    .detail-subtitle {
      font-size: 0.85rem; color: var(--sx-text-2); margin: -0.25rem 0 1.25rem;
    }

    /* Info chips row */
    .info-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .info-chip {
      display: flex; flex-direction: column; gap: 0.2rem;
      background: var(--sx-surface-2); border: 1px solid var(--sx-border);
      border-radius: 10px; padding: 0.6rem 0.9rem; min-width: 90px;
    }
    .chip-label { font-size: 0.7rem; font-weight: 600; color: var(--sx-text-3); text-transform: uppercase; letter-spacing: 0.06em; }
    .chip-value { font-size: 0.9rem; font-weight: 700; color: var(--sx-text); }
    .chip-value.green { color: var(--sx-green); }
    .chip-value.muted { color: var(--sx-text-3); }

    .commission-row {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .commission-row .chip-label { font-size: 0.78rem; color: var(--sx-text-2); }
    .commission-row .chip-value { font-size: 1rem; font-weight: 700; color: var(--sx-text); }

    /* Period sections */
    .period-section {
      border: 1px solid var(--sx-border);
      border-radius: 12px; padding: 1rem;
      margin-bottom: 0.875rem;
    }
    .section-header {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.875rem; font-weight: 700; color: var(--sx-text);
      margin-bottom: 0.875rem;
    }
    .section-header .pi { font-size: 0.9rem; }

    .period-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
    }
    .period-card {
      background: var(--sx-surface-2); border: 1px solid var(--sx-border);
      border-radius: 8px; padding: 0.6rem 0.75rem;
      display: flex; flex-direction: column; gap: 0.2rem;
    }
    .period-lbl { font-size: 0.72rem; font-weight: 600; color: var(--sx-text-3); }
    .period-val { font-size: 0.95rem; font-weight: 700; color: var(--sx-text); font-variant-numeric: tabular-nums; }
    .period-base { font-size: 0.68rem; color: var(--sx-text-3); }

    /* Tiers table */
    .tiers-table { margin-top: 0.75rem; }
    .tier-head, .tier-row {
      display: grid; grid-template-columns: 50px 1fr 1fr 1fr;
      gap: 0.5rem; padding: 0.4rem 0;
    }
    .tier-head {
      font-size: 0.7rem; font-weight: 700; color: var(--sx-text-3);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--sx-border); margin-bottom: 4px;
    }
    .tier-row { font-size: 0.82rem; color: var(--sx-text-2); border-bottom: 1px solid var(--sx-border); }
    .tier-row:last-child { border-bottom: none; }

    /* Detail pairs (mobile/internet) */
    .detail-pairs { display: flex; flex-direction: column; gap: 0; }
    .pair {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.45rem 0; border-bottom: 1px solid var(--sx-border);
      font-size: 0.83rem;
    }
    .pair:last-child { border-bottom: none; }
    .pair span { color: var(--sx-text-2); }
    .pair strong { font-weight: 600; color: var(--sx-text); }

    .mt-sm { margin-top: 0.5rem; }
  `]
})
export class ServiceDetailComponent implements OnInit {
  @Input() item!: ServiceListItem;
  @Output() closed = new EventEmitter<void>();

  private svc = inject(ServicesService);
  loading = signal(true);
  detail: ServiceDetail | null = null;

  ngOnInit() {
    this.svc.getById(this.item.id).subscribe({
      next:  d => { this.detail = d; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  typeLabel(t: string): string {
    const m: Record<string, string> = { LUZ: 'Luz', GAS: 'Gas', MOBILE: 'Móvil', INTERNET: 'Internet' };
    return m[t] ?? t;
  }
}
