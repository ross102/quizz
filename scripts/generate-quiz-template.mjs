import ExcelJS from 'exceljs'

const headers = [
  '#',
  'Question',
  'Choice 1',
  'Choice 2',
  'Choice 3',
  'Choice 4',
  'Choice 5',
  'Points: Choice 1',
  'Points: Choice 2',
  'Points: Choice 3',
  'Points: Choice 4',
  'Max score',
  'animal type',
  'Minimum',
  'Maximum',
  'Description',
  'Recommendation',
]

const workbook = new ExcelJS.Workbook()
const questions = workbook.addWorksheet('Questions')
questions.addRow(headers)
questions.columns = headers.map((header, index) => ({
  header,
  width: [6, 44, 24, 24, 24, 24, 24, 18, 18, 18, 18, 14, 18, 14, 14, 36, 36][index],
}))
questions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
questions.getRow(1).fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF24416B' },
}
questions.views = [{ state: 'frozen', ySplit: 1 }]

const instructions = workbook.addWorksheet('Instructions')
instructions.addRows([
  ['Quiz spreadsheet template'],
  ['Add one question per row on the Questions sheet.'],
  ['Fill Question and Choice 1 through Choice 4 for every question. Choice 5 is optional.'],
  ['Points: Choice 1 through Points: Choice 4 are numeric; a blank points cell counts as 0.'],
  ['Max score, animal type, Minimum, Maximum, Description, and Recommendation are optional metadata.'],
  ['The # column is optional and is not used to identify questions.'],
])
instructions.getColumn(1).width = 110

await workbook.xlsx.writeFile(new URL('../public/quiz-template.xlsx', import.meta.url))