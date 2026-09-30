import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from './firebase'
import type { ImportedQuiz, Quiz, QuizCompletion, QuizResponse } from './quizTypes'

function requireFirestore() {
  if (!db) {
    throw new Error('Firebase is not configured. Add the web app values to .env.local and restart Vite.')
  }

  return db
}

export async function ensureParticipantSession() {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.')
  }

  if (!auth.currentUser) {
    await signInAnonymously(auth)
  }

  if (!auth.currentUser) {
    throw new Error('Could not create a participant session.')
  }

  return auth.currentUser.uid
}

export async function createQuiz(title: string, importedQuiz: ImportedQuiz, ownerId: string) {
  const firestore = requireFirestore()
  const quizRef = doc(collection(firestore, 'quizzes'))
  const batch = writeBatch(firestore)

  batch.set(quizRef, {
    title,
    questions: importedQuiz.questions,
    createdBy: ownerId,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(firestore, 'quizAnswerKeys', quizRef.id), {
    answerIndices: importedQuiz.answerIndices,
    createdBy: ownerId,
  })
  batch.set(doc(firestore, 'settings', 'current'), {
    activeBy: ownerId,
    timerEndsAt: null,
    timerDurationSeconds: null,
    updatedAt: serverTimestamp(),
  })
  await batch.commit()

  return quizRef.id
}

export async function activateQuiz(quizId: string, title: string, ownerId: string) {
  const firestore = requireFirestore()
  await setDoc(doc(firestore, 'settings', 'current'), {
    activeQuizId: quizId,
    activeQuizTitle: title,
    activeBy: ownerId,
    timerEndsAt: null,
    timerDurationSeconds: null,
    updatedAt: serverTimestamp(),
  })
}

export async function setActiveQuizTimer(durationSeconds: number | null, ownerId: string) {
  const firestore = requireFirestore()
  const timerEndsAt = durationSeconds === null ? null : Date.now() + durationSeconds * 1000

  await setDoc(doc(firestore, 'settings', 'current'), {
    activeBy: ownerId,
    timerEndsAt,
    timerDurationSeconds: durationSeconds,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export function subscribeToQuizzes(onQuizzes: (quizzes: Quiz[]) => void, onError: (error: Error) => void) {
  const firestore = requireFirestore()
  return onSnapshot(
    collection(firestore, 'quizzes'),
    (snapshot) => {
      onQuizzes(
        snapshot.docs
          .map((quizDoc) => ({
            id: quizDoc.id,
            title: String(quizDoc.data().title ?? 'Untitled quiz'),
            questions: quizDoc.data().questions ?? [],
          }))
          .sort((left, right) => left.title.localeCompare(right.title)),
      )
    },
    onError,
  )
}

export function subscribeToActiveQuiz(
  onQuiz: (quiz: Quiz | null, timerEndsAt: number | null, timerDurationSeconds: number | null) => void,
  onError: (error: Error) => void,
) {
  const firestore = requireFirestore()
  let activeQuizId = ''
  let activeQuiz: Quiz | null = null
  let quizUnsubscribe: Unsubscribe | undefined

  const settingsUnsubscribe = onSnapshot(
    doc(firestore, 'settings', 'current'),
    (settingsSnapshot) => {
      const settings = settingsSnapshot.data()
      const timerEndsAt = typeof settings?.timerEndsAt === 'number' ? settings.timerEndsAt : null
      const timerDurationSeconds = typeof settings?.timerDurationSeconds === 'number'
        ? settings.timerDurationSeconds
        : null
      const nextQuizId = String(settingsSnapshot.data()?.activeQuizId ?? '')

      if (nextQuizId === activeQuizId) {
        onQuiz(activeQuiz, timerEndsAt, timerDurationSeconds)
        return
      }

      activeQuizId = nextQuizId
      activeQuiz = null
      quizUnsubscribe?.()

      if (!activeQuizId) {
        onQuiz(null, timerEndsAt, timerDurationSeconds)
        return
      }

      quizUnsubscribe = onSnapshot(
        doc(firestore, 'quizzes', activeQuizId),
        (quizSnapshot) => {
          if (!quizSnapshot.exists()) {
            activeQuiz = null
            onQuiz(null, timerEndsAt, timerDurationSeconds)
            return
          }

          const data = quizSnapshot.data()
          activeQuiz = {
            id: quizSnapshot.id,
            title: String(data.title ?? 'Quiz'),
            questions: data.questions ?? [],
          }
          onQuiz(activeQuiz, timerEndsAt, timerDurationSeconds)
        },
        onError,
      )
    },
    onError,
  )

  return () => {
    settingsUnsubscribe()
    quizUnsubscribe?.()
  }
}

export async function submitQuizAnswer(
  quiz: Quiz,
  participantId: string,
  questionId: number,
  optionIndex: number,
) {
  const firestore = requireFirestore()
  const question = quiz.questions.find((item) => item.id === questionId)

  if (!question || !question.options[optionIndex]) {
    throw new Error('The selected answer is not valid for this question.')
  }

  const responseId = `${quiz.id}_${participantId}_${questionId}`
  await setDoc(doc(firestore, 'quizResponses', responseId), {
    quizId: quiz.id,
    participantId,
    questionId,
    questionText: question.prompt,
    selectedOption: question.options[optionIndex],
    optionLabel: String.fromCharCode(65 + optionIndex),
    submittedAt: serverTimestamp(),
  })
}

export async function saveQuizCompletion(
  quizId: string,
  participantId: string,
  profileName: string | null,
  scorePercent: number | null,
) {
  const firestore = requireFirestore()
  const completionId = `${quizId}_${participantId}`

  await setDoc(doc(firestore, 'quizCompletions', completionId), {
    quizId,
    participantId,
    profileName,
    scorePercent,
    completedAt: serverTimestamp(),
  })
}

export function subscribeToQuizResponses(
  quizId: string,
  onResponses: (responses: QuizResponse[]) => void,
  onError: (error: Error) => void,
) {
  const firestore = requireFirestore()
  const responsesQuery = query(collection(firestore, 'quizResponses'), where('quizId', '==', quizId))

  return onSnapshot(
    responsesQuery,
    (snapshot) => {
      onResponses(
        snapshot.docs
          .map((responseDoc) => {
            const data = responseDoc.data()
            const submittedAt = data.submittedAt?.toMillis?.()

            return {
              id: responseDoc.id,
              quizId: String(data.quizId),
              participantId: String(data.participantId),
              questionId: Number(data.questionId),
              questionText: String(data.questionText),
              selectedOption: String(data.selectedOption),
              optionLabel: String(data.optionLabel),
              submittedAt,
            }
          })
          .sort((left, right) => (left.submittedAt ?? 0) - (right.submittedAt ?? 0)),
      )
    },
    onError,
  )
}

export function subscribeToQuizCompletions(
  quizId: string,
  onCompletions: (completions: QuizCompletion[]) => void,
  onError: (error: Error) => void,
) {
  const firestore = requireFirestore()
  const completionsQuery = query(collection(firestore, 'quizCompletions'), where('quizId', '==', quizId))

  return onSnapshot(
    completionsQuery,
    (snapshot) => {
      onCompletions(snapshot.docs.map((completionDoc) => {
        const data = completionDoc.data()
        const completedAt = data.completedAt?.toMillis?.()

        return {
          id: completionDoc.id,
          quizId: String(data.quizId),
          participantId: String(data.participantId),
          profileName: typeof data.profileName === 'string' ? data.profileName : null,
          scorePercent: typeof data.scorePercent === 'number' ? data.scorePercent : null,
          completedAt,
        }
      }))
    },
    onError,
  )
}