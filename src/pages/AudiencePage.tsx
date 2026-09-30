import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { firebaseConfigured } from '../lib/firebase'
import {
  ensureParticipantSession,
  subscribeToActiveQuiz,
  subscribeToQuizCompletions,
  subscribeToQuizResponses,
} from '../lib/quizData'
import type { QuizCompletion, QuizResponse } from '../lib/quizTypes'

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
    id: 'demo-2',
    questionId: 1,
    questionText: 'Which language is primarily used for styling web pages?',
    selectedOption: 'CSS',
    optionLabel: 'B',
    accent: 'blue',
    align: 'left',
  },
  {
    id: 'demo-3',
    questionId: 3,
    questionText: 'What does JSX allow you to write in React?',
    selectedOption: 'HTML-like syntax in JavaScript',
    optionLabel: 'B',
    accent: 'violet',
    align: 'right',
  },
  {
    id: 'demo-4',
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
  const chatRef = useRef<HTMLDivElement>(null)
  const [liveAnswers, setLiveAnswers] = useState<AudienceAnswer[]>([])
  const [isUsingSocket, setIsUsingSocket] = useState(false)
  const [questionCount, setQuestionCount] = useState(mockedAudienceAnswers.length)
  const [connectionError, setConnectionError] = useState('')
  const [completedProfiles, setCompletedProfiles] = useState<QuizCompletion[]>([])

  useEffect(() => {
    if (firebaseConfigured) {
      let unsubscribeQuiz: (() => void) | undefined
      let unsubscribeResponses: (() => void) | undefined
      let unsubscribeCompletions: (() => void) | undefined

      ensureParticipantSession()
        .then(() => {
          unsubscribeQuiz = subscribeToActiveQuiz((quiz) => {
            unsubscribeResponses?.()
            unsubscribeCompletions?.()
            setLiveAnswers([])
            setCompletedProfiles([])

            if (!quiz) {
              setQuestionCount(0)
              setIsUsingSocket(false)
              return
            }

            setQuestionCount(quiz.questions.length)
            unsubscribeResponses = subscribeToQuizResponses(quiz.id, (responses) => {
              setLiveAnswers(responses.map(toAudienceAnswer))
              setIsUsingSocket(true)
            }, (error) => setConnectionError(error.message))
            unsubscribeCompletions = subscribeToQuizCompletions(quiz.id, setCompletedProfiles, (error) =>
              setConnectionError(error.message),
            )
          }, (error) => setConnectionError(error.message))
        })
        .catch((error: unknown) => {
          setConnectionError(error instanceof Error ? error.message : 'Could not connect to Firebase.')
        })

      return () => {
        unsubscribeQuiz?.()
        unsubscribeResponses?.()
        unsubscribeCompletions?.()
      }
    }

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
  }, [])

  useEffect(() => {
    if (!firebaseConfigured && !isUsingSocket) {
      const timer = window.setTimeout(() => {
        setLiveAnswers(mockedAudienceAnswers)
      }, 500)

      return () => window.clearTimeout(timer)
    }
  }, [isUsingSocket])

  useLayoutEffect(() => {
    const feed = chatRef.current
    if (!feed || liveAnswers.length === 0) return

    feed.scrollTop = feed.scrollHeight
  }, [liveAnswers])

  const userResults = [
    { id: 1, score: 92, tone: 'blue' },
    { id: 2, score: 83, tone: 'violet' },
    { id: 3, score: 75, tone: 'green' },
    { id: 4, score: 67, tone: 'amber' },
    { id: 5, score: 58, tone: 'rose' },
  ]

  const profileCounts = completedProfiles.reduce<Record<string, number>>((counts, completion) => {
    if (completion.profileName) {
      counts[completion.profileName] = (counts[completion.profileName] ?? 0) + 1
    }
    return counts
  }, {})
  const hasCompletedProfiles = Object.keys(profileCounts).length > 0

  return (
    <main className="audience-page">
      <section className="audience-shell">
        <header className="audience-header">
          <div>
            <p className="audience-header__eyebrow">Live audience</p>
            <h1>Live Quiz Responses</h1>
          </div>
          <div className="audience-pill">
            {firebaseConfigured ? (isUsingSocket ? 'Live Firebase' : 'Firebase feed') : isUsingSocket ? 'Live socket' : 'Demo feed'} • {liveAnswers.length} responses
          </div>
        </header>

        {connectionError ? <div className="form-alert form-alert--error" role="alert">{connectionError}</div> : null}

        <div className="audience-summary">
          <div>
            <span>Questions</span>
            <strong>{questionCount}</strong>
          </div>
          <div>
            <span>Active feed</span>
            <strong>{liveAnswers.length}</strong>
          </div>
        </div>

        {hasCompletedProfiles ? (
          <section className="audience-profile-counts" aria-label="Completed quiz results">
            <h2>Completed results</h2>
            <div className="audience-profile-counts__list" aria-live="polite">
              {Object.entries(profileCounts)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([profileName, count], index) => (
                  <div className="audience-profile-count" key={profileName}>
                    <span>{count} {profileName}{count === 1 ? '' : 's'}</span>
                    <strong>{count}</strong>
                    <i style={{ animationDelay: `${index * 90}ms` }} />
                  </div>
                ))}
            </div>
          </section>
        ) : null}

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

        <div ref={chatRef} className="audience-chat" aria-live="polite">
          {liveAnswers.map((answer, index) => (
            <div
              key={answer.id}
              className={`audience-message audience-message--${answer.align} audience-message--${answer.accent}`}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="audience-message__meta">
                <div className="audience-message__identity">
                  <strong>Question {answer.questionId}</strong>
                  <span>Anonymous participant</span>
                </div>
                <span className="audience-message__letter" aria-label={`Choice ${answer.optionLabel}`}>
                  {answer.optionLabel}
                </span>
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

const answerAccents: AudienceAnswer['accent'][] = ['blue', 'violet', 'green', 'amber', 'rose', 'cyan']

function toAudienceAnswer(response: QuizResponse, index: number): AudienceAnswer {
  return {
    ...response,
    accent: answerAccents[index % answerAccents.length],
    align: index % 2 === 0 ? 'left' : 'right',
  }
}
