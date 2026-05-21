import { checklistItems } from '../../checklists';

export function Checklists() {
  return (
    <section className="section">
      <h2>Closing</h2>
      <div className="action-list">
        {checklistItems.map((item) => (
          <label className="check-row" key={item}>
            <input type="checkbox" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
