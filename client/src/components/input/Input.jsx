import './input.styles.scss'

const Input = ({ id, label, type = 'text', name, value, onChange, required = false, placeholder }) => {
  return (
    <label className="input-group" htmlFor={id}>
      <span className="input-label">{label}</span>
      <input
        className="input-field"
        id={id}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  )
}

export default Input
