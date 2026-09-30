import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { calculateQuizScore } from '../lib/quizScoring'
import type { QuizQuestion } from '../lib/quizTypes'

type LocationState = {
  answers?: Record<number, number>
  totalQuestions?: number
  quizTitle?: string
  questions?: QuizQuestion[]
}

const QUIZ_STORAGE_KEY = 'participant-quiz-progress'
const QUIZ_RESULT_KEY = 'participant-quiz-result'

function QuizResultPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const fallbackState = (() => {
    try {
      const savedResult = localStorage.getItem(QUIZ_RESULT_KEY)
      return savedResult ? (JSON.parse(savedResult) as LocationState) : {}
    } catch {
      return {}
    }
  })()

  const state = (location.state ?? fallbackState) as LocationState

  useEffect(() => {
    localStorage.removeItem(QUIZ_STORAGE_KEY)
  }, [])

  const answeredCount = Object.keys(state.answers ?? {}).length
  const totalQuestions = state.totalQuestions ?? 0
  const score = calculateQuizScore(state.questions ?? [], state.answers ?? {})
  const profile = score.profile

  return (
    <main className="participant-page">
      <section className="result-shell">
        <div className="result-header">
          <p className="result-header__eyebrow">Quiz complete</p>
          <h1>{profile ? `You are a ${profile.animalType}` : 'Your quiz result'}</h1>
          {state.quizTitle ? <p>{state.quizTitle}</p> : null}
        </div>

        {profile?.imageUrl ? (
          <div className="result-profile-image">
            <img
              src={profile.imageUrl}
              alt={`${profile.animalType} result`}
              onError={(event) => {
                event.currentTarget.hidden = true
              }}
            />
          </div>
        ) : null}

        <div className="result-score">
          <div>
            <span className="result-score__label">Your score</span>
            <strong>{score.percentage === null ? 'Not scored' : `${Math.round(score.percentage)}%`}</strong>
          </div>
          <div>
            <span className="result-score__label">Points</span>
            <strong>
              {score.points}/{score.maximumPoints}
            </strong>
          </div>
          <div>
            <span className="result-score__label">Answered</span>
            <strong>{answeredCount}/{totalQuestions}</strong>
          </div>
        </div>

        <div className="result-card">
          <h2>{profile ? profile.animalType : score.percentage === null ? 'Scoring unavailable' : 'No matching profile'}</h2>
          <p>
            {profile?.description ??
              (score.percentage === null
                ? 'This quiz does not include maximum scores, so a percentage cannot be calculated.'
                : 'Your score does not fall within a configured result range.')}
          </p>
        </div>

        {profile ? (
          <div className="recommendation-card">
            <h3>Recommendation</h3>
            <p>{profile.recommendation}</p>
          </div>
        ) : null}

        <button
          type="button"
          className="result-button"
          onClick={() => {
            localStorage.removeItem(QUIZ_RESULT_KEY)
            navigate('/quiz')
          }}
        >
          Retake quiz
        </button>
      </section>
    </main>
  )
}

export default QuizResultPage
