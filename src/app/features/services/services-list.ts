import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { ServicesService } from '../../core/services/services.service';
import { ServiceListItem, ServiceType } from '../../core/models/service.model';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ServiceFormComponent } from './service-form';
import { ServiceDetailComponent } from './service-detail';

interface TypeTab {
  label: string;
  value: ServiceType | null;
  icon:  string;
  color: string;
  bg:    string;
}

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [
    DatePipe,
    ButtonModule, TagModule, ToastModule, ConfirmDialogModule, TooltipModule,
    SkeletonModule, ServiceFormComponent, ServiceDetailComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <!-- ── Header ── -->
    <div class="page-header">
      <div>
        <h1>Servicios / Ofertas</h1>
        <p class="page-subtitle">Gestiona las tarifas de luz, gas, móvil e internet</p>
      </div>
      <p-button label="Nueva oferta" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <!-- ── Type chips ── -->
    <div class="type-bar">
      <div class="type-chips">
        @for (tab of typeTabs; track tab.value) {
          <button class="type-chip" [class.active]="activeType === tab.value"
                  (click)="setType(tab.value)">
            <i [class]="'pi ' + tab.icon" [style.color]="tab.color"></i>
            {{ tab.label }}
            @if (counts[tab.value ?? 'ALL'] !== undefined) {
              <span class="chip-count">{{ counts[tab.value ?? 'ALL'] }}</span>
            }
          </button>
        }
      </div>
      <div class="status-chips">
        <button class="status-chip" [class.active]="activeStatus === null"  (click)="setStatus(null)">Todas</button>
        <button class="status-chip active-chip" [class.active]="activeStatus === true"  (click)="setStatus(true)">Activas</button>
        <button class="status-chip inactive-chip" [class.active]="activeStatus === false" (click)="setStatus(false)">Inactivas</button>
      </div>
    </div>

    @if (loadError) {
      <div class="load-error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="load-error-retry" (click)="load()"><i class="pi pi-refresh"></i> Reintentar</button>
      </div>
    }

    <!-- ── List card ── -->
    <div class="list-card">

      @if (loading()) {
        <div class="skeleton-list">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-row">
              <p-skeleton shape="circle" size="36px" />
              <p-skeleton height="14px" width="35%" borderRadius="6px" />
              <p-skeleton height="14px" width="12%" borderRadius="6px" />
              <p-skeleton height="14px" width="18%" borderRadius="6px" />
              <p-skeleton height="22px" width="60px" borderRadius="10px" />
            </div>
          }
        </div>
      } @else if (filtered.length === 0) {
        <div class="empty-state">
          <i class="pi pi-bolt"></i>
          <span>No hay ofertas con los filtros aplicados</span>
        </div>
      } @else {

        <!-- List header -->
        <div class="list-header">
          <span>Oferta</span>
          <span>Proveedor</span>
          <span>Código</span>
          <span>Vigencia</span>
          <span class="col-center">Estado</span>
          <span class="col-right">Acciones</span>
        </div>

        @for (s of filtered; track s.id) {
          <div class="list-row">
            <!-- Name + icon -->
            <div class="name-cell">
              <div class="type-dot" [style.background]="typeBg(s.serviceType)">
                <i [class]="'pi ' + typeIcon(s.serviceType)" [style.color]="typeColor(s.serviceType)"></i>
              </div>
              <span class="service-name">{{ s.name }}</span>
            </div>
            <!-- Provider -->
            <span class="cell-muted">{{ s.providerName }}</span>
            <!-- Tariff code -->
            <span class="tariff-code">{{ s.tariffCode || '—' }}</span>
            <!-- Validity -->
            <span class="cell-muted cell-sm">
              {{ s.validFrom | date:'dd/MM/yy' }}
              @if (s.validUntil) { → {{ s.validUntil | date:'dd/MM/yy' }} }
              @else { <span class="dim">→ Sin fin</span> }
            </span>
            <!-- Active tag -->
            <div class="col-center">
              <p-tag [value]="s.isActive ? 'Activo' : 'Inactivo'"
                     [severity]="s.isActive ? 'success' : 'danger'" />
            </div>
            <!-- Actions -->
            <div class="col-right row-actions">
              <button class="icon-btn" (click)="view(s)" pTooltip="Ver detalle">
                <i class="pi pi-eye"></i>
              </button>
              <button class="icon-btn" (click)="edit(s)" pTooltip="Editar">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="icon-btn icon-btn-danger" (click)="confirmDelete(s)" pTooltip="Eliminar">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        }
      }
    </div>

    @if (detailVisible && viewItem) {
      <app-service-detail [item]="viewItem" (closed)="detailVisible = false" />
    }

    @if (formVisible) {
      <app-service-form
        [editId]="editId"
        [editItem]="editItem"
        (saved)="onSaved()"
        (cancelled)="formVisible = false"
      />
    }
  `,
  styles: [`
    /* ── Header ── */
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.75rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--sx-border);
    }
    .page-header h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .page-subtitle { color: var(--sx-text-2); font-size: 0.83rem; margin-top: 0.25rem; }

    /* ── Type bar ── */
    .type-bar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap;
    }

    .type-chips { display: flex; gap: 6px; flex-wrap: wrap; }

    .type-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0.45rem 0.9rem; border-radius: 10px;
      border: 1px solid var(--sx-border);
      background: var(--sx-surface);
      color: var(--sx-text-2); font-size: 0.82rem; font-weight: 500;
      cursor: pointer; transition: all 140ms ease;
    }
    .type-chip .pi { font-size: 0.78rem; }
    .type-chip:hover { border-color: var(--sx-primary); color: var(--sx-text); }
    .type-chip.active {
      background: var(--sx-primary); border-color: var(--sx-primary);
      color: #fff; font-weight: 600;
    }
    .type-chip.active .pi { color: #fff !important; }
    .chip-count {
      background: rgba(255,255,255,0.2); color: inherit;
      font-size: 0.7rem; font-weight: 700; border-radius: 20px;
      padding: 1px 6px; min-width: 18px; text-align: center;
    }
    .type-chip:not(.active) .chip-count {
      background: var(--sx-surface-2); color: var(--sx-text-3);
    }

    .status-chips { display: flex; gap: 4px; }
    .status-chip {
      padding: 0.35rem 0.8rem; border-radius: 8px; font-size: 0.78rem; font-weight: 500;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-3); cursor: pointer; transition: all 120ms;
    }
    .status-chip.active      { background: var(--sx-surface-2); color: var(--sx-text); border-color: var(--sx-border-2); }
    .active-chip.active      { background: rgba(52,211,153,0.12); color: #34D399; border-color: rgba(52,211,153,0.3); }
    .inactive-chip.active    { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.3); }

    /* ── List card ── */
    .list-card {
      background: var(--sx-surface);
      border: 1px solid var(--sx-border);
      border-radius: 14px;
      overflow: hidden;
    }

    .list-header {
      display: grid;
      grid-template-columns: 3fr 1.5fr 1fr 2fr 100px 110px;
      gap: 0.5rem; padding: 0.6rem 1.25rem;
      background: var(--sx-surface-2);
      border-bottom: 1px solid var(--sx-border);
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--sx-text-3);
    }
    .col-center { text-align: center; }
    .col-right  { text-align: right; }

    .list-row {
      display: grid;
      grid-template-columns: 3fr 1.5fr 1fr 2fr 100px 110px;
      gap: 0.5rem; padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--sx-border);
      align-items: center; transition: background 120ms;
    }
    .list-row:last-child { border-bottom: none; }
    .list-row:hover { background: var(--sx-surface-2); }

    /* Name cell */
    .name-cell { display: flex; align-items: center; gap: 0.65rem; }
    .type-dot {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .type-dot .pi { font-size: 0.82rem; }
    .service-name { font-weight: 600; font-size: 0.875rem; color: var(--sx-text); }

    .cell-muted { font-size: 0.82rem; color: var(--sx-text-2); }
    .cell-sm    { font-size: 0.78rem; }
    .dim        { color: var(--sx-text-3); }

    .tariff-code {
      font-size: 0.78rem; font-weight: 700; font-family: monospace;
      color: var(--sx-text-2);
      background: var(--sx-surface-2); border: 1px solid var(--sx-border);
      border-radius: 5px; padding: 2px 7px; display: inline-block;
    }

    /* Row actions */
    .row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
    .icon-btn {
      width: 30px; height: 30px; border-radius: 7px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-2); display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 140ms;
    }
    .icon-btn .pi { font-size: 0.75rem; }
    .icon-btn:hover { background: var(--sx-surface-2); color: var(--sx-text); border-color: var(--sx-border-2); }
    .icon-btn-danger:hover { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.3); }

    /* Skeleton */
    .skeleton-list { padding: 0.5rem 1.25rem; }
    .skeleton-row {
      display: flex; align-items: center; gap: 1rem;
      padding: 0.85rem 0; border-bottom: 1px solid var(--sx-border);
    }
    .skeleton-row:last-child { border-bottom: none; }

    /* Empty */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.75rem; padding: 3.5rem; color: var(--sx-text-3);
    }
    .empty-state .pi { font-size: 2rem; }
    .empty-state span { font-size: 0.875rem; }
  `]
})
export class ServicesListComponent implements OnInit {
  private svc     = inject(ServicesService);
  private msg     = inject(MessageService);
  private confirm = inject(ConfirmationService);

  private allServices: ServiceListItem[] = [];
  filtered:   ServiceListItem[] = [];
  loading     = signal(true);
  loadError   = '';
  formVisible = false;
  editId:     number | null          = null;
  editItem:   ServiceListItem | null = null;

  activeType:   ServiceType | null = null;
  activeStatus: boolean | null     = null;

  counts: Record<string, number> = {};

  typeTabs: TypeTab[] = [
    { label: 'Todas',    value: null,       icon: 'pi-th-large', color: 'var(--sx-text-2)', bg: 'transparent' },
    { label: 'Luz',      value: 'LUZ',      icon: 'pi-sun',      color: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
    { label: 'Gas',      value: 'GAS',      icon: 'pi-fire',     color: '#FB923C', bg: 'rgba(249,115,22,0.12)' },
    { label: 'Móvil',    value: 'MOBILE',   icon: 'pi-mobile',   color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
    { label: 'Internet', value: 'INTERNET', icon: 'pi-wifi',     color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError = '';
    const isActive = this.activeStatus !== null ? this.activeStatus : undefined;
    this.svc.getServices().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: groups => {
        const all = groups.flatMap(g => (g.tariffs ?? []).map(t => ({
          id: t.id, name: t.name, tariffCode: t.code,
          serviceType: g.serviceType as any, isActive: true,
          validFrom: null, validUntil: null, providerId: 0, providerName: '',
        })));
        this.allServices = all as any;
        this.buildCounts();
        this.applyFilters();
      },
      error: (e: any) => {
        this.loadError = e?.status === 401
          ? 'Sin autorización. Verifica tu sesión.'
          : 'Error al cargar los servicios. Inténtalo de nuevo.';
      },
    });
  }

  private buildCounts() {
    const all = this.allServices;
    this.counts = {
      ALL:      all.length,
      LUZ:      all.filter(s => s.serviceType === 'LUZ').length,
      GAS:      all.filter(s => s.serviceType === 'GAS').length,
      MOBILE:   all.filter(s => s.serviceType === 'MOBILE').length,
      INTERNET: all.filter(s => s.serviceType === 'INTERNET').length,
    };
  }

  private applyFilters() {
    this.filtered = this.allServices.filter(s => {
      if (this.activeType && s.serviceType !== this.activeType) return false;
      if (this.activeStatus !== null && s.isActive !== this.activeStatus) return false;
      return true;
    });
  }

  setType(t: ServiceType | null)   { this.activeType   = t; this.applyFilters(); }
  setStatus(s: boolean | null)     { this.activeStatus = s; this.load(); }

  typeIcon(t: string): string {
    const m: Record<string,string> = { LUZ:'pi-sun', GAS:'pi-fire', MOBILE:'pi-mobile', INTERNET:'pi-wifi' };
    return m[t] ?? 'pi-bolt';
  }
  typeColor(t: string): string {
    const m: Record<string,string> = { LUZ:'#FACC15', GAS:'#FB923C', MOBILE:'#A78BFA', INTERNET:'#60A5FA' };
    return m[t] ?? '#94a3b8';
  }
  typeBg(t: string): string {
    const m: Record<string,string> = { LUZ:'rgba(250,204,21,0.12)', GAS:'rgba(249,115,22,0.12)', MOBILE:'rgba(167,139,250,0.12)', INTERNET:'rgba(96,165,250,0.12)' };
    return m[t] ?? 'var(--sx-surface-2)';
  }

  viewItem:    ServiceListItem | null = null;
  detailVisible = false;

  view(s: ServiceListItem) { this.viewItem = s; this.detailVisible = true; }
  openNew()                { this.editId = null; this.editItem = null; this.formVisible = true; }
  edit(s: ServiceListItem) { this.editId = s.id; this.editItem = s;   this.formVisible = true; }

  onSaved() {
    this.msg.add({ severity: 'success', summary: 'Guardado', detail: 'Oferta guardada correctamente.' });
    this.formVisible = false;
    this.load();
  }

  confirmDelete(s: ServiceListItem) {
    this.confirm.confirm({
      message:     `¿Eliminar la oferta <strong>${s.name}</strong>?`,
      header:      'Confirmar eliminación',
      icon:        'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.delete(s.id).subscribe({
          next:  () => { this.msg.add({ severity: 'success', summary: 'Eliminado', detail: 'Oferta eliminada.' }); this.load(); },
          error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' }),
        });
      },
    });
  }
}
