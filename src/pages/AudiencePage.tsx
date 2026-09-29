import { useEffect, useState } from 'react'

type AudienceAnswer = {
  id: string
  questionId: number
  questionText: string
  selectedOption: string
  optionLabel: string
  accent: 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'cyan'
  align: 'left' | 'right'
}

const mockedAudienceAnswers: AudienceAnswer[] = [
  {
    id: '1',
    questionId: 1,
    questionText: 'Which language is primarily used for styling web pages?',
    selectedOption: 'CSS',
    optionLabel: 'B',
    accent: 'blue',
    align: 'left',
  },
  {
    id: '2',
    questionId: 1,
    questionText: 'Which language is primarily used for styling web pages?',
    selectedOption: 'CSS',
    optionLabel: 'B',
    accent: 'blue',
    align: 'left',
  },
  {
    id: '2',
    questionId: 3,
    questionText: 'What does JSX allow you to write in React?',
    selectedOption: 'HTML-like syntax in JavaScript',
    optionLabel: 'B',
    accent: 'violet',
    align: 'right',
  },
  {
    id: '3',
    questionId: 4,
    questionText: 'Which data structure keeps items in key-value pairs?',
    selectedOption: 'Object',
    optionLabel: 'B',
    accent: 'green',
    align: 'left',
  },
  {
    id: '4',
    questionId: 4,
    questionText: 'What is the purpose of a loop in programming?',
    selectedOption: 'To repeat actions',
    optionLabel: 'B',
    accent: 'amber',
    align: 'right',
  },
  {
    id: '5',
    questionId: 5,
    questionText: 'Which method is commonly used to render a list in React?',
    selectedOption: 'map()',
    optionLabel: 'A',
    accent: 'rose',
    align: 'left',
  },
  {
    id: '6',
    questionId: 6,
    questionText: 'What does a front-end framework help with?',
    selectedOption: 'User interface building',
    optionLabel: 'B',
    accent: 'cyan',
    align: 'right',
  },
  {
    id: '7',
    questionId: 7,
    questionText: 'Which CSS property changes spacing inside an element?',
    selectedOption: 'padding',
    optionLabel: 'C',
    accent: 'blue',
    align: 'left',
  },
  {
    id: '8',
    questionId: 8,
    questionText: 'Which hook is used for side effects in React?',
    selectedOption: 'useEffect',
    optionLabel: 'A',
    accent: 'violet',
    align: 'right',
  },
  {
    id: '9',
    questionId: 9,
    questionText: 'What does an API do?',
    selectedOption: 'Connects systems and exchanges data',
    optionLabel: 'D',
    accent: 'green',
    align: 'left',
  },
  {
    id: '10',
    questionId: 10,
    questionText: 'Which HTML element is best for a button?',
    selectedOption: '<button>',
    optionLabel: 'A',
    accent: 'amber',
    align: 'right',
  },
  {
    id: '11',
    questionId: 11,
    questionText: 'Which tool helps you bundle frontend assets?',
    selectedOption: 'Vite',
    optionLabel: 'A',
    accent: 'rose',
    align: 'left',
  },
  {
    id: '12',
    questionId: 12,
    questionText: 'What does accessibility improve?',
    selectedOption: 'Usability for all users',
    optionLabel: 'D',
    accent: 'cyan',
    align: 'right',
  },
]

const websocketUrl = import.meta.env.VITE_AUDIENCE_WS_URL ?? 'ws://localhost:8080'
const SHOW_USER_RESULTS = false

function AudiencePage() {
  const [liveAnswers, setLiveAnswers] = useState<AudienceAnswer[]>([])
  const [isUsingSocket, setIsUsingSocket] = useState(false)

  useEffect(() => {
    const socket = new WebSocket(websocketUrl)

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as AudienceAnswer[] | AudienceAnswer

        if (Array.isArray(payload)) {
          setLiveAnswers(payload)
          return
        }

        setLiveAnswers((previous) => {
          const filtered = previous.filter((response) => response.id !== payload.id)
          return [...filtered, payload]
        })
      } catch {
        setLiveAnswers(mockedAudienceAnswers)
      }
    }

    socket.addEventListener('open', () => setIsUsingSocket(true))
    socket.addEventListener('message', handleMessage)

    socket.addEventListener('error', () => {
      setIsUsingSocket(false)
      const fallbackTimer = window.setTimeout(() => {
        setLiveAnswers(mockedAudienceAnswers)
      }, 500)

      return () => window.clearTimeout(fallbackTimer)
    })

    socket.addEventListener('close', () => {
      if (liveAnswers.length === 0) {
        const fallbackTimer = window.setTimeout(() => {
          setLiveAnswers(mockedAudienceAnswers)
        }, 500)

        return () => window.clearTimeout(fallbackTimer)
      }
    })

    return () => {
      socket.close()
    }
  }, [liveAnswers.length])

  useEffect(() => {
    if (!isUsingSocket) {
      const timer = window.setTimeout(() => {
        setLiveAnswers(mockedAudienceAnswers)
      }, 500)

      return () => window.clearTimeout(timer)
    }
  }, [isUsingSocket])

  const userResults = [
    { id: 1, score: 92, tone: 'blue' },
    { id: 2, score: 83, tone: 'violet' },
    { id: 3, score: 75, tone: 'green' },
    { id: 4, score: 67, tone: 'amber' },
    { id: 5, score: 58, tone: 'rose' },
  ]

  return (
    <main className="audience-page">
      <section className="audience-shell">
        <header className="audience-header">
          <div>
            <p className="audience-header__eyebrow">Live audience</p>
            <h1>Live Quiz Responses</h1>
          </div>
          <div className="audience-pill">
            {isUsingSocket ? 'Live socket' : 'Demo feed'} • {liveAnswers.length} responses
          </div>
        </header>

        <div className="audience-summary">
          <div>
            <span>Questions</span>
            <strong>{mockedAudienceAnswers.length}</strong>
          </div>
          <div>
            <span>Active feed</span>
            <strong>{liveAnswers.length}</strong>
          </div>
        </div>

        {SHOW_USER_RESULTS && (
          <div className="audience-results" aria-label="Audience results">
            {userResults.map((result) => (
              <div key={result.id} className={`audience-result audience-result--${result.tone}`}>
                <span className="audience-result__label">Result {result.id}</span>
                <strong>{result.score}%</strong>
              </div>
            ))}
          </div>
        )}

        <div className="audience-chat" aria-live="polite">
          {liveAnswers.map((answer, index) => (
            <div
              key={answer.id}
              className={`audience-message audience-message--${answer.align} audience-message--${answer.accent}`}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="audience-message__meta">
                <span>Q{answer.questionId}</span>
                <span className="audience-message__letter">{answer.optionLabel}</span>
                {SHOW_USER_RESULTS && (
                  <span className="audience-message__score">{userResults[index % userResults.length].score}%</span>
                )}
              </div>

              <div className="audience-message__bubble">
                <p>{answer.questionText}</p>
                <div className="audience-message__choice">
                  <span>Answer</span>
                  <strong>{answer.selectedOption}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default AudiencePage
