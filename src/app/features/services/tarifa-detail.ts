import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../core/services/services.service';
import { ServiceDetail } from '../../core/models/service.model';
import { TarifaFormComponent } from './modals/tarifa-form';
import { ProductoLuzFormComponent } from './modals/producto-luz-form';
import { BoeLuzFormComponent } from './modals/boe-luz-form';
import { OmieLuzFormComponent } from './modals/omie-luz-form';

@Component({
  selector: 'app-tarifa-detail',
  standalone: true,
  imports: [SlicePipe, FormsModule, TarifaFormComponent, ProductoLuzFormComponent, BoeLuzFormComponent, OmieLuzFormComponent],
  template: `
    <div class="detail-page" style="font-family: Inter, system-ui, sans-serif;">

      <!-- Back -->
      <button class="back-btn" (click)="goBack()">
        <i class="pi pi-arrow-left"></i> Volver a tarifas
      </button>

      @if (loading()) {
        <div class="loading-center">
          <i class="pi pi-spin pi-spinner"></i><span>Cargando tarifa…</span>
        </div>
      } @else if (detail) {

        <!-- Header -->
        <div class="detail-hdr">
          <div class="hdr-left">
            <span class="svc-badge"
                  [style.background]="typeBg"
                  [style.color]="typeColor"
                  [style.border]="'1px solid ' + typeBorder">
              <i [class]="'pi ' + typeIcon"></i>
              {{ detail.tariffCode || detail.serviceType }}
            </span>
            <div class="hdr-info">
              <h1 class="hdr-name">{{ detail.name }}</h1>
            </div>
          </div>
          <div class="hdr-right">
            <span class="status-chip" [class.st-active]="detail.isActive" [class.st-inactive]="!detail.isActive">
              {{ detail.isActive ? 'Activa' : 'Inactiva' }}
            </span>
            <button class="btn-edit" (click)="showEditForm = true">
              <i class="pi pi-pencil"></i> Editar tarifa
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs-bar">
          @for (tab of tabs; track tab.key) {
            <button class="tab-btn" [class.active]="activeTab() === tab.key"
                    (click)="activeTab.set(tab.key)">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Tab content -->
        <div class="tab-content">

          @if (activeTab() === 'productos') {
            <div class="tab-section">
              <div class="section-hdr">
                <span class="section-title">Productos</span>
                <button class="btn-add" (click)="showProductoLuz = true">
                  <i class="pi pi-plus"></i> Nuevo producto
                </button>
              </div>
              @if (!detail.products?.length) {
                <div class="empty-tab">
                  <i class="pi pi-box"></i>
                  <span>No hay productos para esta tarifa</span>
                </div>
              } @else {
                <table class="detail-table">
                  <thead><tr>
                    <th>Nombre</th><th>Tipo</th><th>Vigencia</th><th>Comisión E%</th><th>Comisión P%</th><th style="text-align:right">Acciones</th>
                  </tr></thead>
                  <tbody>
                    @for (p of detail.products; track p.id) {
                      <tr>
                        <td class="fw-500">{{ p.name }}</td>
                        <td><span class="type-badge" [class.indexed]="p.productType==='INDEXED'" [class.fixed]="p.productType==='FIXED'">{{ p.productType }}</span></td>
                        <td class="txt-muted text-sm">{{ p.validFrom | slice:0:10 }}{{ p.validUntil ? ' → ' + (p.validUntil | slice:0:10) : '' }}</td>
                        <td class="txt-muted text-sm">{{ p.commissionEnergyPct !== null ? (p.commissionEnergyPct! * 100) + '%' : '—' }}</td>
                        <td class="txt-muted text-sm">{{ p.commissionPowerPct  !== null ? (p.commissionPowerPct! * 100) + '%' : '—' }}</td>
                        <td>
                          <div class="row-acts">
                            <button class="act-btn" (click)="editProduct(p)"><i class="pi pi-pencil"></i></button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }

          @if (activeTab() === 'boe') {
            <div class="tab-section">
              <div class="section-hdr">
                <span class="section-title">Potencia BOE</span>
                <button class="btn-add" (click)="showBoe = true">
                  <i class="pi pi-plus"></i> Nuevo período BOE
                </button>
              </div>
              @if (!detail.boePeriods?.length) {
                <div class="empty-tab">
                  <i class="pi pi-bolt"></i>
                  <span>No hay períodos BOE registrados</span>
                </div>
              } @else {
                <table class="detail-table">
                  <thead><tr>
                    <th>Válido desde</th><th>Válido hasta</th>
                    @for (p of periodCols; track p) { <th>{{ p }}</th> }
                  </tr></thead>
                  <tbody>
                    @for (b of groupedBoe; track b.validFrom) {
                      <tr>
                        <td class="txt-muted text-sm">{{ b.validFrom | slice:0:10 }}</td>
                        <td class="txt-muted text-sm">{{ b.validUntil ? (b.validUntil | slice:0:10) : '—' }}</td>
                        @for (p of periodCols; track p) {
                          <td class="num-cell">{{ b.periods[p] ?? '—' }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }

          @if (activeTab() === 'omie') {
            <div class="tab-section">
              <div class="section-hdr">
                <span class="section-title">Reparto OMIE</span>
                <button class="btn-add" (click)="showOmie = true">
                  <i class="pi pi-plus"></i> Nueva distribución
                </button>
              </div>
              @if (!detail.omieDistributions?.length) {
                <div class="empty-tab">
                  <i class="pi pi-chart-bar"></i>
                  <span>No hay distribuciones OMIE registradas</span>
                </div>
              } @else {
                <table class="detail-table">
                  <thead><tr>
                    <th>Nombre</th><th>Margen</th><th>Vigencia</th><th>Activo</th>
                    @for (p of periodCols; track p) { <th>{{ p }}</th> }
                  </tr></thead>
                  <tbody>
                    @for (o of detail.omieDistributions; track o.id) {
                      <tr>
                        <td class="fw-500">{{ o.name }}</td>
                        <td class="txt-muted text-sm">{{ o.margin ?? '—' }}</td>
                        <td class="txt-muted text-sm">{{ o.validFrom | slice:0:10 }}</td>
                        <td>
                          <span class="status-chip" [class.st-active]="o.isActive" [class.st-inactive]="!o.isActive">
                            {{ o.isActive ? 'Activa' : 'Inactiva' }}
                          </span>
                        </td>
                        @for (p of periodCols; track p) {
                          <td class="num-cell">{{ getPeriodFactor(o, p) }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }

          @if (activeTab() === 'config') {
            <div class="tab-section">
              <div class="section-hdr">
                <span class="section-title">Configuración</span>
              </div>
              @if (detail.mobileDetail) {
                <div class="config-grid">
                  <div class="cfg-item"><span class="cfg-label">Cuota mensual</span><span class="cfg-val">{{ detail.mobileDetail.monthlyFee }} €</span></div>
                  <div class="cfg-item"><span class="cfg-label">Datos</span><span class="cfg-val">{{ detail.mobileDetail.dataGb ?? '∞' }} GB</span></div>
                  <div class="cfg-item"><span class="cfg-label">Minutos voz</span><span class="cfg-val">{{ detail.mobileDetail.voiceMinutes ?? 'Ilimitados' }}</span></div>
                  <div class="cfg-item"><span class="cfg-label">Red</span><span class="cfg-val">{{ detail.mobileDetail.network }}</span></div>
                  <div class="cfg-item"><span class="cfg-label">Permanencia</span><span class="cfg-val">{{ detail.mobileDetail.permanenceMonths ?? 0 }} meses</span></div>
                </div>
              }
              @if (detail.internetDetail) {
                <div class="config-grid">
                  <div class="cfg-item"><span class="cfg-label">Cuota mensual</span><span class="cfg-val">{{ detail.internetDetail.monthlyFee }} €</span></div>
                  <div class="cfg-item"><span class="cfg-label">Bajada</span><span class="cfg-val">{{ detail.internetDetail.speedDownMbps }} Mbps</span></div>
                  <div class="cfg-item"><span class="cfg-label">Subida</span><span class="cfg-val">{{ detail.internetDetail.speedUpMbps }} Mbps</span></div>
                  <div class="cfg-item"><span class="cfg-label">Tecnología</span><span class="cfg-val">{{ detail.internetDetail.technology }}</span></div>
                  <div class="cfg-item"><span class="cfg-label">Router</span><span class="cfg-val">{{ detail.internetDetail.routerIncluded ? 'Incluido' : 'No incluido' }}</span></div>
                  <div class="cfg-item"><span class="cfg-label">TV</span><span class="cfg-val">{{ detail.internetDetail.includesTv ? 'Incluida' : 'No incluida' }}</span></div>
                </div>
              }
            </div>
          }

        </div>

      }

      <!-- Edit tarifa modal -->
      @if (showEditForm && detail) {
        <app-tarifa-form
          [serviceType]="detail.serviceType"
          [editItem]="detail"
          (saved)="onTarifaSaved()"
          (cancelled)="showEditForm = false"
        />
      }

      @if (showProductoLuz && detail) {
        <app-producto-luz-form
          [tariffId]="detail.id"
          [tariffCode]="detail.tariffCode ?? ''"
          (saved)="onModalSaved(); showProductoLuz = false"
          (cancelled)="showProductoLuz = false"
        />
      }
      @if (showBoe && detail) {
        <app-boe-luz-form
          [tariffId]="detail.id"
          [tariffCode]="detail.tariffCode ?? ''"
          (saved)="onModalSaved(); showBoe = false"
          (cancelled)="showBoe = false"
        />
      }
      @if (showOmie && detail) {
        <app-omie-luz-form
          [tariffId]="detail.id"
          [tariffCode]="detail.tariffCode ?? ''"
          (saved)="onModalSaved(); showOmie = false"
          (cancelled)="showOmie = false"
        />
      }

    </div>
  `,
  styles: [`
    .detail-page { max-width: 1000px; font-family: Inter, system-ui, sans-serif; }

    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; margin-bottom: 20px;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-color, #D5D9E8); background: transparent;
      color: var(--text-secondary, #5A6180); font-size: var(--font-sm, 12px); cursor: pointer;
      font-family: inherit; transition: all 120ms;
    }
    .back-btn:hover { border-color: var(--accent-border, #C7D2FE); color: var(--accent, #4F46E5); }
    .back-btn .pi { font-size: 11px; }

    .loading-center { display: flex; align-items: center; gap: 10px; padding: 40px; color: var(--text-muted, #9299B8); font-size: var(--font-base, 13px); }
    .loading-center .pi { font-size: 18px; color: var(--accent, #4F46E5); }

    /* Header */
    .detail-hdr {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    .hdr-left { display: flex; align-items: center; gap: 12px; }
    .svc-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: var(--radius-md, 8px);
      font-size: 12px; font-weight: 700; font-family: monospace;
    }
    .svc-badge .pi { font-size: 11px; }
    .hdr-name { font-size: 18px; font-weight: 700; color: var(--text-primary, #1C2033); margin: 0; }
    .hdr-right { display: flex; align-items: center; gap: 8px; }
    .btn-edit {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-color, #D5D9E8); background: transparent;
      color: var(--text-secondary, #5A6180); font-size: var(--font-sm, 12px); cursor: pointer;
      font-family: inherit; transition: all 120ms;
    }
    .btn-edit:hover { border-color: var(--accent-border, #C7D2FE); color: var(--accent, #4F46E5); background: var(--accent-light, #EEF2FF); }

    /* Status */
    .status-chip { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .st-active   { background: var(--success-bg, #F0FDF8); color: var(--success, #059669); border: 1px solid var(--success-border, #A7F3D0); }
    .st-inactive { background: var(--bg-subtle, #E8EBF4); color: var(--text-muted, #9299B8); border: 1px solid var(--border-color, #D5D9E8); }

    /* Tabs */
    .tabs-bar {
      display: flex; gap: 2px;
      border-bottom: 1px solid var(--border-color, #D5D9E8);
      margin-bottom: 20px;
    }
    .tab-btn {
      padding: 8px 16px 9px; border: none; background: transparent;
      font-size: var(--font-base, 13px); font-weight: 500;
      color: var(--text-secondary, #5A6180); cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all 140ms; font-family: inherit; border-radius: 6px 6px 0 0;
    }
    .tab-btn:hover { color: var(--text-primary, #1C2033); background: var(--bg-subtle, #E8EBF4); }
    .tab-btn.active { color: var(--accent, #4F46E5); font-weight: 600; border-bottom-color: var(--accent, #4F46E5); }

    /* Section */
    .tab-section { }
    .section-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: var(--font-md, 14px); font-weight: 600; color: var(--text-primary, #1C2033); }
    .btn-add {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 12px; border-radius: var(--radius-md, 8px);
      background: var(--accent, #4F46E5); color: #fff; border: none;
      font-size: var(--font-sm, 12px); font-weight: 500; cursor: pointer;
      font-family: inherit; transition: background 140ms;
    }
    .btn-add:hover { background: var(--accent-hover, #4338CA); }
    .btn-add .pi { font-size: 10px; }

    /* Detail table */
    .detail-table { width: 100%; border-collapse: collapse; border: 1px solid var(--border-color, #D5D9E8); border-radius: var(--radius-lg, 12px); overflow: hidden; }
    .detail-table thead tr { background: var(--bg-subtle, #E8EBF4); border-bottom: 1px solid var(--border-color, #D5D9E8); }
    .detail-table th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #9299B8); }
    .detail-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color, #D5D9E8); vertical-align: middle; }
    .detail-table tbody tr:last-child td { border-bottom: none; }
    .detail-table tbody tr { background: var(--bg-surface, #fff); transition: background 120ms; }
    .detail-table tbody tr:hover { background: var(--bg-subtle, #E8EBF4); }

    .fw-500 { font-size: var(--font-base, 13px); font-weight: 500; color: var(--text-primary, #1C2033); }
    .txt-muted { color: var(--text-muted, #9299B8); }
    .text-sm { font-size: var(--font-sm, 12px); }
    .num-cell { font-size: var(--font-sm, 12px); color: var(--text-secondary, #5A6180); font-variant-numeric: tabular-nums; }

    .type-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm, 6px); font-size: 11px; font-weight: 700; }
    .type-badge.indexed { background: var(--accent-light, #EEF2FF); color: var(--accent, #4F46E5); }
    .type-badge.fixed   { background: var(--bg-subtle, #E8EBF4); color: var(--text-secondary, #5A6180); }

    .row-acts { display: flex; justify-content: flex-end; gap: 4px; }
    .act-btn { width: 26px; height: 26px; border-radius: var(--radius-sm, 6px); border: 1px solid var(--border-color, #D5D9E8); background: transparent; color: var(--text-muted, #9299B8); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 120ms; }
    .act-btn:hover { border-color: var(--accent-border, #C7D2FE); color: var(--accent, #4F46E5); background: var(--accent-light, #EEF2FF); }
    .act-btn .pi { font-size: 10px; }

    /* Config grid */
    .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .cfg-item {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px; background: var(--bg-surface, #fff);
      border: 1px solid var(--border-color, #D5D9E8); border-radius: var(--radius-lg, 12px);
    }
    .cfg-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #9299B8); }
    .cfg-val { font-size: var(--font-md, 14px); font-weight: 600; color: var(--text-primary, #1C2033); }

    /* Empty */
    .empty-tab { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px; color: var(--text-muted, #9299B8); }
    .empty-tab .pi { font-size: 28px; }
    .empty-tab span { font-size: var(--font-base, 13px); }
  `]
})
export class TarifaDetailComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private location = inject(Location);
  private svc      = inject(ServicesService);

  loading    = signal(true);
  activeTab  = signal('productos');
  detail:    ServiceDetail | null = null;
  showEditForm    = false;
  showProductoLuz = false;
  showBoe         = false;
  showOmie        = false;
  editingProduct: any = null;
  periodCols = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

  get tabs() {
    const t = (this.detail?.serviceType ?? '').toUpperCase();
    if (t === 'LUZ') return [
      { key: 'productos', label: 'Productos' },
      { key: 'boe',       label: 'Potencia BOE' },
      { key: 'omie',      label: 'Reparto OMIE' },
    ];
    if (t === 'GAS') return [
      { key: 'productos', label: 'Productos' },
      { key: 'boe-gas',   label: 'BOE Gas' },
      { key: 'pvpttf',    label: 'Precios PVP/TTF' },
    ];
    return [{ key: 'config', label: 'Configuración' }];
  }

  get typeColor() {
    const m: Record<string, string> = { LUZ: '#D97706', GAS: '#059669', MOBILE: '#7C3AED', INTERNET: '#0284C7' };
    return m[(this.detail?.serviceType ?? '').toUpperCase()] ?? '#4F46E5';
  }
  get typeBg() {
    const m: Record<string, string> = { LUZ: 'rgba(217,119,6,0.1)', GAS: 'rgba(5,150,105,0.1)', MOBILE: 'rgba(124,58,237,0.1)', INTERNET: 'rgba(2,132,199,0.1)' };
    return m[(this.detail?.serviceType ?? '').toUpperCase()] ?? 'rgba(79,70,229,0.1)';
  }
  get typeBorder() {
    const m: Record<string, string> = { LUZ: '#FDE68A', GAS: '#A7F3D0', MOBILE: '#DDD6FE', INTERNET: '#BAE6FD' };
    return m[(this.detail?.serviceType ?? '').toUpperCase()] ?? '#C7D2FE';
  }
  get typeIcon() {
    const m: Record<string, string> = { LUZ: 'pi-sun', GAS: 'pi-fire', MOBILE: 'pi-mobile', INTERNET: 'pi-wifi' };
    return m[(this.detail?.serviceType ?? '').toUpperCase()] ?? 'pi-bolt';
  }

  get groupedBoe() {
    if (!this.detail?.boePeriods?.length) return [];
    const map = new Map<string, { validFrom: string; validUntil: string | null; periods: Record<string, number | undefined> }>();
    for (const b of this.detail.boePeriods) {
      const key = b.validFrom + (b.validUntil ?? '');
      if (!map.has(key)) map.set(key, { validFrom: b.validFrom, validUntil: b.validUntil, periods: {} });
      map.get(key)!.periods[b.period] = b.priceKwDay;
    }
    return Array.from(map.values());
  }

  getPeriodFactor(o: any, period: string): number | string {
    return o.periods?.find((p: any) => p.period === period)?.factor ?? '—';
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getById(id).subscribe({
      next: d => {
        this.detail = d;
        this.activeTab.set(this.tabs[0]?.key ?? 'productos');
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.location.back(); },
    });
  }

  goBack() { this.location.back(); }

  editProduct(p: any) { this.editingProduct = p; }

  onTarifaSaved() {
    this.showEditForm = false;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getById(id).subscribe({ next: d => this.detail = d });
  }

  onModalSaved() {
    this.onTarifaSaved();
  }
}
