import type { ImportedQuiz } from './quizTypes'

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findColumn(headers: string[], patterns: RegExp[]) {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)))
}

export async function parseQuizFile(file: File): Promise<ImportedQuiz> {
  let rows: unknown[][]

  if (file.name.toLowerCase().endsWith('.csv')) {
    const Papa = await import('papaparse')
    const result = Papa.default.parse<unknown[]>(await file.text(), { skipEmptyLines: 'greedy' })

    if (result.errors.length) {
      throw new Error(`Could not read CSV row ${(result.errors[0]?.row ?? 0) + 1}.`)
    }

    rows = result.data
  } else {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const firstSheet = workbook.worksheets[0]

    if (!firstSheet) {
      throw new Error('The uploaded file does not contain a worksheet.')
    }

    rows = firstSheet.getSheetValues().slice(1).map((row) =>
      Array.isArray(row) ? row.slice(1) : [],
    )
  }

  if (!rows.length) {
    throw new Error('The uploaded worksheet is empty.')
  }

  const firstRow = rows[0].map(normalizeHeader)
  const numberColumn = rows[0].findIndex((value) => {
    const rawHeader = String(value ?? '').trim()
    return rawHeader === '#' || /^(number|no|questionnumber|index)$/i.test(normalizeHeader(rawHeader))
  })
  const promptColumn = findColumn(firstRow, [/^(question|prompt|questiontext)$/])
  const optionColumns = [1, 2, 3, 4, 5].map((number) => {
    const letter = String.fromCharCode(96 + number)
    return findColumn(firstRow, [new RegExp(`^(option|choice)${number}$`), new RegExp(`^${letter}$`)])
  })
  const pointsColumns = [1, 2, 3, 4].map((number) =>
    findColumn(firstRow, [new RegExp(`^points(choice|option)${number}$`)]),
  )
  const answerColumn = findColumn(firstRow, [/^(answer|correctanswer|correctoption|correct)$/])
  const maxScoreColumn = findColumn(firstRow, [/^maxscore$/])
  const animalTypeColumn = findColumn(firstRow, [/^animaltype$/])
  const minimumColumn = findColumn(firstRow, [/^minimum$/])
  const maximumColumn = findColumn(firstRow, [/^maximum$/])
  const descriptionColumn = findColumn(firstRow, [/^(desc|description)$/])
  const recommendationColumn = findColumn(firstRow, [/^(recomm|recommendation)$/])
  const hasHeaders = promptColumn >= 0 && optionColumns.slice(0, 4).every((column) => column >= 0)
  const dataRows = hasHeaders ? rows.slice(1) : rows
  const promptIndex = hasHeaders ? promptColumn : 0
  const optionIndexes = hasHeaders
    ? optionColumns.slice(0, optionColumns[4] >= 0 ? 5 : 4)
    : [1, 2, 3, 4]
  const answerIndex = hasHeaders ? answerColumn : 5

  const questions: ImportedQuiz['questions'] = []
  const answerIndices: ImportedQuiz['answerIndices'] = {}

  dataRows.forEach((row) => {
    const prompt = String(row[promptIndex] ?? '').trim()
    const options = optionIndexes.map((index) => String(row[index] ?? '').trim())
    const rowNumber = String(numberColumn >= 0 ? row[numberColumn] ?? '' : '').trim()

    if (!prompt && !rowNumber) {
      return
    }

    const questionNumber = questions.length + 1
    const missingFields = []

    if (!prompt) missingFields.push('Question')
    options.slice(0, 4).forEach((option, index) => {
      if (!option) missingFields.push(`Choice ${index + 1}`)
    })

    if (missingFields.length) {
      throw new Error(`Question ${questionNumber} is missing: ${missingFields.join(', ')}.`)
    }

    if (questions.length >= 30) {
      throw new Error('A quiz can contain no more than 30 questions.')
    }

    if (options.length > 4 && !options[4]) options.pop()

    const questionId = questions.length + 1
    const rowValue = (column: number) => (column >= 0 ? row[column] : '')
    const pointsByChoice = pointsColumns.map((column) => {
      const value = Number(rowValue(column))
      return Number.isFinite(value) ? value : 0
    })
    const maxScoreRaw = String(rowValue(maxScoreColumn) ?? '').trim()
    const maxScoreValue = Number(maxScoreRaw)
    const minimumRaw = String(rowValue(minimumColumn) ?? '').trim()
    const maximumRaw = String(rowValue(maximumColumn) ?? '').trim()
    const question: ImportedQuiz['questions'][number] = {
      id: questionId,
      prompt,
      options,
    }

    if (pointsColumns.some((column) => column >= 0)) question.pointsByChoice = pointsByChoice
    if (maxScoreColumn >= 0 && maxScoreRaw && Number.isFinite(maxScoreValue)) {
      question.maxScore = maxScoreValue
    }

    const animalType = String(rowValue(animalTypeColumn) ?? '').trim()
    const description = String(rowValue(descriptionColumn) ?? '').trim()
    const recommendation = String(rowValue(recommendationColumn) ?? '').trim()

    if (animalType) question.animalType = animalType
    if (minimumRaw) {
      const minimum = Number(minimumRaw)
      if (!Number.isFinite(minimum)) throw new Error(`Question ${questionId} has an invalid Minimum value.`)
      question.minimum = minimum
    }
    if (maximumRaw) {
      const maximum = Number(maximumRaw)
      if (!Number.isFinite(maximum)) throw new Error(`Question ${questionId} has an invalid Maximum value.`)
      question.maximum = maximum
    }
    if (description) question.description = description
    if (recommendation) question.recommendation = recommendation

    questions.push(question)

    const answer = String(row[answerIndex] ?? '').trim()
    if (answer) {
      const answerLetter = answer.toUpperCase()
      const answerNumber = Number(answer)
      const matchingIndex = options.findIndex(
        (option, index) =>
          option.toLowerCase() === answer.toLowerCase() ||
          answerLetter === String.fromCharCode(65 + index) ||
          answerNumber === index + 1,
      )

      if (matchingIndex < 0) {
        throw new Error(`Question ${questionId} has an answer that does not match one of its options.`)
      }

      answerIndices[questionId] = matchingIndex
    }
  })

  if (!questions.length) {
    throw new Error('No valid questions were found in the uploaded worksheet.')
  }

  return { questions, answerIndices }
}