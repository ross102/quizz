type QuizInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  name?: string
  required?: boolean
}

function QuizInput({
  label,
  value,
  onChange,
  placeholder,
  name,
  required = false,
}: QuizInputProps) {
  return (
    <label className="quiz-input">
      <span className="quiz-input__label">{label}</span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}

export default QuizInput
