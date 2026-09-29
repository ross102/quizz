import type { QuizQuestion } from './quizTypes'

export type QuizProfile = {
  animalType: string
  minimum: number
  maximum: number
  description: string
  recommendation: string
}

export type QuizScore = {
  points: number
  maximumPoints: number
  percentage: number | null
  profile: QuizProfile | null
}

export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Record<number, number>,
): QuizScore {
  const points = questions.reduce((total, question) => {
    const selectedChoice = answers[question.id]
    return total + (selectedChoice === undefined ? 0 : question.pointsByChoice?.[selectedChoice] ?? 0)
  }, 0)

  const maximumPoints = questions.reduce((total, question) => total + (question.maxScore ?? 0), 0)
  const percentage = maximumPoints > 0 ? (points / maximumPoints) * 100 : null

  if (percentage === null) {
    return { points, maximumPoints, percentage, profile: null }
  }

  const profiles = new Map<string, QuizProfile>()

  for (const question of questions) {
    if (
      !question.animalType ||
      question.minimum === undefined ||
      question.maximum === undefined ||
      !question.description ||
      !question.recommendation
    ) {
      continue
    }

    const boundsAreFractions =
      question.minimum >= 0 &&
      question.maximum <= 1

    const profile = {
      animalType: question.animalType,
      minimum: boundsAreFractions ? question.minimum * 100 : question.minimum,
      maximum: boundsAreFractions ? question.maximum * 100 : question.maximum,
      description: question.description,
      recommendation: question.recommendation,
    }
    profiles.set(JSON.stringify(profile), profile)
  }

  const profile = [...profiles.values()].find(
    (candidate) => percentage >= candidate.minimum && percentage <= candidate.maximum,
  ) ?? null

  return { points, maximumPoints, percentage, profile }
}