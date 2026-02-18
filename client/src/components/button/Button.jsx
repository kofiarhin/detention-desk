import './button.styles.scss'

const Button = ({ label, type = 'button', onClick, disabled, variant = 'primary', size = 'md' }) => {
  return (
    <button
      className={`button button-${variant} button-${size}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {label}
    </button>
  )
}

export default Button
