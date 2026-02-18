import './loading-spinner.styles.scss';

const LoadingSpinner = () => {
  return (
    <div className="loading-spinner-wrap">
      <div className="loading-spinner" aria-label="Loading" />
    </div>
  );
};

export default LoadingSpinner;
