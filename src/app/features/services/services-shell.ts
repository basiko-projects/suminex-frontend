import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ServicesService } from '../../core/services/services.service';
import { ServiceGroup, ServiceTariff } from '../../core/models/service.model';
import { TarifaFormComponent } from './modals/tarifa-form';
import { ProductoLuzFormComponent } from './modals/producto-luz-form';
import { BoeLuzFormComponent } from './modals/boe-luz-form';
import { OmieLuzFormComponent } from './modals/omie-luz-form';
import { SuminexLoaderComponent } from '../../shared/components/suminex-loader';
import { ButtonModule } from 'primeng/button';
import { DataTableComponent, DataTableColumn } from '../../shared/data-table/data-table';

@Component({
  selector: 'app-services-shell',
  standalone: true,
  imports: [
    TarifaFormComponent, ProductoLuzFormComponent, BoeLuzFormComponent, OmieLuzFormComponent, SuminexLoaderComponent,
    ButtonModule, DataTableComponent,
  ],
  template: `
    <div class="svc-page">

      <!-- Título -->
      <div class="svc-header">
        <h1 class="svc-title">Servicios</h1>
        <p class="svc-sub">Gestiona las tarifas de todos los suministros</p>
      </div>

      <!-- Nivel 1: tipo de servicio -->
      <div class="type-tabs">
        @for (g of serviceGroups(); track g.id) {
          <button class="type-tab"
                  [class.active]="activeGroupId() === g.id"
                  [style.--tc]="typeColor(g.serviceType)"
                  (click)="selectGroup(g)">
            <span class="tab-dot" [style.background]="typeColor(g.serviceType)"></span>
            {{ g.name }}
          </button>
        }
      </div>

      <!-- Nivel 2: sub-tabs de tarifas -->
      @if (loadingTarifas()) {
        <div class="tarifa-tabs-bar">
          @for (i of [1,2,3]; track i) { <div class="skel-tab"></div> }
        </div>
      } @else if (!activeGroup()) {
        <div class="no-tarifas">Selecciona un tipo de servicio</div>
      } @else if (activeGroup()!.tariffs.length === 0) {
        <div class="no-tarifas">
          <span>No hay tarifas de {{ activeGroup()!.name }}.</span>
          <button class="btn-new-small" (click)="showNewTarifaForm = true">
            <i class="pi pi-plus"></i> Nueva tarifa
          </button>
        </div>
      } @else {
        <div class="tarifa-tabs-bar">
          @for (t of sortedTarifas(); track t.id) {
            <div class="tarifa-chip-group">
              <button class="tarifa-tab"
                      [class.active]="activeTarifa()?.id === t.id"
                      (click)="selectTarifa(t)">
                {{ t.code || t.name }}
              </button>
            </div>
          }
          <button class="btn-new-tarifa" (click)="showNewTarifaForm = true" title="Nueva tarifa">
            <i class="pi pi-plus"></i>
          </button>
        </div>
      }

      <!-- Nivel 3: detalle de la tarifa seleccionada -->
      @if (activeTarifa()) {
        <div class="detail-area">

          <!-- Header -->
          <div class="detail-hdr">
            <div class="detail-hdr-left">
              <span class="tarifa-badge"
                    [style.background]="typeBg(activeGroup()!.serviceType)"
                    [style.color]="typeColor(activeGroup()!.serviceType)">
                {{ activeTarifa()!.code || activeTarifa()!.name }}
              </span>
              <span class="detail-name">{{ activeTarifa()!.name }}</span>
            </div>
          </div>

          <!-- Tabs de contenido -->
          <div class="content-tabs">
            @for (tab of contentTabs(); track tab.key) {
              <button class="content-tab"
                      [class.active]="activeContentTab() === tab.key"
                      (click)="activeContentTab.set(tab.key)">
                {{ tab.label }}
              </button>
            }
          </div>

          <!-- Productos -->
          @if (activeContentTab() === 'productos') {
            <div class="tab-section">
              <app-data-table
                title="Productos"
                [columns]="productColumns"
                [rows]="activeTarifa()!.products ?? []"
                [total]="(activeTarifa()!.products ?? []).length"
                [page]="1"
                [pageSize]="(activeTarifa()!.products ?? []).length || 20"
                [searchable]="false"
                [rowTemplate]="prodRowTpl"
                emptyMessage="Sin productos configurados aún">
                <p-button dtActions label="Nuevo producto" icon="pi pi-plus" size="small" (onClick)="showProductoLuz = true" />
              </app-data-table>

              <ng-template #prodRowTpl let-p>
                <td class="fw-600">{{ p.name }}</td>
                <td><div class="cell-center"><span class="type-badge" [class.indexed]="p.type==='INDEXED'" [class.fixed]="p.type==='FIXED'">{{ typeLabel(p.type) }}</span></div></td>
                <td><div class="cell-center"><span class="status-chip" [class.st-on]="p.isActive" [class.st-off]="!p.isActive">{{ p.isActive ? 'Activo' : 'Inactivo' }}</span></div></td>
                <td>
                  <div class="row-acts">
                    <button class="act-btn"      title="Ver detalle" (click)="openProductView(p.id)">
                      @if (loadingDetailFor() === p.id) { <app-suminex-loader [size]="14" /> } @else { <i class="pi pi-eye"></i> }
                    </button>
                    <button class="act-btn edit" title="Editar"   (click)="startEditProduct(p.id)"><i class="pi pi-pencil"></i></button>
                    <button class="act-btn del"  title="Eliminar" (click)="deleteConfirmId.set(p.id)"><i class="pi pi-trash"></i></button>
                  </div>
                </td>
              </ng-template>
            </div>
          }

          <!-- Potencia BOE (LUZ) -->
          @if (activeContentTab() === 'boe') {
            <div class="tab-section">
              <div class="tab-hdr">
                <span class="tab-title">Potencia BOE</span>
                <button class="btn-add" (click)="editingBoeData = null; showBoe = true">
                  <i class="pi pi-plus"></i> Nuevo BOE
                </button>
              </div>
              @if (activeTarifa()!.boePeriods?.length) {
                <div class="omie-card">
                  <div class="omie-card-hdr">
                    <div class="omie-card-left">
                      <span class="omie-name">Potencia BOE actual</span>
                      <span class="omie-date">{{ activeTarifa()!.boePeriods![0].validFrom }}{{ activeTarifa()!.boePeriods![0].validUntil ? ' → ' + activeTarifa()!.boePeriods![0].validUntil : '' }}</span>
                    </div>
                    <div class="omie-card-right">
                      <button class="act-btn edit" title="Editar" (click)="editingBoeData = buildEditBoe(); showBoe = true">
                        <i class="pi pi-pencil"></i>
                      </button>
                    </div>
                  </div>
                  <div class="omie-periods">
                    @for (b of activeTarifa()!.boePeriods; track b.period) {
                      <div class="omie-period-cell">
                        <span class="period-badge">{{ b.period }}</span>
                        <span class="omie-factor">{{ b.priceKwDay }}</span>
                        <span class="omie-factor-sub">€/kW·día</span>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="empty-tab"><i class="pi pi-bolt"></i><span>Sin períodos BOE registrados</span></div>
              }
            </div>
          }

          <!-- Reparto OMIE (LUZ) -->
          @if (activeContentTab() === 'omie') {
            <div class="tab-section">
              <div class="tab-hdr">
                <span class="tab-title">Reparto OMIE</span>
                <button class="btn-add" (click)="editingOmieData = null; showOmie = true">
                  <i class="pi pi-plus"></i> Nueva distribución
                </button>
              </div>
              @if (activeTarifa()!.omieDistributions?.length) {
                @for (dist of activeTarifa()!.omieDistributions; track dist.id) {
                  <div class="omie-card">
                    <div class="omie-card-hdr">
                      <div class="omie-card-left">
                        <span class="omie-name">{{ dist.name }}</span>
                        @if (dist.margin !== null && dist.margin !== undefined) {
                          <span class="omie-margin">margen: {{ dist.margin }}</span>
                        }
                        <span class="status-chip" [class.st-on]="dist.isActive" [class.st-off]="!dist.isActive">
                          {{ dist.isActive ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                      <div class="omie-card-right">
                        <span class="omie-date">{{ dist.validFrom }}{{ dist.validUntil ? ' → ' + dist.validUntil : '' }}</span>
                        <button class="act-btn edit" title="Editar" (click)="editingOmieData = dist; showOmie = true">
                          <i class="pi pi-pencil"></i>
                        </button>
                      </div>
                    </div>
                    @if (dist.periods.length) {
                      <div class="omie-periods">
                        @for (p of dist.periods; track p.period) {
                          <div class="omie-period-cell">
                            <span class="period-badge">{{ p.period }}</span>
                            <span class="omie-factor">{{ p.factor }}</span>
                          </div>
                        }
                      </div>
                    } @else {
                      <span class="omie-no-periods">Sin factores de período</span>
                    }
                  </div>
                }
              } @else {
                <div class="empty-tab"><i class="pi pi-chart-bar"></i><span>Sin distribuciones OMIE</span></div>
              }
            </div>
          }

          <!-- Productos GAS -->
          @if (activeContentTab() === 'gas-productos') {
            <div class="tab-section">
              <div class="tab-hdr">
                <span class="tab-title">Productos</span>
                <button class="btn-add" (click)="showProductoLuz = true">
                  <i class="pi pi-plus"></i> Nuevo producto
                </button>
              </div>
              @if (activeTarifa()!.pricing; as pr) {
                <div class="pricing-grid">
                  @if (pr.gasProductType) {
                    <div class="pcard"><span class="plabel">Tipo gas</span><strong>{{ pr.gasProductType }}</strong></div>
                  }
                  @if (pr.priceKwh != null) {
                    <div class="pcard"><span class="plabel">Precio €/kWh</span><strong>{{ pr.priceKwh }}</strong></div>
                  }
                  @if (pr.fixedTermMonthly != null) {
                    <div class="pcard"><span class="plabel">Término fijo mensual</span><strong>{{ pr.fixedTermMonthly }} €</strong></div>
                  }
                  @if (pr.indexMargin != null) {
                    <div class="pcard"><span class="plabel">Margen índice</span><strong>{{ pr.indexMargin }}</strong></div>
                  }
                </div>
              }
            </div>
          }

          <!-- Configuración MOBILE / INTERNET -->
          @if (activeContentTab() === 'config') {
            <div class="tab-section">
              <div class="tab-hdr">
                <span class="tab-title">Configuración</span>
              </div>
              @if (activeTarifa()!.pricing; as pr) {
                <div class="pricing-grid">
                  @if (pr.monthlyFee != null) {
                    <div class="pcard"><span class="plabel">Cuota mensual</span><strong>{{ pr.monthlyFee }} €</strong></div>
                  }
                  @if (pr.dataGb != null) {
                    <div class="pcard"><span class="plabel">Datos</span><strong>{{ pr.dataGb }} GB</strong></div>
                  }
                  @if (pr.network) {
                    <div class="pcard"><span class="plabel">Red</span><strong>{{ pr.network }}</strong></div>
                  }
                  @if (pr.speedDownMbps != null) {
                    <div class="pcard"><span class="plabel">Bajada</span><strong>{{ pr.speedDownMbps }} Mbps</strong></div>
                  }
                  @if (pr.speedUpMbps != null) {
                    <div class="pcard"><span class="plabel">Subida</span><strong>{{ pr.speedUpMbps }} Mbps</strong></div>
                  }
                  @if (pr.technology) {
                    <div class="pcard"><span class="plabel">Tecnología</span><strong>{{ pr.technology }}</strong></div>
                  }
                </div>
              }
            </div>
          }

        </div>
      }

    </div>

    <!-- Modales -->
    @if (showNewTarifaForm) {
      <app-tarifa-form
        [serviceId]="activeGroupId() ?? ''"
        [serviceType]="activeGroup()?.serviceType ?? 'LUZ'"
        (saved)="onTarifaSaved()"
        (cancelled)="showNewTarifaForm = false"
      />
    }

    @if ((showProductoLuz || editingProduct()) && activeTarifa()) {
      <app-producto-luz-form
        [tariffId]="activeTarifa()!.id"
        [tariffCode]="activeTarifa()!.code ?? ''"
        [editProduct]="editingProduct()"
        (saved)="onProductSaved()"
        (cancelled)="closeProductoForm()"
      />
    }

    @if (deleteConfirmId() !== null) {
      <div class="confirm-overlay" (click)="deleteConfirmId.set(null)">
        <div class="confirm-box" (click)="$event.stopPropagation()">
          <div class="confirm-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <h3 class="confirm-title">Eliminar producto</h3>
          <p class="confirm-msg">Esta acción no se puede deshacer. ¿Continuar?</p>
          <div class="confirm-acts">
            <button class="btn-cancel-sm" (click)="deleteConfirmId.set(null)" [disabled]="deleting()">Cancelar</button>
            <button class="btn-del-sm" (click)="doDeleteProduct()" [disabled]="deleting()">
              @if (deleting()) { <app-suminex-loader [size]="14" /> } Eliminar
            </button>
          </div>
        </div>
      </div>
    }

    @if (viewingProduct()) {
      <div class="confirm-overlay" (click)="viewingProduct.set(null)">
        <div class="view-modal" (click)="$event.stopPropagation()">
          <div class="view-head">
            <div class="view-head-info">
              <span class="view-title">{{ viewingProduct().name }}</span>
              <div class="view-chips">
                @if (activeTarifa()?.code) {
                  <span class="tariff-chip">{{ activeTarifa()!.code }}</span>
                }
                <span class="type-badge" [class.indexed]="viewingProduct().type==='INDEXED'" [class.fixed]="viewingProduct().type==='FIXED'">{{ typeLabel(viewingProduct().type) }}</span>
                <span class="status-chip" [class.st-on]="viewingProduct().isActive" [class.st-off]="!viewingProduct().isActive">{{ viewingProduct().isActive ? 'Activo' : 'Inactivo' }}</span>
              </div>
            </div>
            <button class="close-btn" (click)="viewingProduct.set(null)"><i class="pi pi-times"></i></button>
          </div>
          <div class="view-dates">
            <span class="view-date-lbl">Desde:</span><span>{{ viewingProduct().validFrom ?? '—' }}</span>
            <span class="view-date-lbl">Hasta:</span><span>{{ viewingProduct().validUntil ?? '—' }}</span>
          </div>
          <div class="view-section">
            <div class="view-section-title"><i class="pi pi-bolt" style="color:#FACC15"></i> Energía (€/kWh)</div>
            <div class="pg-cells">
              @for (ep of viewingProduct().energyPeriods; track ep.period) {
                <div class="pg-cell"><span class="pg-lbl">{{ ep.period }}</span><span class="pg-val">{{ ep.priceKwh ?? '—' }}</span></div>
              }
            </div>
          </div>
          <div class="view-section">
            <div class="view-section-title"><i class="pi pi-circle" style="color:#60A5FA"></i> Potencia (€/kW·día)</div>
            <div class="pg-cells">
              @for (pp of viewingProduct().powerPeriods; track pp.period) {
                <div class="pg-cell"><span class="pg-lbl">{{ pp.period }}</span><span class="pg-val" [class.val-boe]="pp.priceKwDay === null">{{ pp.priceKwDay ?? 'BOE' }}</span></div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    @if (showBoe && activeTarifa()) {
      <app-boe-luz-form
        [tariffId]="activeTarifa()!.id"
        [tariffCode]="activeTarifa()!.code ?? ''"
        [editBoe]="editingBoeData"
        (saved)="onModalSaved(); showBoe = false; editingBoeData = null"
        (cancelled)="showBoe = false; editingBoeData = null"
      />
    }

    @if (showOmie && activeTarifa()) {
      <app-omie-luz-form
        [tariffId]="activeTarifa()!.id"
        [tariffCode]="activeTarifa()!.code ?? ''"
        [editOmie]="editingOmieData"
        (saved)="onModalSaved(); showOmie = false; editingOmieData = null"
        (cancelled)="showOmie = false; editingOmieData = null"
      />
    }
  `,
  styles: [`
    :host { display: block; font-family: Inter, system-ui, sans-serif; }

    .svc-header { margin-bottom: 1.25rem; }
    .svc-title { font-size: 20px; font-weight: 700; color: var(--sx-text); margin: 0 0 2px; }
    .svc-sub   { font-size: 12px; color: var(--sx-text-3); margin: 0; }

    /* Nivel 1: tipo */
    .type-tabs {
      display: flex; gap: 2px; margin-bottom: 0;
      border-bottom: 1px solid var(--sx-border);
    }
    .type-tab {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 16px 9px; border: none; background: transparent;
      font-size: 13px; font-weight: 500; color: var(--sx-text-2);
      cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all 140ms; font-family: inherit; border-radius: 6px 6px 0 0;
    }
    .type-tab:hover { color: var(--sx-text); background: var(--sx-surface-2); }
    .type-tab.active { color: var(--tc); font-weight: 600; border-bottom-color: var(--tc); }
    .tab-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    /* Nivel 2: tarifas */
    .tarifa-tabs-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 12px 0 0; margin-bottom: 20px; flex-wrap: wrap;
    }
    .tarifa-tab {
      padding: 5px 14px; border-radius: 20px;
      border: 1.5px solid var(--sx-border);
      background: transparent; color: var(--sx-text-2);
      font-size: 12px; font-weight: 600; font-family: monospace;
      cursor: pointer; transition: all 140ms;
    }
    .tarifa-tab:hover { border-color: var(--sx-border-2); color: var(--sx-primary); }
    .tarifa-tab.active { background: var(--sx-primary-btn); border-color: var(--sx-primary-btn); color: #fff; }

    .tarifa-chip-group { display: flex; align-items: center; gap: 3px; }

    .side-chip {
      padding: 4px 8px; border-radius: 20px;
      border: 1px solid var(--sx-border);
      background: var(--sx-surface-2);
      color: var(--sx-text-3);
      font-size: 10px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all 120ms; white-space: nowrap;
    }
    .side-chip:hover { border-color: var(--sx-border-2); color: var(--sx-primary); background: var(--sx-primary-bg); }

    .btn-new-tarifa {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1.5px dashed var(--sx-border);
      background: transparent; color: var(--sx-text-3);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 11px; transition: all 140ms;
    }
    .btn-new-tarifa:hover { border-color: var(--sx-primary); color: var(--sx-primary); }

    .skel-tab { width: 64px; height: 28px; border-radius: 20px; background: var(--sx-surface-2); animation: skel 1.2s ease-in-out infinite alternate; }
    @keyframes skel { from{opacity:0.5}to{opacity:1} }
    .no-tarifas { display: flex; align-items: center; gap: 10px; padding: 14px 0; color: var(--sx-text-3); font-size: 13px; }
    .btn-new-small {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 20px;
      border: 1px solid var(--sx-border-2); background: var(--sx-primary-bg);
      color: var(--sx-primary-text); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
    }

    /* Nivel 3: detalle */
    .detail-area { }
    .detail-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .detail-hdr-left { display: flex; align-items: center; gap: 10px; }
    .tarifa-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: monospace; }
    .detail-name { font-size: 15px; font-weight: 600; color: var(--sx-text); }

    /* Content tabs */
    .content-tabs {
      display: flex; gap: 2px; margin-bottom: 16px;
      border-bottom: 1px solid var(--sx-border);
    }
    .content-tab {
      padding: 7px 14px 8px; border: none; background: transparent;
      font-size: 13px; font-weight: 500; color: var(--sx-text-2);
      cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all 140ms; font-family: inherit; border-radius: 6px 6px 0 0;
    }
    .content-tab:hover { color: var(--sx-text); background: var(--sx-surface-2); }
    .content-tab.active { color: var(--sx-primary); font-weight: 600; border-bottom-color: var(--sx-primary); }

    /* Tab section */
    .tab-section { }
    .tab-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .tab-title { font-size: 14px; font-weight: 600; color: var(--sx-text); }
    .btn-add {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 8px;
      background: var(--sx-primary-btn); color: #fff; border: none;
      font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
    }
    .btn-add:hover { background: var(--sx-primary); }
    .btn-add .pi { font-size: 10px; }

    /* Pricing grid */
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .pcard {
      display: flex; flex-direction: column; gap: 4px; padding: 12px 14px;
      background: var(--sx-surface); border: 1px solid var(--sx-border);
      border-radius: 10px;
    }
    .plabel { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sx-text-3); }
    .pcard strong { font-size: 14px; font-weight: 600; color: var(--sx-text); }

    /* Empty */
    .empty-tab { display: flex; align-items: center; gap: 10px; padding: 32px; color: var(--sx-text-3); font-size: 13px; justify-content: center; }
    .empty-tab .pi { font-size: 22px; }

    /* Loading row */
    .loading-row { display: flex; align-items: center; gap: 8px; padding: 28px; color: var(--sx-text-3); font-size: 13px; justify-content: center; }
    .loading-row .pi { font-size: 16px; color: var(--sx-primary); }

    /* Product table row cells — data-table's scoped CSS doesn't reach ng-template cells */
    td { padding: 0.85rem 1.5rem; vertical-align: middle; font-size: 14px; font-weight: 500; color: var(--sx-text); }
    td:first-child { padding-left: 3rem; }
    td:last-child  { padding-right: 3rem; }
    .fw-600 { font-weight: 600; color: var(--sx-text); }
    .txt-muted { color: var(--sx-text-3); }
    .text-xs { font-size: 12px; }
    .cell-center { display: flex; justify-content: center; }
    .type-badge { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 700; }
    .type-badge.indexed { background: var(--sx-primary-bg); color: var(--sx-primary-text); }
    .type-badge.fixed   { background: var(--sx-surface-2); color: var(--sx-text-2); }
    .row-acts { display: flex; justify-content: center; gap: 4px; }
    .act-btn { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--sx-border); background: transparent; color: var(--sx-text-3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 120ms; }
    .act-btn .pi { font-size: 10px; }
    .act-btn:hover       { border-color: var(--sx-border-2); color: var(--sx-text); background: var(--sx-surface-2); }
    .act-btn.edit:hover  { border-color: #FDE68A; color: #D97706; background: rgba(217,119,6,0.08); }
    .act-btn.del:hover   { border-color: #FECACA; color: #DC2626; background: #FEF2F2; }
    .status-chip { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .st-on  { background: var(--sx-green-bg); color: var(--sx-green); border: 1px solid var(--sx-border-2); }
    .st-off { background: var(--sx-surface-2); color: var(--sx-text-3); border: 1px solid var(--sx-border); }

    /* Expanded row */
    .expanded-row td { background: var(--sx-surface-2) !important; padding: 10px 16px !important; }
    .expanded-body { display: flex; gap: 28px; flex-wrap: wrap; }
    .period-group { display: flex; flex-direction: column; gap: 6px; }
    .pg-title { font-size: 11px; font-weight: 600; color: var(--sx-text-2); display: flex; align-items: center; gap: 4px; }
    .pg-cells { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
    .pg-cell  { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .pg-lbl   { font-size: 10px; font-weight: 700; color: var(--sx-text-3); text-transform: uppercase; }
    .pg-val   { font-size: 12px; font-weight: 600; color: var(--sx-text); font-variant-numeric: tabular-nums; background: var(--sx-surface); border: 1px solid var(--sx-border); border-radius: 6px; padding: 5px 8px; width: 100%; text-align: center; }
    .pg-val.val-boe { color: var(--sx-primary-text); background: var(--sx-primary-bg); border-color: var(--sx-border-2); }

    /* BOE table */
    .boe-info-note { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sx-primary-text); background: var(--sx-primary-bg); border: 1px solid var(--sx-border-2); padding: 7px 11px; border-radius: 8px; margin-bottom: 10px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table thead tr { background: var(--sx-surface-2); }
    .data-table th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sx-text-3); border-bottom: 1px solid var(--sx-border); }
    .data-table td { padding: 9px 12px; border-bottom: 1px solid var(--sx-border); color: var(--sx-text); }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover td { background: var(--sx-surface-2); }
    .mono { font-variant-numeric: tabular-nums; font-family: monospace; font-size: 13px; }
    .period-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: var(--sx-surface-2); color: var(--sx-text-2); border: 1px solid var(--sx-border); }

    /* OMIE cards */
    .omie-card { border: 1px solid var(--sx-border); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 12px; }
    .omie-card-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .omie-card-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .omie-card-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .omie-name { font-size: 13px; font-weight: 700; color: var(--sx-text); }
    .omie-margin { font-size: 11px; color: var(--sx-text-3); background: var(--sx-surface-2); padding: 2px 7px; border-radius: 4px; }
    .omie-date { font-size: 11px; color: var(--sx-text-3); }
    .omie-periods { display: flex; gap: 8px; flex-wrap: wrap; }
    .omie-period-cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 48px; }
    .omie-factor { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--sx-text); background: var(--sx-surface); border: 1px solid var(--sx-border); border-radius: 6px; padding: 4px 8px; width: 100%; text-align: center; }
    .omie-no-periods { font-size: 12px; color: var(--sx-text-3); font-style: italic; }
    .omie-factor-sub { font-size: 9px; color: var(--sx-text-3); text-align: center; margin-top: 1px; }

    /* Confirm delete overlay */
    .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 600; backdrop-filter: blur(2px); animation: cfadeIn 150ms ease; }
    @keyframes cfadeIn { from{opacity:0}to{opacity:1} }
    .confirm-box { background: var(--sx-surface); border-radius: 16px; padding: 28px 24px; width: 340px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.18); animation: cslideUp 180ms ease-out; }
    @keyframes cslideUp { from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1} }
    .confirm-icon { font-size: 28px; color: #F59E0B; margin-bottom: 10px; }
    .confirm-title { font-size: 15px; font-weight: 700; color: var(--sx-text); margin: 0 0 6px; }
    .confirm-msg   { font-size: 13px; color: var(--sx-text-3); margin: 0 0 20px; }
    .confirm-acts  { display: flex; justify-content: center; gap: 10px; }
    .btn-cancel-sm { padding: 8px 18px; border-radius: 8px; border: 1px solid var(--sx-border); background: transparent; color: var(--sx-text-2); font-size: 13px; cursor: pointer; font-family: inherit; transition: background 120ms; }
    .btn-cancel-sm:hover { background: var(--sx-surface-2); }
    .btn-del-sm { display: flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; background: #DC2626; color: #fff; border: none; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 140ms; }
    .btn-del-sm:hover:not(:disabled) { background: #B91C1C; }
    .btn-del-sm:disabled, .btn-cancel-sm:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Product view modal */
    .view-modal { background: var(--sx-surface); border-radius: 16px; padding: 20px; width: min(92vw, 480px); max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.18); animation: cslideUp 180ms ease-out; display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .view-modal { width: min(80vw, 640px); padding: 26px; gap: 18px; } }
    @media (min-width: 1280px) { .view-modal { width: min(55vw, 760px); padding: 32px; gap: 22px; } }
    .view-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .view-head-info { display: flex; flex-direction: column; gap: 8px; }
    .view-title { font-size: 17px; font-weight: 700; color: var(--sx-text); line-height: 1.2; }
    @media (min-width: 768px) { .view-title { font-size: 20px; } }
    .view-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .tariff-chip { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; background: var(--sx-primary-bg); color: var(--sx-primary-text); border: 1px solid var(--sx-border-2); letter-spacing: 0.03em; }
    .close-btn { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--sx-border); background: transparent; color: var(--sx-text-3); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .close-btn:hover { color: #DC2626; border-color: #FECACA; background: #FEF2F2; }
    .close-btn .pi { font-size: 11px; }
    .view-dates { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--sx-text-2); background: var(--sx-surface-2); border-radius: 8px; padding: 8px 12px; flex-wrap: wrap; }
    @media (min-width: 768px) { .view-dates { font-size: 13px; padding: 10px 14px; } }
    .view-date-lbl { font-weight: 600; color: var(--sx-text-3); font-size: 11px; text-transform: uppercase; }
    .view-section { display: flex; flex-direction: column; gap: 10px; }
    .view-section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--sx-text-2); }
    @media (min-width: 768px) { .view-section-title { font-size: 13px; } }
    .view-section-title .pi { font-size: 12px; }
  `]
})
export class ServicesShellComponent implements OnInit {
  private svc = inject(ServicesService);

  serviceGroups    = signal<ServiceGroup[]>([]);
  activeGroupId    = signal<string | null>(null);
  activeTarifa     = signal<ServiceTariff | null>(null);
  activeContentTab = signal<string>('productos');
  loadingTarifas   = signal(false);

  productColumns: DataTableColumn[] = [
    { key: 'name',    label: 'Nombre' },
    { key: 'type',    label: 'Tipo',     align: 'center' },
    { key: 'status',  label: 'Estado',   align: 'center' },
    { key: 'actions', label: 'Acciones', align: 'center', width: '110px' },
  ];

  showNewTarifaForm = false;
  showProductoLuz   = false;
  showBoe           = false;
  showOmie          = false;
  editingBoeData: { periods: { period: string; priceKwDay: number }[]; validFrom: string; validUntil?: string | null } | null = null;
  editingOmieData: any = null;

  viewingProduct   = signal<any>(null);
  loadingDetailFor = signal<number | null>(null);
  editingProduct   = signal<any>(null);
  deleteConfirmId       = signal<number | null>(null);
  deleting              = signal(false);

  private detailCache = new Map<string, any>();

  get activeGroup(): () => ServiceGroup | null {
    return () => this.serviceGroups().find(g => g.id === this.activeGroupId()) ?? null;
  }

  sortedTarifas(): ServiceTariff[] {
    return [...(this.activeGroup()?.tariffs ?? [])].sort((a, b) =>
      (a.code ?? a.name).localeCompare(b.code ?? b.name, 'es', { numeric: true })
    );
  }

  contentTabs() {
    const type = this.activeGroup()?.serviceType ?? '';
    if (type === 'LUZ')      return [{ key:'productos', label:'Productos' }, { key:'boe', label:'Potencia BOE' }, { key:'omie', label:'Reparto OMIE' }];
    if (type === 'GAS')      return [{ key:'gas-productos', label:'Productos' }];
    return [{ key:'config', label:'Configuración' }];
  }

  typeLabel(t: string): string {
    return t === 'FIXED' ? 'Fijo' : t === 'INDEXED' ? 'Indexado' : t;
  }

  typeColor(t: string): string {
    return ({ LUZ:'#D97706', GAS:'#059669', MOBILE:'#7C3AED', INTERNET:'#0284C7' } as any)[t] ?? '#227CFF';
  }
  typeBg(t: string): string {
    return ({ LUZ:'rgba(217,119,6,0.12)', GAS:'rgba(5,150,105,0.12)', MOBILE:'rgba(124,58,237,0.12)', INTERNET:'rgba(2,132,199,0.12)' } as any)[t] ?? 'rgba(34,124,255,0.12)';
  }

  ngOnInit() { this.loadServices(); }

  loadServices() {
    const prevTarifaId = this.activeTarifa()?.id;
    this.loadingTarifas.set(true);
    this.svc.getServices().pipe(finalize(() => this.loadingTarifas.set(false))).subscribe({
      next: groups => {
        this.serviceGroups.set(groups);
        if (prevTarifaId) {
          const fresh = groups.flatMap(g => g.tariffs).find(t => t.id === prevTarifaId);
          if (fresh) this.activeTarifa.set(fresh);
        } else if (groups.length && !this.activeGroupId()) {
          this.selectGroup(groups[0]);
        }
      },
    });
  }

  selectGroup(group: ServiceGroup) {
    this.activeGroupId.set(group.id);
    this.activeTarifa.set(null);
    this.activeContentTab.set(this.contentTabs()[0]?.key ?? 'productos');
    if (group.tariffs.length) this.selectTarifa(group.tariffs[0]);
  }

  selectTarifa(tarifa: ServiceTariff) {
    this.activeTarifa.set(tarifa);
    this.activeContentTab.set(this.contentTabs()[0]?.key ?? 'productos');
    this.viewingProduct.set(null);
  }

  private fetchProductDetail(tariffId: number, productId: number, cb: (d: any) => void, onError?: () => void) {
    const cacheKey = `${tariffId}-${productId}`;
    if (this.detailCache.has(cacheKey)) { cb(this.detailCache.get(cacheKey)); return; }
    this.svc.getProductById(tariffId, productId).subscribe({
      next: d => { this.detailCache.set(cacheKey, d); cb(d); },
      error: () => { onError?.(); },
    });
  }

  openProductView(productId: number) {
    const tariffId = this.activeTarifa()!.id;
    this.loadingDetailFor.set(productId);
    this.fetchProductDetail(
      tariffId, productId,
      d => { this.viewingProduct.set(d); this.loadingDetailFor.set(null); },
      () => this.loadingDetailFor.set(null),
    );
  }

  startEditProduct(productId: number) {
    const tariffId = this.activeTarifa()!.id;
    this.fetchProductDetail(tariffId, productId, d => {
      this.editingProduct.set(d);
    });
  }

  closeProductoForm() {
    this.showProductoLuz = false;
    this.editingProduct.set(null);
  }

  onProductSaved() {
    const tariffId  = this.activeTarifa()?.id;
    const productId = this.editingProduct()?.id;
    this.closeProductoForm();
    if (tariffId && productId) this.detailCache.delete(`${tariffId}-${productId}`);
    this.loadServices();
  }

  doDeleteProduct() {
    const productId = this.deleteConfirmId();
    const tariffId  = this.activeTarifa()?.id;
    if (productId === null || !tariffId) return;
    this.deleting.set(true);
    this.svc.deleteProduct(tariffId, productId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteConfirmId.set(null);
        this.detailCache.delete(`${tariffId}-${productId}`);
        this.loadServices();
      },
      error: () => { this.deleting.set(false); },
    });
  }

  onTarifaSaved() {
    this.showNewTarifaForm = false;
    this.loadServices();
  }

  buildEditBoe() {
    const boe = this.activeTarifa()!.boePeriods!;
    return {
      periods:    boe.map(b => ({ period: b.period, priceKwDay: b.priceKwDay })),
      validFrom:  boe[0]?.validFrom ?? '',
      validUntil: boe[0]?.validUntil ?? null,
    };
  }

  onModalSaved() {
    this.detailCache.clear();
    this.loadServices();
  }
}
