import { buyPiece, lockReason, ownsPiece, piecesForLayer, setPiece, shopPieces, wearPiece, type Outfit, type OutfitLayer, type OutfitPiece } from '@kalku/content';
import { sfx } from '../audio/sound';
import { tr, trf, type StringKey } from '../i18n';
import { heroCanvas, lockText, wardrobeOf } from '../items';
import { loadProgress, saveProgress } from '../progress';
import { confetti, reducedMotion } from './fx';
import './items.css';

/** Pestañas del armario, de lo que más se cambia a lo que menos. */
const TABS: readonly { layer: OutfitLayer; label: StringKey }[] = [
  { layer: 'hat', label: 'outfitHat' },
  { layer: 'back', label: 'outfitBack' },
  { layer: 'clothes', label: 'outfitClothes' },
  { layer: 'accessory', label: 'outfitAccessory' },
  { layer: 'hair', label: 'outfitHair' },
  { layer: 'body', label: 'outfitBody' },
];

export interface WardrobeOptions {
  /** `wardrobe`: ponerse lo que se tiene. `shop`: la tienda del pueblo (comprar con Cifras). */
  mode: 'wardrobe' | 'shop';
  /** Se llama cada vez que cambia lo que lleva puesto (para rehacer el personaje del mapa). */
  onOutfit: (outfit: Outfit) => void;
}

/**
 * Armario y tienda: el personaje en grande arriba y las piezas en tarjetas
 * grandes con su dibujo. Lo que no se tiene sale con candado y el motivo en
 * letra clara («Desde el nivel 5»). En la tienda, tocar una pieza la prueba
 * en el personaje antes de comprarla. Nada de aquí cambia el combate.
 */
export function openWardrobe(container: HTMLElement, options: WardrobeOptions): Promise<void> {
  return new Promise((resolve) => {
    const progress = loadProgress();
    const locale = progress.locale;
    const shop = options.mode === 'shop';
    let tab: OutfitLayer = 'hat';
    /** En la tienda: la pieza que se está probando (aún sin comprar). */
    let trying: OutfitPiece | undefined;

    const root = document.createElement('div');
    root.className = `settings wardrobe${shop ? ' wardrobe-shop' : ''}`;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', tr(shop ? 'shopTitle' : 'wardrobeTitle', locale));
    root.addEventListener('pointerdown', (e) => e.stopPropagation());

    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = tr(shop ? 'shopTitle' : 'wardrobeTitle', locale);
    const note = document.createElement('p');
    note.className = 'panel-note';
    note.textContent = tr(shop ? 'shopHello' : 'wardrobeNote', locale);
    const stage = document.createElement('div');
    stage.className = 'wardrobe-stage';
    const coins = document.createElement('p');
    coins.className = 'wardrobe-coins';
    const tabs = document.createElement('div');
    tabs.className = 'wardrobe-tabs';
    tabs.setAttribute('role', 'tablist');
    const grid = document.createElement('div');
    grid.className = 'wardrobe-grid';
    const feedback = document.createElement('p');
    feedback.className = 'panel-feedback';
    feedback.setAttribute('role', 'status');
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'btn btn-primary wardrobe-buy';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn';
    close.textContent = tr('back', locale);
    close.addEventListener('click', () => {
      root.remove();
      resolve();
    });

    const say = (text: string, kind: 'good' | 'bad' | 'info'): void => {
      feedback.textContent = text;
      feedback.dataset.kind = kind;
    };

    /** Lo que se ve en el personaje grande: lo puesto, o la pieza que se prueba. */
    const shown = (): Outfit => (trying ? setPiece(progress.outfit, trying.layer, trying.id) : progress.outfit);

    const renderStage = (): void => {
      const big = heroCanvas(shown(), 'wardrobe-hero');
      if (!reducedMotion()) big.classList.add('wardrobe-hero-pop');
      stage.replaceChildren(big);
      coins.textContent = `● ${trf('shopYouHave', locale, { n: progress.coins })}`;
    };

    const card = (piece: OutfitPiece): HTMLButtonElement => {
      const state = wardrobeOf(progress);
      const owned = ownsPiece(piece, state);
      const lock = lockReason(piece, state);
      const wearing = progress.outfit[piece.layer] === piece.id;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wardrobe-card';
      b.dataset.owned = String(owned);
      // En la tienda, lo que se puede comprar ya no sale apagado; solo lo que pide nivel o gema.
      b.dataset.locked = String(!owned && !(shop && lock?.kind === 'price'));
      b.dataset.wearing = String(wearing);
      if (trying?.id === piece.id) b.dataset.trying = 'true';
      b.setAttribute('aria-pressed', String(wearing));
      const name = document.createElement('span');
      name.className = 'wardrobe-card-name';
      name.textContent = piece.name[locale];
      const status = document.createElement('span');
      status.className = 'wardrobe-card-status';
      if (wearing) status.textContent = `✓ ${tr('wardrobeWearing', locale)}`;
      else if (owned) status.textContent = shop ? tr('shopOwned', locale) : '';
      else if (lock) status.textContent = `${lock.kind === 'price' ? '●' : '🔒'} ${lock.kind === 'price' && shop ? `${lock.price}` : lockText(lock, locale)}`;
      b.append(heroCanvas(setPiece(progress.outfit, piece.layer, piece.id), 'wardrobe-card-art'), name, status);
      b.addEventListener('click', () => choose(piece));
      return b;
    };

    const renderGrid = (): void => {
      const pieces = shop ? shopPieces() : piecesForLayer(tab);
      grid.replaceChildren(...pieces.map(card));
      for (const t of tabs.querySelectorAll<HTMLButtonElement>('button')) t.setAttribute('aria-selected', String(t.dataset.layer === tab));
      renderBuy();
    };

    const renderBuy = (): void => {
      const lock = trying ? lockReason(trying, wardrobeOf(progress)) : undefined;
      // Solo se ofrece comprar lo que ya se puede comprar (sin nivel ni gema pendientes).
      buy.hidden = !shop || lock?.kind !== 'price';
      if (lock?.kind !== 'price') return;
      buy.textContent = trf('shopBuy', locale, { n: lock.price });
      buy.disabled = progress.coins < lock.price;
    };

    const wear = (piece: OutfitPiece): void => {
      const next = wearPiece(progress.outfit, wardrobeOf(progress), piece.id);
      if (!next) return;
      progress.outfit = next;
      saveProgress(progress);
      options.onOutfit(next);
    };

    const choose = (piece: OutfitPiece): void => {
      const state = wardrobeOf(progress);
      const lock = lockReason(piece, state);
      if (ownsPiece(piece, state)) {
        trying = undefined;
        wear(piece);
        sfx('tap');
        say('', 'info');
      } else if (shop) {
        // Probárselo es gratis; comprar lo deja puesto.
        trying = piece;
        if (lock?.kind === 'price') {
          const missing = lock.price - progress.coins;
          say(missing > 0 ? trf('shopNeedCoins', locale, { n: missing }) : `${piece.name[locale]} · ${lock.price} ${tr('coins', locale)}`, missing > 0 ? 'bad' : 'info');
        } else if (lock) {
          say(`🔒 ${lockText(lock, locale)}`, 'info');
        }
      } else if (lock) {
        say(`🔒 ${piece.name[locale]}: ${lockText(lock, locale)}`, 'info');
      }
      renderStage();
      renderGrid();
    };

    buy.addEventListener('click', () => {
      if (!trying) return;
      const result = buyPiece(wardrobeOf(progress), progress.coins, trying.id);
      if (!result.ok) {
        renderBuy();
        return;
      }
      progress.coins = result.coins;
      progress.owned = result.owned;
      const bought = trying;
      trying = undefined;
      wear(bought);
      sfx('chest');
      confetti(40);
      say(tr('shopBought', locale), 'good');
      renderStage();
      renderGrid();
      close.focus();
    });

    if (!shop) {
      for (const { layer, label } of TABS) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'btn btn-small wardrobe-tab';
        t.dataset.layer = layer;
        t.setAttribute('role', 'tab');
        t.textContent = tr(label, locale);
        t.addEventListener('click', () => {
          tab = layer;
          say('', 'info');
          renderGrid();
        });
        tabs.append(t);
      }
    }

    root.append(title, note, stage, ...(shop ? [coins] : [tabs]), grid, feedback, buy, close);
    container.append(root);
    renderStage();
    renderGrid();
    (shop ? close : tabs.querySelector<HTMLButtonElement>('button'))?.focus();
  });
}
