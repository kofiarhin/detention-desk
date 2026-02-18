import './empty-state.styles.scss';

const EmptyState = ({ message = 'No data yet' }) => {
  return <p className="empty-state">{message}</p>;
};

export default EmptyState;
