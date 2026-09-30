import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { firebaseConfigured } from '../lib/firebase'
import {
  ensureParticipantSession,
  saveQuizCompletion,
  submitQuizAnswer,
  subscribeToActiveQuiz,
} from '../lib/quizData'
import { calculateQuizScore } from '../lib/quizScoring'
import type { Quiz, QuizQuestion } from '../lib/quizTypes'

const demoQuestions: QuizQuestion[] = [
  {
    id: 1,
    prompt: 'Which food is traditionally known as a staple grain in many Asian cuisines?',
    options: ['Rice', 'Coconut', 'Avocado', 'Cinnamon'],
  },
  {
    id: 2,
    prompt: 'Which fruit is commonly used to make guacamole?',
    options: ['Mango', 'Avocado', 'Pineapple', 'Papaya'],
  },
  {
    id: 3,
    prompt: 'What is the main ingredient in a classic margherita pizza?',
    options: ['Beef', 'Tomato and mozzarella', 'Chicken', 'Seafood'],
  },
  {
    id: 4,
    prompt: 'Which vegetable is usually roasted and served as fries?',
    options: ['Broccoli', 'Sweet potato', 'Cabbage', 'Carrot'],
  },
  {
    id: 5,
    prompt: 'Which of these is a fermented dairy food?',
    options: ['Yogurt', 'Butter', 'Cheddar', 'Cream'],
  },
  {
    id: 6,
    prompt: 'Which cuisine is most closely associated with tacos and burritos?',
    options: ['Italian', 'Mexican', 'Japanese', 'Indian'],
  },
  {
    id: 7,
    prompt: 'What is the primary ingredient in hummus?',
    options: ['Lentils', 'Chickpeas', 'Black beans', 'Peas'],
  },
  {
    id: 8,
    prompt: 'Which herb is commonly used in pesto sauce?',
    options: ['Basil', 'Mint', 'Parsley', 'Coriander'],
  },
]

const pageSize = 1
const QUIZ_STORAGE_KEY = 'participant-quiz-progress'
const QUIZ_RESULT_KEY = 'participant-quiz-result'
const DEMO_QUIZ_ID = 'demo-healthy-food-choices'

function loadSavedProgress() {
  try {
    const savedProgress = localStorage.getItem(QUIZ_STORAGE_KEY)

    if (!savedProgress) {
      return { quizId: undefined, currentPage: 0, selectedAnswers: {} as Record<number, number> }
    }

    return JSON.parse(savedProgress) as {
      quizId?: string
      currentPage: number
      selectedAnswers: Record<number, number>
    }
  } catch {
    return { quizId: undefined, currentPage: 0, selectedAnswers: {} as Record<number, number> }
  }
}

function saveProgress(quizId: string, currentPage: number, selectedAnswers: Record<number, number>) {
  localStorage.setItem(
    QUIZ_STORAGE_KEY,
    JSON.stringify({
      quizId,
      currentPage,
      selectedAnswers,
    }),
  )
}

function ParticipantQuizPage() {
  const navigate = useNavigate()
  const savedProgress = useMemo(() => loadSavedProgress(), [])
  const [currentPage, setCurrentPage] = useState(savedProgress.currentPage)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    savedProgress.selectedAnswers,
  )
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null)
  const [clockNow, setClockNow] = useState(0)
  const [participantId, setParticipantId] = useState('')
  const [isLoading, setIsLoading] = useState(firebaseConfigured)
  const [isProgressReady, setIsProgressReady] = useState(!firebaseConfigured)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!firebaseConfigured) {
      setIsProgressReady(true)
      setIsLoading(false)
      return
    }

    let unsubscribe: (() => void) | undefined
    let isMounted = true

    ensureParticipantSession()
      .then((uid) => {
        if (!isMounted) return
        setParticipantId(uid)
        unsubscribe = subscribeToActiveQuiz((quiz, endsAt) => {
          setActiveQuiz(quiz)
          setTimerEndsAt(endsAt)
          if (endsAt !== null) setClockNow(Date.now())

          if (quiz?.id !== savedProgress.quizId) {
            setCurrentPage(0)
            setSelectedAnswers({})
          }

          setIsProgressReady(true)
        }, (error) => setErrorMessage(error.message))
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Could not connect to Firebase.')
      })
      .finally(() => setIsLoading(false))

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (timerEndsAt === null) return

    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [timerEndsAt])

  const questions = activeQuiz?.questions ?? (firebaseConfigured ? [] : demoQuestions)
  const totalPages = Math.ceil(questions.length / pageSize)

  useEffect(() => {
    if (!isProgressReady || (firebaseConfigured && !activeQuiz)) return

    saveProgress(activeQuiz?.id ?? DEMO_QUIZ_ID, currentPage, selectedAnswers)
  }, [activeQuiz, currentPage, isProgressReady, selectedAnswers])

  const currentQuestion = questions[currentPage]

  const answeredCount = Object.keys(selectedAnswers).length
  const remainingSeconds = timerEndsAt === null
    ? 0
    : Math.max(0, Math.ceil((timerEndsAt - clockNow) / 1000))
  const timerHours = Math.floor(remainingSeconds / 3600)
  const timerMinutes = Math.floor((remainingSeconds % 3600) / 60)
  const timerSeconds = remainingSeconds % 60
  const timerDisplay = timerHours > 0
    ? `${String(timerHours).padStart(2, '0')}:${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`
    : `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    const nextAnswers = {
      ...selectedAnswers,
      [questionId]: optionIndex,
    }
    setSelectedAnswers(nextAnswers)
    saveProgress(activeQuiz?.id ?? DEMO_QUIZ_ID, currentPage, nextAnswers)
  }

  const handlePrev = () => {
    const previousPage = Math.max(currentPage - 1, 0)
    setCurrentPage(previousPage)
    saveProgress(activeQuiz?.id ?? DEMO_QUIZ_ID, previousPage, selectedAnswers)
  }

  const handleNext = async () => {
    const selectedOptionIndex = selectedAnswers[currentQuestion.id]

    if (activeQuiz && participantId && selectedOptionIndex !== undefined) {
      setIsSubmittingAnswer(true)
      setErrorMessage('')

      try {
        await submitQuizAnswer(activeQuiz, participantId, currentQuestion.id, selectedOptionIndex)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not save your answer.')
        setIsSubmittingAnswer(false)
        return
      }

      setIsSubmittingAnswer(false)
    }

    if (currentPage === totalPages - 1) {
      if (activeQuiz && participantId) {
        const score = calculateQuizScore(questions, selectedAnswers)

        try {
          await saveQuizCompletion(
            activeQuiz.id,
            participantId,
            score.profile?.animalType ?? null,
            score.percentage,
          )
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not record quiz completion.')
          return
        }
      }

      const resultSnapshot = {
        answers: selectedAnswers,
        totalQuestions: questions.length,
        quizId: activeQuiz?.id,
        quizTitle: activeQuiz?.title ?? 'Healthy Food Choices',
        questions,
      }

      localStorage.setItem(QUIZ_RESULT_KEY, JSON.stringify(resultSnapshot))
      localStorage.removeItem(QUIZ_STORAGE_KEY)

      navigate('/quiz/result', {
        state: resultSnapshot,
      })
      return
    }

    const nextPage = Math.min(currentPage + 1, totalPages - 1)
    setCurrentPage(nextPage)
    saveProgress(activeQuiz?.id ?? DEMO_QUIZ_ID, nextPage, selectedAnswers)
  }

  const isLastPage = currentPage === totalPages - 1

  if (isLoading) {
    return <main className="participant-page"><section className="participant-shell"><p>Connecting to the quiz…</p></section></main>
  }

  if (!currentQuestion) {
    return (
      <main className="participant-page">
        <section className="participant-shell">
          <header className="participant-header">
            <div>
              <p className="participant-header__eyebrow">Participant quiz</p>
              <h1>{firebaseConfigured ? 'No active quiz' : 'Quiz unavailable'}</h1>
            </div>
          </header>
          {errorMessage ? <div className="form-alert form-alert--error" role="alert">{errorMessage}</div> : null}
          <p>{firebaseConfigured ? 'The quiz host has not published a quiz yet.' : 'No quiz questions are available.'}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="participant-page">
      <section className="participant-shell">
        <header className="participant-header">
          <div>
            <p className="participant-header__eyebrow">Participant quiz</p>
            <h1>{activeQuiz?.title ?? 'Healthy Food Choices'}</h1>
          </div>
          <div className="participant-progress">
            <span>{answeredCount} answered</span>
          </div>
          {timerEndsAt !== null ? (
            <div className="participant-timer" aria-label={`Time remaining ${timerDisplay}`}>
              <span>Time remaining</span>
              <strong>{timerDisplay}</strong>
            </div>
          ) : null}
        </header>

        {errorMessage ? <div className="form-alert form-alert--error" role="alert">{errorMessage}</div> : null}

        <div className="participant-progress-bar" aria-hidden="true">
          <span style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>

        <div className="participant-questions">
          <article key={currentQuestion.id} className="question-card">
            <p className="question-card__label">Question {currentQuestion.id}</p>
            <h2>{currentQuestion.prompt}</h2>

            <div
              className="question-options"
              role="radiogroup"
              aria-label={`Question ${currentQuestion.id}`}
            >
              {currentQuestion.options.map((option, index) => {
                const selected = selectedAnswers[currentQuestion.id] === index

                return (
                  <label
                    key={option}
                    className={`option-button ${selected ? 'option-button--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={selected}
                      onChange={() => handleSelectOption(currentQuestion.id, index)}
                    />
                    <span className="option-button__letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </label>
                )
              })}
            </div>
          </article>
        </div>

        <div className="participant-pagination">
          <button
            type="button"
            className="participant-pagination__button participant-pagination__button--secondary"
            onClick={handlePrev}
            disabled={currentPage === 0}
          >
            Prev
          </button>

          <button
            type="button"
            className="participant-pagination__button participant-pagination__button--primary"
            onClick={handleNext}
            disabled={isSubmittingAnswer}
          >
            {isSubmittingAnswer ? 'Saving…' : isLastPage ? 'Finish' : 'Next'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default ParticipantQuizPage
