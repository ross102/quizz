type FileUploadFieldProps = {
  label: string
  onChange: (file: File | null) => void
  accept?: string
  helperText?: string
  selectedFileName?: string
}

function FileUploadField({
  label,
  onChange,
  accept = '.xlsx,.csv',
  helperText = 'Supported formats: .xlsx, .csv',
  selectedFileName,
}: FileUploadFieldProps) {
  return (
    <label className="file-upload">
      <span className="file-upload__label">{label}</span>
      <div className="file-upload__field">
        <input
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            onChange(file)
          }}
        />
        <span className={`file-upload__button ${selectedFileName ? 'file-upload__button--selected' : ''}`}>
          {selectedFileName ? 'Change file' : 'Choose file'}
        </span>
      </div>
      <span
        className={`file-upload__meta ${selectedFileName ? 'file-upload__meta--selected' : ''}`}
        aria-live="polite"
      >
        {selectedFileName ? `Selected: ${selectedFileName}` : helperText}
      </span>
    </label>
  )
}

export default FileUploadField
