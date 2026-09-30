import { useEffect, useState } from 'react'
import FileUploadField from '../components/FileUploadField'
import QuizInput from '../components/QuizInput'
import { firebaseConfigured } from '../lib/firebase'
import {
  activateQuiz,
  createQuiz,
  ensureParticipantSession,
  setActiveQuizTimer,
  subscribeToActiveQuiz,
  subscribeToQuizzes,
} from '../lib/quizData'
import { parseQuizFile } from '../lib/quizImport'
import type { Quiz } from '../lib/quizTypes'

function AdminPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'publish' | 'timer'>('create')
  const [quizName, setQuizName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [activeQuizId, setActiveQuizId] = useState('')
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null)
  const [timerAmount, setTimerAmount] = useState('20')
  const [timerUnit, setTimerUnit] = useState<'minutes' | 'hours'>('minutes')
  const [clockNow, setClockNow] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!firebaseConfigured) return

    let isMounted = true
    let unsubscribeQuizzes: (() => void) | undefined
    let unsubscribeActiveQuiz: (() => void) | undefined

    ensureParticipantSession()
      .then((uid) => {
        if (!isMounted) return
        setOwnerId(uid)
        unsubscribeQuizzes = subscribeToQuizzes((availableQuizzes) => {
          setQuizzes(availableQuizzes)
          setSelectedQuizId((current) => current || availableQuizzes[0]?.id || '')
        }, (error) => setErrorMessage(error.message))
        unsubscribeActiveQuiz = subscribeToActiveQuiz((quiz, endsAt) => {
          setActiveQuizId(quiz?.id ?? '')
          setTimerEndsAt(endsAt)
          if (endsAt !== null) setClockNow(Date.now())
        }, (error) => setErrorMessage(error.message))
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Could not connect to Firebase.')
      })

    return () => {
      isMounted = false
      unsubscribeQuizzes?.()
      unsubscribeActiveQuiz?.()
    }
  }, [])

  useEffect(() => {
    if (timerEndsAt === null) return

    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [timerEndsAt])

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
        setSuccessMessage(`Quiz “${trimmedQuizName}” was saved. Select it in the second tab to make it active.`)
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

  const handleTimerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(timerAmount)

    if (!activeQuizId) {
      setErrorMessage('Activate a quiz before starting its countdown.')
      setSuccessMessage('')
      return
    }

    if (!Number.isInteger(amount) || amount < 1) {
      setErrorMessage('Enter a whole number greater than zero.')
      setSuccessMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const secondsPerUnit = timerUnit === 'hours' ? 3600 : 60
      await setActiveQuizTimer(amount * secondsPerUnit, ownerId)
      setSuccessMessage(`A ${amount} ${timerUnit} countdown is running for the active quiz.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not start the quiz countdown.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearTimer = async () => {
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await setActiveQuizTimer(null, ownerId)
      setSuccessMessage('The quiz countdown has been cleared.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not clear the quiz countdown.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const remainingSeconds = timerEndsAt === null
    ? 0
    : Math.max(0, Math.ceil((timerEndsAt - clockNow) / 1000))
  const timerHours = Math.floor(remainingSeconds / 3600)
  const timerMinutes = Math.floor((remainingSeconds % 3600) / 60)
  const timerSeconds = remainingSeconds % 60
  const timerDisplay = timerHours > 0
    ? `${String(timerHours).padStart(2, '0')}:${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`
    : `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`

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
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'timer'}
            className={activeTab === 'timer' ? 'admin-tab admin-tab--active' : 'admin-tab'}
            onClick={() => setActiveTab('timer')}
          >
            Quiz timer
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
        ) : activeTab === 'publish' ? (
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
        ) : (
          <form className="admin-form" onSubmit={handleTimerSubmit}>
            <p className="admin-timer__context">
              Active quiz: <strong>{quizzes.find((quiz) => quiz.id === activeQuizId)?.title ?? 'None selected'}</strong>
            </p>

            <div className="admin-timer__fields">
              <label className="quiz-input">
                <span className="quiz-input__label">Duration</span>
                <input
                  aria-label="Timer duration"
                  type="number"
                  min="1"
                  step="1"
                  value={timerAmount}
                  onChange={(event) => setTimerAmount(event.target.value)}
                  required
                />
              </label>
              <label className="quiz-input">
                <span className="quiz-input__label">Unit</span>
                <select
                  value={timerUnit}
                  onChange={(event) => setTimerUnit(event.target.value as 'minutes' | 'hours')}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </label>
            </div>

            {timerEndsAt !== null ? (
              <div className="admin-timer__status" role="status">
                <span>{remainingSeconds > 0 ? 'Time remaining' : 'Countdown ended'}</span>
                <strong>{timerDisplay}</strong>
              </div>
            ) : null}

            <button type="submit" className="admin-form__submit" disabled={isSubmitting || !activeQuizId}>
              {isSubmitting ? 'Starting…' : 'Start countdown'}
            </button>

            {timerEndsAt !== null ? (
              <button type="button" className="admin-timer__clear" onClick={handleClearTimer} disabled={isSubmitting}>
                Clear timer
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  )
}

export default AdminPage
