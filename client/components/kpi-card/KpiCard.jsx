import './kpi-card.styles.scss';

const KpiCard = ({ label, value }) => {
  return (
    <article className="kpi-card">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </article>
  );
};

export default KpiCard;
