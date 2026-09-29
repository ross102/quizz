import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type LocationState = {
  answers?: Record<number, number>
  totalQuestions?: number
}

type ResultProfile = {
  title: string
  description: string
  recommendation: string
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
  const completionRate = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0

  const resultProfile: ResultProfile =
    completionRate >= 80
      ? {
          title: 'Strong engagement',
          description:
            'You completed most of the quiz and showed a thoughtful response pattern. Your answers suggest a high level of interest and attention to the topic.',
          recommendation:
            'Keep building on this momentum by reviewing your responses and exploring the next topic area for deeper learning.',
        }
      : completionRate >= 50
        ? {
            title: 'Good progress',
            description:
              'You completed a solid portion of the assessment and are making meaningful progress. There is room to continue exploring the topic with more focus.',
            recommendation:
              'Spend a little more time on the remaining areas and revisit the questions you were less sure about for a stronger understanding.',
          }
        : {
            title: 'Started well',
            description:
              'You have started the quiz and provided an initial response set. A little more focus will help you complete the journey with more confidence.',
            recommendation:
              'Try a quick review of the topic and return to the remaining questions when you feel ready to continue.',
          }

  return (
    <main className="participant-page">
      <section className="result-shell">
        <div className="result-header">
          <p className="result-header__eyebrow">Quiz complete</p>
          <h1>{resultProfile.title}</h1>
        </div>

        <div className="result-score">
          <div>
            <span className="result-score__label">Progress</span>
            <strong>{Math.round(completionRate)}%</strong>
          </div>
          <div>
            <span className="result-score__label">Answered</span>
            <strong>
              {answeredCount}/{totalQuestions}
            </strong>
          </div>
        </div>

        <div className="result-card">
          <h2>Your result</h2>
          <p>{resultProfile.description}</p>
        </div>

        <div className="recommendation-card">
          <h3>Recommendation</h3>
          <p>{resultProfile.recommendation}</p>
        </div>

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
