import { useEffect, useState } from 'react'
import FileUploadField from '../components/FileUploadField'
import QuizInput from '../components/QuizInput'
import { firebaseConfigured } from '../lib/firebase'
import { activateQuiz, createQuiz, ensureParticipantSession, subscribeToQuizzes } from '../lib/quizData'
import { parseQuizFile } from '../lib/quizImport'
import type { Quiz } from '../lib/quizTypes'

function AdminPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'publish'>('create')
  const [quizName, setQuizName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!firebaseConfigured) return

    let isMounted = true
    let unsubscribe: (() => void) | undefined

    ensureParticipantSession()
      .then((uid) => {
        if (!isMounted) return
        setOwnerId(uid)
        unsubscribe = subscribeToQuizzes((availableQuizzes) => {
          setQuizzes(availableQuizzes)
          setSelectedQuizId((current) => current || availableQuizzes[0]?.id || '')
        }, (error) => setErrorMessage(error.message))
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Could not connect to Firebase.')
      })

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedQuizName = quizName.trim()
    const allowedExtensions = ['.xlsx', '.csv']
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
      setErrorMessage('Unsupported file type. Please upload an .xlsx or .csv file.')
      setSuccessMessage('')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('File is too large. Please upload a file smaller than 5MB.')
      setSuccessMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const importedQuiz = await parseQuizFile(selectedFile)

      if (firebaseConfigured) {
        if (!ownerId) throw new Error('The Firebase session is not ready. Reload and try again.')
        await createQuiz(trimmedQuizName, importedQuiz, ownerId)
        setSuccessMessage(`Quiz “${trimmedQuizName}” was saved and is now active for participants.`)
      } else {
        setSuccessMessage(`Quiz “${trimmedQuizName}” passed validation. Configure Firebase to save it.`)
      }

      setQuizName('')
      setSelectedFile(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not import this quiz file.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublishSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId)

    if (!selectedQuiz) {
      setErrorMessage('Please choose a quiz to display to participants.')
      setSuccessMessage('')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      if (!ownerId) throw new Error('The Firebase session is not ready. Reload and try again.')
      await activateQuiz(selectedQuiz.id, selectedQuiz.title, ownerId)
      setSuccessMessage(`Quiz “${selectedQuiz.title}” is now active for participants.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not activate this quiz.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!firebaseConfigured) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <div className="admin-panel__header">
            <p className="admin-panel__eyebrow">Admin dashboard</p>
            <h1>Firebase configuration required</h1>
          </div>
          <div className="form-alert form-alert--error" role="alert">
            Add all Firebase web app values to .env.local, then restart the development server.
          </div>
        </section>
      </main>
    )
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
            Select active quiz
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

            <a
              href={`${import.meta.env.BASE_URL}quiz-template.xlsx`}
              download="quiz-template.xlsx"
              className="admin-form__template"
            >
              Download Excel template
            </a>

            <FileUploadField
              label="Excel file"
              accept=".xlsx,.csv"
              selectedFileName={selectedFile?.name}
              onChange={setSelectedFile}
              helperText="Accepted: .xlsx, .csv (max 5MB)"
            />

            <button type="submit" className="admin-form__submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save quiz'}
            </button>
          </form>
        ) : (
            <form className="admin-form" onSubmit={handlePublishSubmit}>
            <label className="quiz-input">
              <span className="quiz-input__label">Select quiz</span>
              <select
                value={selectedQuizId}
                onChange={(event) => setSelectedQuizId(event.target.value)}
              >
                {quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="admin-form__submit" disabled={isSubmitting || quizzes.length === 0}>
              {isSubmitting ? 'Activating…' : 'Make active quiz'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default AdminPage
