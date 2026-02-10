import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const FERPA_NOTICE = 'CONFIDENTIAL — FERPA Protected Student Records — Authorized Personnel Only — Do Not Distribute'

/**
 * Export tabular data to PDF with FERPA compliance watermarks
 * @param {string} title - Report title
 * @param {string[]} headers - Column headers
 * @param {Array<Array>} rows - Row data (array of arrays)
 * @param {object} options - Optional settings
 */
export function exportToPdf(title, headers, rows, options = {}) {
  const { subtitle, landscape = false, filename, generatedBy } = options
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait' })
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  // CONFIDENTIAL header banner
  doc.setFillColor(220, 38, 38) // red-600
  doc.rect(0, 0, pageWidth, 8, 'F')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  doc.text(FERPA_NOTICE, pageWidth / 2, 5.5, { align: 'center' })
  doc.setTextColor(0)

  // Title
  doc.setFontSize(16)
  doc.text(title, 14, 18)

  // Subtitle
  let currentY = 24
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitle, 14, currentY)
    doc.setTextColor(0)
    currentY += 6
  }

  // Generated metadata
  doc.setFontSize(7)
  doc.setTextColor(130)
  const generatedText = `Generated: ${new Date().toLocaleString()}${generatedBy ? ` | By: ${generatedBy}` : ''}`
  doc.text(generatedText, 14, currentY)
  doc.setTextColor(0)
  currentY += 6

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: currentY,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 14 },
    didDrawPage: () => {
      // Repeat CONFIDENTIAL banner on every page
      doc.setFillColor(220, 38, 38)
      doc.rect(0, 0, pageWidth, 8, 'F')
      doc.setFontSize(7)
      doc.setTextColor(255, 255, 255)
      doc.text(FERPA_NOTICE, pageWidth / 2, 5.5, { align: 'center' })
      doc.setTextColor(0)
    },
  })

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // CONFIDENTIAL footer bar
    doc.setFillColor(220, 38, 38)
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(
      `${FERPA_NOTICE}  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 4.5,
      { align: 'center' }
    )
    doc.setTextColor(0)
  }

  const fname = filename || `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fname)
  return fname
}

/**
 * Export tabular data to Excel with FERPA compliance notice
 * @param {string} title - Sheet name / report title
 * @param {string[]} headers - Column headers
 * @param {Array<Array>} rows - Row data (array of arrays)
 * @param {object} options - Optional settings
 */
export function exportToExcel(title, headers, rows, options = {}) {
  const { filename, sheetName, generatedBy } = options

  // Prepend FERPA notice rows
  const noticeRows = [
    [FERPA_NOTICE],
    [`Generated: ${new Date().toLocaleString()}${generatedBy ? ` | By: ${generatedBy}` : ''}`],
    [], // blank row separator
  ]

  const allRows = [...noticeRows, headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(allRows)

  // Auto-size columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName || title.slice(0, 31))

  const fname = filename || `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fname)
  return fname
}

/**
 * Build export data for disproportionality report
 */
export function buildDisproportionalityExportData(data) {
  if (!data) return { headers: [], rows: [] }

  const headers = ['Category', 'Group', 'Incidents', 'Population', 'Incident %', 'Population %', 'Risk Ratio']
  const rows = []

  const addSection = (category, items) => {
    if (!items?.length) return
    items.forEach(item => {
      rows.push([
        category,
        item.name,
        item.incidents,
        item.population,
        `${item.incidentPct}%`,
        `${item.populationPct}%`,
        item.riskRatio.toFixed(2),
      ])
    })
  }

  addSection('Race/Ethnicity', data.byRace)
  addSection('Gender', data.byGender)
  addSection('SPED/504 Status', data.bySped)
  addSection('ELL Status', data.byEll)

  return { headers, rows }
}

/**
 * Build export data for recidivism report
 */
export function buildRecidivismExportData(data) {
  if (!data) return { headers: [], rows: [] }

  const headers = ['Metric', 'Value']
  const rows = [
    ['DAEP Recidivism Rate', `${data.daepRate}%`],
    ['DAEP Repeat Students', data.daepRepeatStudents],
    ['DAEP Unique Students', data.daepUniqueStudents],
    ['Total DAEP Placements', data.totalDaepPlacements],
    ['Overall Repeat Rate', `${data.overallRepeatRate}%`],
    ['Repeat Offenders', data.repeatOffenders],
    ['Total Unique Students', data.totalUniqueStudents],
  ]

  if (data.distribution?.length) {
    rows.push([])
    rows.push(['Incident Frequency', 'Student Count'])
    data.distribution.forEach(d => {
      rows.push([d.name, d.count])
    })
  }

  return { headers, rows }
}

/**
 * Build export data for intervention effectiveness report
 */
export function buildInterventionExportData(data) {
  if (!data?.length) return { headers: [], rows: [] }

  const headers = ['Intervention', 'Tier', 'Category', 'Total', 'Active', 'Completed', 'Effective', 'Rate']
  const rows = data.map(item => [
    item.name,
    `Tier ${item.tier}`,
    item.category || '',
    item.total,
    item.active,
    item.completed,
    item.effective,
    item.effectivenessRate !== null ? `${item.effectivenessRate}%` : 'N/A',
  ])

  return { headers, rows }
}
