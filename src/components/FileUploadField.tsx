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
  accept = '.xlsx,.xls,.csv',
  helperText = 'Supported formats: .xlsx, .xls, .csv',
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
        <span className="file-upload__button">Choose file</span>
      </div>
      <span className="file-upload__meta">
        {selectedFileName ? selectedFileName : helperText}
      </span>
    </label>
  )
}

export default FileUploadField
