import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ServicesService } from '../../../core/services/services.service';
import { ProvidersService } from '../../../core/services/providers.service';
import { ServiceGroup, ServiceTariff, ServiceTariffProduct, GanaSyncResult } from '../../../core/models/service.model';
import { TarifaFormComponent } from '../modals/tarifa-form/tarifa-form';
import { ProductoLuzFormComponent } from '../modals/producto-luz-form/producto-luz-form';
import { BoeLuzFormComponent } from '../modals/boe-luz-form/boe-luz-form';
import { OmieLuzFormComponent } from '../modals/omie-luz-form/omie-luz-form';
import { NuevoServicioFormComponent } from '../modals/nuevo-servicio-form/nuevo-servicio-form';
import { BasikoLoader } from '../../../shared/components/basiko-loader/basiko-loader';
import { ButtonModule } from 'primeng/button';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-services-shell',
  standalone: true,
  imports: [
    TarifaFormComponent, ProductoLuzFormComponent, BoeLuzFormComponent, OmieLuzFormComponent, NuevoServicioFormComponent,
    BasikoLoader, ButtonModule, DataTableComponent, Icon,
  ],
  templateUrl: './services-shell.html',
  host: { class: 'block' },
})
export class ServicesShellComponent implements OnInit {
  private svc         = inject(ServicesService);
  private providersSvc = inject(ProvidersService);

  /** Ids de proveedores con integración externa activa (ej. Gana) — para el aviso "Falta tarifa de Gana" */
  integratedProviderIds = signal<Set<string>>(new Set());

  serviceGroups    = signal<ServiceGroup[]>([]);
  activeGroupId    = signal<string | null>(null);
  activeTarifa     = signal<ServiceTariff | null>(null);
  activeContentTab = signal<string>('productos');
  loadingTarifas   = signal(false);

  productColumns: DataTableColumn[] = [
    { key: 'name',       label: 'Nombre' },
    { key: 'type',       label: 'Tipo',       align: 'center' },
    { key: 'commission', label: 'Comisión',   align: 'center' },
    { key: 'provider',   label: 'Proveedor',  align: 'center' },
    { key: 'status',     label: 'Estado',     align: 'center' },
    { key: 'actions',    label: 'Acciones',   align: 'center', width: '110px' },
  ];

  showNewTarifaForm     = false;
  showNewServiceForm    = false;
  showProductoLuz       = false;
  showBoe               = false;
  showOmie              = false;
  editingBoeData: { periods: { period: string; priceKwDay: number }[]; validFrom: string; validUntil?: string | null } | null = null;
  editingOmieData: any = null;

  viewingProduct   = signal<any>(null);
  loadingDetailFor = signal<number | null>(null);
  editingProduct   = signal<any>(null);
  deleteConfirmId       = signal<number | null>(null);
  deleting              = signal(false);

  syncingGana    = signal(false);
  ganaSyncResult = signal<GanaSyncResult | null>(null);
  ganaSyncError  = signal('');

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

  ngOnInit() {
    this.loadServices();
    this.providersSvc.getAll().subscribe({
      next: providers => {
        this.integratedProviderIds.set(new Set(providers.filter(p => p.externalIntegrationCode).map(p => p.id)));
      },
    });
  }

  missingExternalTariff(p: ServiceTariffProduct): boolean {
    return !!p.providerId && this.integratedProviderIds().has(p.providerId) && !p.externalTariffId;
  }

  /** POST /api/admin/gana-tariffs/sync — siempre 200; warnings[] no vacío significa que algo no se sincronizó bien */
  syncGana() {
    if (this.syncingGana()) return;
    this.syncingGana.set(true);
    this.ganaSyncResult.set(null);
    this.ganaSyncError.set('');
    this.svc.syncGanaTariffs().subscribe({
      next: res => {
        this.syncingGana.set(false);
        this.ganaSyncResult.set(res);
        this.loadServices();
      },
      error: (e: any) => {
        this.syncingGana.set(false);
        this.ganaSyncError.set(e?.error?.message ?? 'No se pudo sincronizar con Gana. Inténtalo de nuevo.');
      },
    });
  }

  closeGanaSyncResult() {
    this.ganaSyncResult.set(null);
    this.ganaSyncError.set('');
  }

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

  onServiceSaved() {
    this.showNewServiceForm = false;
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

  typeTabClasses(active: boolean): string {
    const base = 'inline-flex items-center gap-[7px] py-2 px-4 pb-[9px] border-none bg-transparent text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all rounded-t-lg';
    return active
      ? `${base} text-(--tc) font-semibold border-b-(--tc)`
      : `${base} text-sx-text-2 border-b-transparent hover:text-sx-text hover:bg-sx-surface-2`;
  }

  tarifaTabClasses(active: boolean): string {
    const base = 'py-1.25 px-3.5 rounded-lg border-[1.5px] text-xs font-semibold font-mono cursor-pointer transition-all';
    return active
      ? `${base} bg-sx-primary-btn border-sx-primary-btn text-white`
      : `${base} border-sx-border bg-transparent text-sx-text-2 hover:border-sx-border-2 hover:text-sx-primary`;
  }

  contentTabClasses(active: boolean): string {
    const base = 'py-[7px] px-3.5 pb-2 border-none bg-transparent text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all rounded-t-lg';
    return active
      ? `${base} text-sx-primary font-semibold border-b-sx-primary`
      : `${base} text-sx-text-2 border-b-transparent hover:text-sx-text hover:bg-sx-surface-2`;
  }

  productTypeBadgeClasses(type: string): string {
    const base = 'inline-block py-0.5 px-1.75 rounded-lg text-[11px] font-bold';
    return type === 'INDEXED'
      ? `${base} bg-sx-primary-bg text-sx-primary-text`
      : `${base} bg-sx-surface-2 text-sx-text-2`;
  }

  statusChipClasses(isOn: boolean): string {
    const base = 'inline-block py-0.5 px-2 rounded-lg text-[11px] font-semibold border';
    return isOn
      ? `${base} bg-sx-green-bg text-sx-green border-sx-border-2`
      : `${base} bg-sx-surface-2 text-sx-text-3 border-sx-border`;
  }

  pgValClasses(isBoe: boolean): string {
    const base = 'text-xs font-semibold tabular-nums rounded-lg py-1.25 px-2 w-full text-center';
    return isBoe
      ? `${base} text-sx-primary-text bg-sx-primary-bg border border-sx-border-2`
      : `${base} text-sx-text bg-sx-surface border border-sx-border`;
  }

  commissionLabel(amount: number | null | undefined): string {
    return amount !== null && amount !== undefined ? `Comisión: ${amount} €` : 'Comisión: —';
  }

  commissionBadgeClasses(amount: number | null | undefined): string {
    const base = 'inline-block py-0.5 px-2 rounded-lg text-[10px] font-bold tracking-wide';
    return amount !== null && amount !== undefined
      ? `${base} bg-sx-green-bg text-sx-green`
      : `${base} bg-sx-surface-2 text-sx-text-3`;
  }
}
