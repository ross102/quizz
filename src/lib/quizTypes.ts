export type QuizQuestion = {
  id: number
  prompt: string
  options: string[]
  pointsByChoice?: number[]
  maxScore?: number
  animalType?: string
  imageUrl?: string
  minimum?: number
  maximum?: number
  description?: string
  recommendation?: string
}

export type Quiz = {
  id: string
  title: string
  questions: QuizQuestion[]
}

export type QuizResponse = {
  id: string
  quizId: string
  participantId: string
  questionId: number
  questionText: string
  selectedOption: string
  optionLabel: string
  submittedAt?: number
}

export type QuizCompletion = {
  id: string
  quizId: string
  participantId: string
  profileName: string | null
  scorePercent: number | null
  completedAt?: number
}

export type ImportedQuiz = {
  questions: QuizQuestion[]
  answerIndices: Record<number, number>
}