/**
 * build-tpt-investigation-templates.mjs
 * Generates 5 Word (.docx) investigation templates — one per offense type
 * Brand: Clear Path Education Group, LLC
 * Run: node build-tpt-investigation-templates.mjs
 *
 * Output files:
 *   Investigation-Template-Fighting-Assault.docx
 *   Investigation-Template-Drugs-Alcohol.docx
 *   Investigation-Template-Threats.docx
 *   Investigation-Template-Harassment-Bullying.docx
 *   Investigation-Template-General-Misconduct.docx
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  BorderStyle, WidthType, AlignmentType, HeadingLevel,
  ShadingType, convertInchesToTwip, PageOrientation,
  UnderlineType, PageBreak,
} from 'docx'
import { writeFileSync } from 'fs'

// ─────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────
const NAVY   = '1E3A5F'
const ORANGE = 'E8650A'
const LGRAY  = 'F5F5F5'
const WHITE  = 'FFFFFF'

const noBorder = {
  top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
}

const thinBorder = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: '999999' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: '999999' },
}

const bottomOnly = {
  top:    { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: '1E3A5F' },
  left:   { style: BorderStyle.NONE, size: 0 },
  right:  { style: BorderStyle.NONE, size: 0 },
}

// Bold navy section header paragraph
function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 240, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: NAVY,
        font: 'Calibri',
      }),
    ],
  })
}

// Standard label: value on same line
function labelLine(label, width = 40) {
  const underscores = '_'.repeat(width)
  return new Paragraph({
    spacing: { before: 100, after: 60 },
    children: [
      new TextRun({ text: `${label}  `, bold: true, size: 20, font: 'Calibri' }),
      new TextRun({ text: underscores, underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
    ],
  })
}

// Checkbox item
function checkItem(label, indent = false) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    indent: indent ? { left: convertInchesToTwip(0.3) } : undefined,
    children: [
      new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
      new TextRun({ text: label, size: 20, font: 'Calibri' }),
    ],
  })
}

// Checkbox item with fill line
function checkItemWithLine(label, lineWidth = 30) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [
      new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
      new TextRun({ text: label + '  ', size: 20, font: 'Calibri' }),
      new TextRun({ text: '_'.repeat(lineWidth), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
    ],
  })
}

// Multi-line write-in area
function writeArea(label, lines = 3) {
  const paras = []
  if (label) {
    paras.push(new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri' })],
    }))
  }
  for (let i = 0; i < lines; i++) {
    paras.push(new Paragraph({
      spacing: { before: 40, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' } },
      children: [new TextRun({ text: ' ', size: 20, font: 'Calibri' })],
    }))
  }
  return paras
}

// Two-column label row in a table
function twoCol(left, right) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: noBorder,
        children: [labelLine(left, 28)],
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: noBorder,
        children: [labelLine(right, 28)],
      }),
    ],
  })
}

// Three-column label row
function threeCol(a, b, c) {
  return new TableRow({
    children: [a, b, c].map(label => new TableCell({
      width: { size: 33, type: WidthType.PERCENTAGE },
      borders: noBorder,
      children: [labelLine(label, 18)],
    })),
  })
}

function twoColTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...Object.fromEntries(Object.keys(noBorder).map(k => [k, { style: BorderStyle.NONE }])) },
    rows,
  })
}

// Shaded notice box
function noticeBox(text, color = LGRAY) {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    shading: { type: ShadingType.SOLID, fill: color, color },
    children: [
      new TextRun({ text: '⚠  ' + text, size: 18, font: 'Calibri', color: color === LGRAY ? '333333' : WHITE, bold: true }),
    ],
  })
}

// Spacer
const spacer = () => new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun('')] })

// Divider line
const divider = () => new Paragraph({
  spacing: { before: 160, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
  children: [new TextRun('')],
})

// Document header (navy title bar)
function docHeader(title, offenseLabel) {
  return [
    new Paragraph({
      spacing: { before: 0, after: 80 },
      shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
      children: [
        new TextRun({ text: 'CAMPUS ADMINISTRATOR\'S INVESTIGATION RECORD', bold: true, size: 28, color: WHITE, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, fill: ORANGE, color: ORANGE },
      children: [
        new TextRun({ text: `  ${offenseLabel}`, bold: true, size: 22, color: WHITE, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 0 },
      children: [
        new TextRun({ text: 'Clear Path Education Group, LLC  |  CONFIDENTIAL — FERPA Education Record  |  clearpatheg.com', size: 16, color: '888888', font: 'Calibri', italics: true }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20, after: 160 },
      children: [
        new TextRun({ text: 'This document is a confidential education record. Retain per district records policy. Not for public release.', size: 16, color: '888888', font: 'Calibri', italics: true }),
      ],
    }),
  ]
}

// Certification block at end of every form
function certificationBlock() {
  return [
    sectionHeader('SECTION 10 — ADMINISTRATOR CERTIFICATION'),
    new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: 'I certify that this investigation was conducted in accordance with district policy and the Texas Education Code, that all required due process steps were followed, and that the findings above accurately represent the evidence collected and reviewed.',
          size: 20,
          font: 'Calibri',
          italics: true,
        }),
      ],
    }),
    twoColTable([
      twoCol('Investigating Administrator (Print Name)', 'Title / Role'),
      twoCol('Signature', 'Date'),
      twoCol('Reviewed By (Principal, if different)', 'Date'),
    ]),
    spacer(),
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({ text: 'DISTRIBUTION: ', bold: true, size: 18, font: 'Calibri', color: NAVY }),
        new TextRun({ text: 'Original — Student disciplinary file (locked)  |  Copy — Central office (if mandatory removal)  |  Copy — SPED file (if SPED student)', size: 18, font: 'Calibri' }),
      ],
    }),
    divider(),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  For organizational use only — not legal advice.', size: 16, font: 'Calibri', color: '888888', italics: true }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Upgrade to Waypoint for automated investigation workflows, alerts, and district-wide visibility → clearpatheg.com/waypoint', size: 16, font: 'Calibri', color: ORANGE, bold: true }),
      ],
    }),
  ]
}

// ─────────────────────────────────────────────────────────────
// SHARED SECTIONS (appear in all 5 templates)
// ─────────────────────────────────────────────────────────────

function section1_IncidentOverview(tecRef, offenseCategory) {
  return [
    sectionHeader('SECTION 1 — INCIDENT OVERVIEW'),
    twoColTable([threeCol('Case ID', 'School Year', 'Campus')]),
    twoColTable([threeCol('Date of Incident', 'Time', 'Day of Week')]),
    twoColTable([twoCol('Location on Campus', 'Assigned Investigating Administrator')]),
    spacer(),
    twoColTable([twoCol('Offense Category', 'TEC Reference')]),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [
        new TextRun({ text: `  ${offenseCategory}`, size: 20, font: 'Calibri', bold: true, color: NAVY }),
        new TextRun({ text: `  |  TEC: ${tecRef}`, size: 20, font: 'Calibri', color: '555555' }),
      ],
    }),
  ]
}

function section2_StudentInfo() {
  return [
    sectionHeader('SECTION 2 — STUDENT INFORMATION'),
    twoColTable([twoCol('Student Last Name', 'First Name')]),
    twoColTable([threeCol('Grade Level', 'Student ID', 'Date of Birth')]),
    spacer(),
    new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({ text: 'IEP / SPED Services?  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: '☐ Yes     ☐ No        ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '  504 Plan?  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: '☐ Yes     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    noticeBox('If YES to IEP/SPED: A Manifestation Determination Review (MDR) may be required within 10 school days of any removal. Do NOT finalize placement without contacting the SPED Coordinator.'),
    noticeBox('If YES to 504: Contact 504 Coordinator before finalizing any removal. A Section 504 team meeting may be required.'),
  ]
}

function section3_ImmediateActions() {
  return [
    sectionHeader('SECTION 3 — IMMEDIATE ACTIONS TAKEN'),
    checkItemWithLine('Student separated from situation at', 12),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Separated by (name/role): ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(40), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    checkItem('Other student(s) / parties involved also separated'),
    checkItemWithLine('Campus principal / AP notified at', 12),
    checkItemWithLine('SRO notified at', 12),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'SRO Name: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(30), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: '    Report #: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(20), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    checkItemWithLine('Parent / Guardian notified at', 12),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Parent name: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(28), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: '    Method: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(20), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Parent acknowledged?  ☐ Yes     ☐ No     ☐ Voicemail left', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItemWithLine('SPED Coordinator notified (SPED students only) at', 12),
  ]
}

function section4_DueProcess() {
  return [
    sectionHeader('SECTION 4 — DUE PROCESS CHECKLIST'),
    noticeBox('Every item below must be completed for ANY removal. Incomplete due process is the #1 reason decisions are overturned on appeal.'),
    checkItemWithLine('Written or verbal notice of removal provided to student  — Date/Time', 18),
    checkItem('Conference offered to student (required for age 10+, TEC §37.009)'),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Conference:  ☐ Accepted  (Date/Time: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(20), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: ')     ☐ Declined by student', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItemWithLine('Conference held with student  — Date/Time', 20),
    checkItemWithLine('Parent/Guardian conference offered  — Date/Time', 20),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Parent conference:  ☐ Accepted  (Date: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(18), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: ')     ☐ Declined', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItem('Appeal rights explained to parent'),
    checkItemWithLine('Written notice of placement sent to parent  — Date', 20),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Delivery method:  ☐ Phone  ☐ Email  ☐ In-Person  ☐ Certified Mail', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItemWithLine('SPED: MDR scheduled (if applicable)  — Scheduled Date', 20),
    checkItemWithLine('504: 504 Coordinator notified (if applicable)  — Date', 20),
  ]
}

function section5_Timeline() {
  return [
    sectionHeader('SECTION 5 — INCIDENT TIMELINE'),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: 'Reconstruct the full sequence of events in chronological order. Be specific — include times, locations, and person names. This timeline is the foundation of your finding.', size: 20, font: 'Calibri', italics: true })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
              borders: thinBorder,
              children: [new Paragraph({ children: [new TextRun({ text: 'TIME', bold: true, size: 18, color: WHITE, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 88, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
              borders: thinBorder,
              children: [new Paragraph({ children: [new TextRun({ text: 'EVENT / OBSERVATION', bold: true, size: 18, color: WHITE, font: 'Calibri' })] })],
            }),
          ],
        }),
        ...[1,2,3,4,5,6,7,8].map((_, i) => new TableRow({
          children: [
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              borders: thinBorder,
              shading: i % 2 === 0 ? { type: ShadingType.SOLID, fill: 'F9F9F9', color: 'F9F9F9' } : undefined,
              children: [new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: ' ', size: 20, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 88, type: WidthType.PERCENTAGE },
              borders: thinBorder,
              shading: i % 2 === 0 ? { type: ShadingType.SOLID, fill: 'F9F9F9', color: 'F9F9F9' } : undefined,
              children: [new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: ' ', size: 20, font: 'Calibri' })] })],
            }),
          ],
        })),
      ],
    }),
  ]
}

function section6_StudentStatement() {
  return [
    sectionHeader('SECTION 6 — STUDENT STATEMENT'),
    twoColTable([twoCol('Date / Time Statement Collected', 'Collected By (Admin Name)')]),
    new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({ text: 'Statement format:  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: '☐ Written (student wrote)     ☐ Verbal (admin documented)     ☐ Student Refused to Give Statement', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [new TextRun({ text: 'Suggested opening prompt to student: "In your own words, tell me what happened. Start from the beginning."', size: 20, font: 'Calibri', italics: true, color: '666666' })],
    }),
    ...writeArea('Summary or verbatim statement (attach original signed document if written):', 5),
    spacer(),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({ text: 'Student signature (if written statement):  ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(36), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: '   Date: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(16), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    checkItem('Student declined to give statement'),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Reason (if known): ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(50), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
  ]
}

function section7_Witnesses() {
  const witnessBlock = (num) => [
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [new TextRun({ text: `Witness ${num}`, bold: true, size: 22, font: 'Calibri', color: NAVY })],
    }),
    twoColTable([twoCol(`Witness ${num} — Name`, 'Role / Relationship to Incident')]),
    twoColTable([twoCol('Date / Time of Interview', 'Interviewed By')]),
    ...writeArea('Statement summary:', 3),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({ text: 'Written statement obtained?  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: '☐ Yes — attached     ☐ No     ☐ Witness declined', size: 20, font: 'Calibri' }),
      ],
    }),
  ]

  return [
    sectionHeader('SECTION 7 — WITNESS STATEMENTS'),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: 'Complete one block per witness. If no witnesses, note "No witnesses identified." FERPA: Do not share one student\'s statement with another student or their family.', size: 20, font: 'Calibri', italics: true })],
    }),
    ...witnessBlock(1),
    divider(),
    ...witnessBlock(2),
    divider(),
    ...witnessBlock(3),
  ]
}

function section8_Evidence() {
  return [
    sectionHeader('SECTION 8 — EVIDENCE SUMMARY'),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: 'List every item of evidence collected. Physical evidence must be secured in a locked location. Log each item in your Evidence Tracker spreadsheet with the same Evidence ID.', size: 20, font: 'Calibri', italics: true })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Evidence ID', 'Description', 'Type', 'Collected By', 'Storage Location'].map((h, i) => new TableCell({
            width: { size: [10, 30, 15, 20, 25][i], type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
            borders: thinBorder,
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: WHITE, font: 'Calibri' })] })],
          })),
        }),
        ...[1,2,3,4,5].map((_, i) => new TableRow({
          children: [0,1,2,3,4].map(() => new TableCell({
            borders: thinBorder,
            shading: i % 2 === 0 ? { type: ShadingType.SOLID, fill: 'F9F9F9', color: 'F9F9F9' } : undefined,
            children: [new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: ' ', size: 20, font: 'Calibri' })] })],
          })),
        })),
      ],
    }),
    spacer(),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'Legal hold required?  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: '☐ Yes — note in Evidence Tracker     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
  ]
}

function section9_Finding(offenseSpecificContent) {
  return [
    sectionHeader('SECTION 9 — ADMINISTRATOR FINDINGS & DISPOSITION'),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: 'Based on the evidence, timeline, and statements collected, I find:', bold: true, size: 20, font: 'Calibri' })],
    }),
    checkItem('The incident occurred substantially as described in the initial report'),
    checkItem(`The student engaged in conduct that violates the Student Code of Conduct`),
    checkItem('The following mitigating factors were considered:'),
    ...writeArea('', 2),
    checkItem('The following aggravating factors were considered:'),
    ...writeArea('', 2),
    spacer(),
    ...offenseSpecificContent,
    spacer(),
    sectionHeader('SPED / 504 FINDING (complete if applicable)'),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [new TextRun({ text: 'MDR / 504 Review Result (if applicable):', bold: true, size: 20, font: 'Calibri' })],
    }),
    checkItem('MDR not required — student does not have an IEP or 504'),
    checkItemWithLine('MDR completed on', 20),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'MDR Determination:  ☐ NOT a manifestation of disability  —  placement may proceed', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: '☐ IS a manifestation of disability  —  STOP. Placement blocked. Contact SPED Coordinator and ARD team immediately.', bold: true, size: 20, font: 'Calibri', color: 'C0392B' }),
      ],
    }),
    spacer(),
    sectionHeader('DISPOSITION'),
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: 'Warning / No removal', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: 'Suspension — ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '______', underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: ' days  (max 3 per TEC §37.005)', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: 'Discretionary DAEP — ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '______', underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: ' days     DAEP Campus: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(28), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: 'Mandatory DAEP referral — forwarded to: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(32), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      children: [
        new TextRun({ text: '☐  ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: 'Mandatory Expulsion recommendation — forwarded to: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(24), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    twoColTable([twoCol('Decision confirmed by (Signature)', 'Title / Date')]),
    twoColTable([twoCol('Written notice of decision sent to parent', 'Date / Method')]),
    checkItem('Parent appeal rights explained at time of notification'),
  ]
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 1 — FIGHTING / ASSAULT
// ─────────────────────────────────────────────────────────────
function buildFightingTemplate() {
  const offenseSpecific = [
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'FIGHTING / ASSAULT — SPECIFIC FINDINGS:', bold: true, size: 20, font: 'Calibri', color: NAVY })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({ text: 'Who initiated physical contact?  ☐ Subject student     ☐ Other party     ☐ Cannot determine from evidence', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Injury observed?  ☐ Yes     ☐ No          Medical attention required?  ☐ Yes     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    labelLine('Describe injury (if any)', 50),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'Weapon involved?  ☐ Yes (describe below)     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    labelLine('If weapon: describe / TEC §37.007 referral may be required', 30),
    checkItem('Separation order issued (students must be kept apart)'),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'Other student(s) involved (initials only, per FERPA): ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(30), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    noticeBox('If assault resulted in serious bodily injury or if a weapon was used: mandatory expulsion referral may apply under TEC §37.007. Consult your principal and district legal counsel before finalizing disposition.'),
  ]

  return new Document({
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) } } },
      children: [
        ...docHeader('Fighting / Assault', 'OFFENSE TYPE: Fighting / Assault  |  TEC §37.005, §37.006'),
        ...section1_IncidentOverview('§37.005 (suspension) / §37.006 (mandatory DAEP if bodily injury)', 'Fighting / Assault'),
        ...section2_StudentInfo(),
        ...section3_ImmediateActions(),
        ...section4_DueProcess(),
        ...section5_Timeline(),
        ...section6_StudentStatement(),
        ...section7_Witnesses(),
        ...section8_Evidence(),
        ...section9_Finding(offenseSpecific),
        ...certificationBlock(),
      ],
    }],
  })
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 2 — DRUGS / ALCOHOL
// ─────────────────────────────────────────────────────────────
function buildDrugsTemplate() {
  const offenseSpecific = [
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'DRUGS / ALCOHOL — SPECIFIC FINDINGS:', bold: true, size: 20, font: 'Calibri', color: NAVY })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Nature of offense:  ☐ Possession     ☐ Under the Influence     ☐ Distribution / Delivery     ☐ Paraphernalia only', size: 20, font: 'Calibri' }),
      ],
    }),
    labelLine('Substance description (type, amount, packaging)', 40),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'Substance secured by (name/role): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(36), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'SRO / Law enforcement notified?  ☐ Yes (Report #: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '____________', underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: ')     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Student appeared impaired?  ☐ Yes     ☐ No          Medical evaluation sought?  ☐ Yes     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItem('Substance logged as evidence with chain of custody documentation'),
    noticeBox('Distribution / delivery of controlled substances may require mandatory expulsion under TEC §37.007(d). Consult legal counsel before finalizing.'),
    noticeBox('Substance abuse counseling referral is recommended regardless of placement decision. Document referral in notes.'),
  ]

  return new Document({
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) } } },
      children: [
        ...docHeader('Drugs / Alcohol Possession or Use', 'OFFENSE TYPE: Drugs / Alcohol  |  TEC §37.006, §37.007'),
        ...section1_IncidentOverview('§37.006 (possession) / §37.007 (distribution)', 'Drugs / Alcohol — Possession or Use'),
        ...section2_StudentInfo(),
        ...section3_ImmediateActions(),
        ...section4_DueProcess(),
        ...section5_Timeline(),
        ...section6_StudentStatement(),
        ...section7_Witnesses(),
        ...section8_Evidence(),
        ...section9_Finding(offenseSpecific),
        ...certificationBlock(),
      ],
    }],
  })
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 3 — THREATS / TERRORISTIC THREAT
// ─────────────────────────────────────────────────────────────
function buildThreatsTemplate() {
  const offenseSpecific = [
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'THREATS — SPECIFIC FINDINGS:', bold: true, size: 20, font: 'Calibri', color: NAVY })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Threat type:  ☐ Verbal     ☐ Written / Note     ☐ Social Media / Online     ☐ Physical gesture     ☐ Combination', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Threat specificity:  ☐ Named target(s)     ☐ General/non-specific     ☐ Specific date or method referenced', size: 20, font: 'Calibri' }),
      ],
    }),
    labelLine('Target(s) identified in threat (initials only per FERPA, or "general student body")', 30),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'HB 3 Threat Assessment Team convened?  ☐ Yes — see Threat Assessment Log     ☐ No — explain:', size: 20, font: 'Calibri' }),
      ],
    }),
    ...writeArea('', 2),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Threat Level Determination (from Threat Assessment):  ☐ Level 1 — Low     ☐ Level 2 — Medium     ☐ Level 3 — High     ☐ Level 4 — Severe', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Law enforcement referral:  ☐ Yes — Penal Code §22.07 (Terroristic Threat) referral made     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItem('Target student(s) and family notified per FERPA guidelines'),
    checkItem('Safety plan established for target student(s) while investigation is ongoing'),
    noticeBox('Threat assessment is REQUIRED under Texas HB 3 regardless of whether the threat appears credible. Document the assessment and outcome in the Threat Assessment Log. Failure to document is a compliance gap.'),
  ]

  return new Document({
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) } } },
      children: [
        ...docHeader('Threats / Terroristic Threat', 'OFFENSE TYPE: Threats  |  TEC §37.006 / Penal Code §22.07  |  HB 3 Threat Assessment Required'),
        ...section1_IncidentOverview('TEC §37.006 / Penal Code §22.07 — Terroristic Threat', 'Threats / Terroristic Threat'),
        ...section2_StudentInfo(),
        ...section3_ImmediateActions(),
        ...section4_DueProcess(),
        ...section5_Timeline(),
        ...section6_StudentStatement(),
        ...section7_Witnesses(),
        ...section8_Evidence(),
        ...section9_Finding(offenseSpecific),
        ...certificationBlock(),
      ],
    }],
  })
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 4 — HARASSMENT / BULLYING / CYBERBULLYING
// ─────────────────────────────────────────────────────────────
function buildHarassmentTemplate() {
  const offenseSpecific = [
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'HARASSMENT / BULLYING — SPECIFIC FINDINGS:', bold: true, size: 20, font: 'Calibri', color: NAVY })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Type:  ☐ In-person bullying     ☐ Cyberbullying     ☐ Harassment (general)     ☐ Sexual harassment     ☐ Combination', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Conduct basis (if known):  ☐ Race/Ethnicity     ☐ Gender/Sex     ☐ Disability     ☐ Religion     ☐ National Origin     ☐ Sexual Orientation     ☐ No identified basis', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Pattern of behavior?  ☐ Yes — multiple incidents     ☐ No — single incident', size: 20, font: 'Calibri' }),
      ],
    }),
    labelLine('Dates of prior related incidents (if pattern)', 40),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'Target student impact:  ☐ Emotional distress reported     ☐ Absence attributed to bullying     ☐ Physical harm', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Cyberbullying: Platform / account: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(36), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: '   Screenshots secured?  ☐ Yes     ☐ No', size: 20, font: 'Calibri' }),
      ],
    }),
    checkItem('Victim support offered (counseling, safety plan)'),
    checkItem('Target family notified (FERPA — do not disclose subject identity or discipline)'),
    noticeBox('If conduct is based on a protected class (race, disability, sex, etc.): Title IX or Section 504/ADA obligations may apply. Contact district Title IX Coordinator and legal counsel before finalizing. OCR complaint risk is elevated.'),
    noticeBox('Mandatory DAEP applies if bullying prevented the victim from attending school, or if retaliation occurred after a report was made (TEC §37.006(a)(2)). Review SCOC carefully.'),
  ]

  return new Document({
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) } } },
      children: [
        ...docHeader('Harassment / Bullying / Cyberbullying', 'OFFENSE TYPE: Harassment / Bullying  |  TEC §37.006, §37.0832  |  Note Title IX / OCR obligations'),
        ...section1_IncidentOverview('TEC §37.006(a)(2) / §37.0832 (cyberbullying)', 'Harassment / Bullying / Cyberbullying'),
        ...section2_StudentInfo(),
        ...section3_ImmediateActions(),
        ...section4_DueProcess(),
        ...section5_Timeline(),
        ...section6_StudentStatement(),
        ...section7_Witnesses(),
        ...section8_Evidence(),
        ...section9_Finding(offenseSpecific),
        ...certificationBlock(),
      ],
    }],
  })
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 5 — GENERAL MISCONDUCT
// ─────────────────────────────────────────────────────────────
function buildGeneralTemplate() {
  const offenseSpecific = [
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'GENERAL MISCONDUCT — SPECIFIC FINDINGS:', bold: true, size: 20, font: 'Calibri', color: NAVY })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Offense classification per SCOC:  ☐ Level I     ☐ Level II     ☐ Level III     ☐ Level IV (mandatory)', size: 20, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: 'Is this a repeat offense?  ☐ Yes — prior incident(s) on: ', size: 20, font: 'Calibri' }),
        new TextRun({ text: '_'.repeat(30), underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Calibri' }),
        new TextRun({ text: '     ☐ No — first incident', size: 20, font: 'Calibri' }),
      ],
    }),
    ...writeArea('Describe what rule or policy was violated (cite SCOC section if known):', 2),
    ...writeArea('Describe any prior interventions or supports that were attempted before this incident:', 2),
    labelLine('Recommended intervention (in addition to or instead of removal)', 40),
  ]

  return new Document({
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25) } } },
      children: [
        ...docHeader('General Misconduct', 'OFFENSE TYPE: General Misconduct  |  Per District SCOC'),
        ...section1_IncidentOverview('Per District SCOC — consult TEC §37.005 (suspension) or §37.006 (DAEP) as applicable', 'General Misconduct'),
        ...section2_StudentInfo(),
        ...section3_ImmediateActions(),
        ...section4_DueProcess(),
        ...section5_Timeline(),
        ...section6_StudentStatement(),
        ...section7_Witnesses(),
        ...section8_Evidence(),
        ...section9_Finding(offenseSpecific),
        ...certificationBlock(),
      ],
    }],
  })
}

// ─────────────────────────────────────────────────────────────
// GENERATE ALL FIVE
// ─────────────────────────────────────────────────────────────
const templates = [
  { fn: buildFightingTemplate,   file: 'Investigation-Template-Fighting-Assault.docx',          label: 'Fighting / Assault' },
  { fn: buildDrugsTemplate,      file: 'Investigation-Template-Drugs-Alcohol.docx',              label: 'Drugs / Alcohol' },
  { fn: buildThreatsTemplate,    file: 'Investigation-Template-Threats.docx',                    label: 'Threats / Terroristic Threat' },
  { fn: buildHarassmentTemplate, file: 'Investigation-Template-Harassment-Bullying.docx',        label: 'Harassment / Bullying / Cyberbullying' },
  { fn: buildGeneralTemplate,    file: 'Investigation-Template-General-Misconduct.docx',         label: 'General Misconduct' },
]

console.log('\n🔨 Building Investigation Template Packet...\n')

for (const { fn, file, label } of templates) {
  const doc = fn()
  const buffer = await Packer.toBuffer(doc)
  writeFileSync(file, buffer)
  console.log(`  ✅  ${file}`)
}

console.log(`\n✅ All 5 templates built.`)
console.log(`\n   TpT Product: "Campus Administrator's Investigation Template Packet — Texas Edition"`)
console.log(`   → 5 offense-specific investigation forms`)
console.log(`   → Sections: Incident Overview, Student Info, Immediate Actions, Due Process,`)
console.log(`               Timeline, Student Statement, Witnesses, Evidence, Findings, Disposition, Certification`)
console.log(`   → Works in Microsoft Word and Google Docs (upload to Drive)`)
console.log(`   → Printable — landscape or portrait`)
console.log(`\n   Suggested TpT Price: $10 for the packet\n`)
