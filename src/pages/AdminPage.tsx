import { useMemo, useState } from 'react'
import FileUploadField from '../components/FileUploadField'
import QuizInput from '../components/QuizInput'

const availableQuizzes = ['Health Quiz', 'Exercise Quiz']

function AdminPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'publish'>('create')
  const [quizName, setQuizName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedQuiz, setSelectedQuiz] = useState(availableQuizzes[0])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const createQuizMessage = useMemo(
    () => `Quiz “${quizName.trim() || 'new quiz'}” was created successfully.`,
    [quizName],
  )

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedQuizName = quizName.trim()
    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = selectedFile
      ? selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase()
      : ''

    if (!trimmedQuizName) {
      setErrorMessage('Please enter a quiz name before continuing.')
      setSuccessMessage('')
      return
    }

    if (!selectedFile) {
      setErrorMessage('Please upload an Excel file to continue.')
      setSuccessMessage('')
      return
    }

    if (!allowedExtensions.includes(fileExtension)) {
      setErrorMessage('Unsupported file type. Please upload an .xlsx, .xls, or .csv file.')
      setSuccessMessage('')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('File is too large. Please upload a file smaller than 5MB.')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setSuccessMessage(createQuizMessage)
    setQuizName('')
    setSelectedFile(null)
  }

  const handlePublishSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedQuiz) {
      setErrorMessage('Please choose a quiz to display to participants.')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setSuccessMessage(`Quiz “${selectedQuiz}” is now selected for participants.`)
  }

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <p className="admin-panel__eyebrow">Admin dashboard</p>
          <h1>Quiz settings</h1>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Quiz administration tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            className={activeTab === 'create' ? 'admin-tab admin-tab--active' : 'admin-tab'}
            onClick={() => setActiveTab('create')}
          >
            Create quiz
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'publish'}
            className={activeTab === 'publish' ? 'admin-tab admin-tab--active' : 'admin-tab'}
            onClick={() => setActiveTab('publish')}
          >
            Select quiz
          </button>
        </div>

        {errorMessage ? (
          <div className="form-alert form-alert--error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="form-alert form-alert--success" role="status" aria-live="polite">
            {successMessage}
          </div>
        ) : null}

        {activeTab === 'create' ? (
          <form className="admin-form" onSubmit={handleCreateSubmit} noValidate>
            <QuizInput
              label="Quiz name"
              name="quizName"
              value={quizName}
              onChange={setQuizName}
              placeholder="e.g. JavaScript Fundamentals"
              required
            />

            <FileUploadField
              label="Excel file"
              accept=".xlsx,.xls,.csv"
              selectedFileName={selectedFile?.name}
              onChange={setSelectedFile}
              helperText="Accepted: .xlsx, .xls, .csv (max 5MB)"
            />

            <button type="submit" className="admin-form__submit">
              Save quiz
            </button>
          </form>
        ) : (
          <form className="admin-form" onSubmit={handlePublishSubmit}>
            <label className="quiz-input">
              <span className="quiz-input__label">Select quiz</span>
              <select
                value={selectedQuiz}
                onChange={(event) => setSelectedQuiz(event.target.value)}
              >
                {availableQuizzes.map((quiz) => (
                  <option key={quiz} value={quiz}>
                    {quiz}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="admin-form__submit">
              Show to participant
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default AdminPage
