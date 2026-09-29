import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Question = {
  id: number
  prompt: string
  options: string[]
}

const questions: Question[] = [
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

function loadSavedProgress() {
  try {
    const savedProgress = localStorage.getItem(QUIZ_STORAGE_KEY)

    if (!savedProgress) {
      return { currentPage: 0, selectedAnswers: {} as Record<number, number> }
    }

    return JSON.parse(savedProgress) as {
      currentPage: number
      selectedAnswers: Record<number, number>
    }
  } catch {
    return { currentPage: 0, selectedAnswers: {} as Record<number, number> }
  }
}

function saveProgress(currentPage: number, selectedAnswers: Record<number, number>) {
  localStorage.setItem(
    QUIZ_STORAGE_KEY,
    JSON.stringify({
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

  const totalPages = Math.ceil(questions.length / pageSize)

  useEffect(() => {
    saveProgress(currentPage, selectedAnswers)
  }, [currentPage, selectedAnswers])

  const currentQuestion = useMemo(() => {
    return questions[currentPage]
  }, [currentPage])

  const answeredCount = Object.keys(selectedAnswers).length

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    setSelectedAnswers((previous) => ({
      ...previous,
      [questionId]: optionIndex,
    }))
  }

  const handlePrev = () => {
    setCurrentPage((previous) => Math.max(previous - 1, 0))
  }

  const handleNext = () => {
    if (currentPage === totalPages - 1) {
      const resultSnapshot = {
        answers: selectedAnswers,
        totalQuestions: questions.length,
      }

      localStorage.setItem(QUIZ_RESULT_KEY, JSON.stringify(resultSnapshot))
      localStorage.removeItem(QUIZ_STORAGE_KEY)

      navigate('/quiz/result', {
        state: resultSnapshot,
      })
      return
    }

    setCurrentPage((previous) => Math.min(previous + 1, totalPages - 1))
  }

  const isLastPage = currentPage === totalPages - 1

  return (
    <main className="participant-page">
      <section className="participant-shell">
        <header className="participant-header">
          <div>
            <p className="participant-header__eyebrow">Participant quiz</p>
            <h1>Healthy Food Choices</h1>
          </div>
          <div className="participant-progress">
            <span>{answeredCount} answered</span>
          </div>
        </header>

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
          >
            {isLastPage ? 'Finish' : 'Next'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default ParticipantQuizPage
