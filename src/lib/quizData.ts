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
import type { ImportedQuiz, Quiz, QuizResponse } from './quizTypes'

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
    activeQuizId: quizRef.id,
    activeQuizTitle: title,
    activeBy: ownerId,
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
    updatedAt: serverTimestamp(),
  })
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

export function subscribeToActiveQuiz(onQuiz: (quiz: Quiz | null) => void, onError: (error: Error) => void) {
  const firestore = requireFirestore()
  let activeQuizId = ''
  let quizUnsubscribe: Unsubscribe | undefined

  const settingsUnsubscribe = onSnapshot(
    doc(firestore, 'settings', 'current'),
    (settingsSnapshot) => {
      const nextQuizId = String(settingsSnapshot.data()?.activeQuizId ?? '')

      if (nextQuizId === activeQuizId) {
        return
      }

      activeQuizId = nextQuizId
      quizUnsubscribe?.()

      if (!activeQuizId) {
        onQuiz(null)
        return
      }

      quizUnsubscribe = onSnapshot(
        doc(firestore, 'quizzes', activeQuizId),
        (quizSnapshot) => {
          if (!quizSnapshot.exists()) {
            onQuiz(null)
            return
          }

          const data = quizSnapshot.data()
          onQuiz({
            id: quizSnapshot.id,
            title: String(data.title ?? 'Quiz'),
            questions: data.questions ?? [],
          })
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