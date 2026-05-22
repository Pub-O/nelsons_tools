import { InventoryProduct } from '../../types';
import { formatStockTargetUnit } from '../../utils';
import { EmptyState } from '../shared/EmptyState';

export function Shopping({ lowStock }: { lowStock: InventoryProduct[] }) {
  return (
    <section className="section">
      <h2>Einkauf</h2>
      <div className="action-list">
        {lowStock.length === 0 && <EmptyState text="Keine niedrigen Bestände." />}
        {lowStock.map((product) => (
          <article className="list-row" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>
                {Math.max(0, product.target - product.current)} {formatStockTargetUnit(product)} bis Zielbestand
              </span>
            </div>
            <input type="checkbox" aria-label={`${product.name} erledigt`} />
          </article>
        ))}
      </div>
    </section>
  );
}
