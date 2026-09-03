import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ServicesService } from '../../../core/services/services.service';
import { ServiceGroup, ServiceTariff } from '../../../core/models/service.model';
import { TarifaFormComponent } from '../modals/tarifa-form/tarifa-form';
import { ProductoLuzFormComponent } from '../modals/producto-luz-form/producto-luz-form';
import { BoeLuzFormComponent } from '../modals/boe-luz-form/boe-luz-form';
import { OmieLuzFormComponent } from '../modals/omie-luz-form/omie-luz-form';
import { SuminexLoader } from '../../../shared/components/suminex-loader/suminex-loader';
import { ButtonModule } from 'primeng/button';
import { DataTableComponent, DataTableColumn } from '../../../shared/data-table/data-table';

@Component({
  selector: 'app-services-shell',
  standalone: true,
  imports: [
    TarifaFormComponent, ProductoLuzFormComponent, BoeLuzFormComponent, OmieLuzFormComponent, SuminexLoader,
    ButtonModule, DataTableComponent,
  ],
  templateUrl: './services-shell.html',
  host: { class: 'block' },
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

  typeTabClasses(active: boolean): string {
    const base = 'inline-flex items-center gap-[7px] py-2 px-4 pb-[9px] border-none bg-transparent text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all rounded-t-md';
    return active
      ? `${base} text-(--tc) font-semibold border-b-(--tc)`
      : `${base} text-sx-text-2 border-b-transparent hover:text-sx-text hover:bg-sx-surface-2`;
  }

  tarifaTabClasses(active: boolean): string {
    const base = 'py-1.25 px-3.5 rounded-full border-[1.5px] text-xs font-semibold font-mono cursor-pointer transition-all';
    return active
      ? `${base} bg-sx-primary-btn border-sx-primary-btn text-white`
      : `${base} border-sx-border bg-transparent text-sx-text-2 hover:border-sx-border-2 hover:text-sx-primary`;
  }

  contentTabClasses(active: boolean): string {
    const base = 'py-[7px] px-3.5 pb-2 border-none bg-transparent text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all rounded-t-md';
    return active
      ? `${base} text-sx-primary font-semibold border-b-sx-primary`
      : `${base} text-sx-text-2 border-b-transparent hover:text-sx-text hover:bg-sx-surface-2`;
  }

  productTypeBadgeClasses(type: string): string {
    const base = 'inline-block py-0.5 px-1.75 rounded-[5px] text-[11px] font-bold';
    return type === 'INDEXED'
      ? `${base} bg-sx-primary-bg text-sx-primary-text`
      : `${base} bg-sx-surface-2 text-sx-text-2`;
  }

  statusChipClasses(isOn: boolean): string {
    const base = 'inline-block py-0.5 px-2 rounded-full text-[11px] font-semibold border';
    return isOn
      ? `${base} bg-sx-green-bg text-sx-green border-sx-border-2`
      : `${base} bg-sx-surface-2 text-sx-text-3 border-sx-border`;
  }

  pgValClasses(isBoe: boolean): string {
    const base = 'text-xs font-semibold tabular-nums rounded-md py-1.25 px-2 w-full text-center';
    return isBoe
      ? `${base} text-sx-primary-text bg-sx-primary-bg border border-sx-border-2`
      : `${base} text-sx-text bg-sx-surface border border-sx-border`;
  }

  commissionLabel(pct: number | null | undefined): string {
    return pct !== null && pct !== undefined ? `Comisión: ${pct}%` : 'Comisión: —';
  }

  commissionBadgeClasses(pct: number | null | undefined): string {
    const base = 'ml-auto inline-block py-0.5 px-2 rounded-full text-[10px] font-bold tracking-wide';
    return pct !== null && pct !== undefined
      ? `${base} bg-sx-green-bg text-sx-green`
      : `${base} bg-sx-surface-2 text-sx-text-3`;
  }
}
