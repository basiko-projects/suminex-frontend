import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/services/services.service';
import { ProvidersService } from '../../../core/services/providers.service';
import { ServiceDetail } from '../../../core/models/service.model';
import { TarifaFormComponent } from '../modals/tarifa-form/tarifa-form';
import { ProductoLuzFormComponent } from '../modals/producto-luz-form/producto-luz-form';
import { BoeLuzFormComponent } from '../modals/boe-luz-form/boe-luz-form';
import { OmieLuzFormComponent } from '../modals/omie-luz-form/omie-luz-form';
import { BasikoLoader } from '../../../shared/components/basiko-loader/basiko-loader';
import { Icon, IconName } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-tarifa-detail',
  standalone: true,
  imports: [SlicePipe, FormsModule, TarifaFormComponent, ProductoLuzFormComponent, BoeLuzFormComponent, OmieLuzFormComponent, BasikoLoader, Icon],
  templateUrl: './tarifa-detail.html',
})
export class TarifaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private svc = inject(ServicesService);
  private providersSvc = inject(ProvidersService);

  integratedProviderIds = signal<Set<string>>(new Set());

  loading = signal(true);
  activeTab = signal('productos');
  detail = signal<ServiceDetail | null>(null);
  showEditForm = false;
  showProductoLuz = false;
  showBoe = false;
  showOmie = false;
  editingProduct: any = null;
  periodCols = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

  get tabs() {
    const t = (this.detail()?.serviceType ?? '').toUpperCase();
    if (t === 'LUZ') return [
      { key: 'productos', label: 'Productos' },
      { key: 'boe', label: 'Potencia BOE' },
      { key: 'omie', label: 'Reparto OMIE' },
    ];
    if (t === 'GAS') return [
      { key: 'productos', label: 'Productos' },
      { key: 'boe-gas', label: 'BOE Gas' },
      { key: 'pvpttf', label: 'Precios PVP/TTF' },
    ];
    return [{ key: 'config', label: 'Configuración' }];
  }

  get typeColor() {
    const m: Record<string, string> = { LUZ: '#D97706', GAS: '#059669', MOBILE: '#7C3AED', INTERNET: '#0284C7' };
    return m[(this.detail()?.serviceType ?? '').toUpperCase()] ?? '#227CFF';
  }
  get typeBg() {
    const m: Record<string, string> = { LUZ: 'rgba(217,119,6,0.1)', GAS: 'rgba(5,150,105,0.1)', MOBILE: 'rgba(124,58,237,0.1)', INTERNET: 'rgba(2,132,199,0.1)' };
    return m[(this.detail()?.serviceType ?? '').toUpperCase()] ?? 'rgba(34,124,255,0.1)';
  }
  get typeBorder() {
    const m: Record<string, string> = { LUZ: '#FDE68A', GAS: '#A7F3D0', MOBILE: '#DDD6FE', INTERNET: '#BAE6FD' };
    return m[(this.detail()?.serviceType ?? '').toUpperCase()] ?? '#B9D9FF';
  }
  get typeIcon(): IconName {
    const m: Record<string, IconName> = { LUZ: 'sun', GAS: 'fire', MOBILE: 'device-phone-mobile', INTERNET: 'wifi' };
    return m[(this.detail()?.serviceType ?? '').toUpperCase()] ?? 'bolt';
  }

  get groupedBoe() {
    const detail = this.detail();
    if (!detail?.boePeriods?.length) return [];
    const map = new Map<string, { validFrom: string; validUntil: string | null; periods: Record<string, number | undefined> }>();
    for (const b of detail.boePeriods) {
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
        this.detail.set(d);
        this.activeTab.set(this.tabs[0]?.key ?? 'productos');
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.location.back(); },
    });
    this.providersSvc.getAll().subscribe({
      next: providers => {
        this.integratedProviderIds.set(new Set(providers.filter(p => p.externalIntegrationCode).map(p => p.id)));
      },
    });
  }

  goBack() { this.location.back(); }

  editProduct(p: any) { this.editingProduct = p; }

  missingExternalTariff(p: any): boolean {
    return !!p.providerId && this.integratedProviderIds().has(p.providerId) && !p.externalTariffId;
  }

  onTarifaSaved() {
    this.showEditForm = false;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getById(id).subscribe({ next: d => this.detail.set(d) });
  }

  onModalSaved() {
    this.onTarifaSaved();
  }

  statusChipClasses(isActive: boolean): string {
    const base = 'inline-block py-[3px] px-2.5 rounded-lg text-[11px] font-bold border';
    return isActive
      ? `${base} bg-sx-green-bg text-sx-green border-sx-border-2`
      : `${base} bg-sx-surface-2 text-sx-text-3 border-sx-border`;
  }

  tabBtnClasses(isActive: boolean): string {
    const base = 'py-2 px-4 pb-[9px] border-none bg-transparent text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all rounded-t-lg focus-visible:outline-none focus-visible:shadow-none';
    return isActive
      ? `${base} text-sx-primary font-semibold border-b-sx-primary`
      : `${base} text-sx-text-2 border-b-transparent hover:text-sx-text hover:bg-sx-surface-2`;
  }

  typeBadgeClasses(type: string): string {
    const base = 'inline-flex items-center py-[3px] px-2.5 rounded-lg text-[0.7rem] font-bold border';
    return type === 'INDEXED'
      ? `${base} bg-sx-primary-bg text-sx-primary-text border-sx-border-2`
      : `${base} bg-sx-surface-2 text-sx-text-2 border-sx-border`;
  }
}
