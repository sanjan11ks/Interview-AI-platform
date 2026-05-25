const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const NAVY = '#0A1628';
const BLUE = '#3B82F6';
const CYAN = '#06B6D4';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const WHITE = '#FFFFFF';
const LIGHT_GREY = '#F3F4F6';
const MID_GREY = '#6B7280';
const DARK_GREY = '#1F2937';

function gradeColour(grade) {
  return { A: GREEN, B: CYAN, C: AMBER, D: '#EF4444' }[grade] || MID_GREY;
}

function scoreBar(doc, label, score, x, y, width = 300) {
  doc.fontSize(9).fillColor(MID_GREY).text(label, x, y);
  doc.rect(x, y + 14, width, 8).fillColor('#E5E7EB').fill();
  doc.rect(x, y + 14, Math.round((score / 100) * width), 8).fillColor(BLUE).fill();
  doc.fontSize(9).fillColor(DARK_GREY).text(`${score}`, x + width + 8, y + 12);
}

async function generateReport(session, questions, answers, finalAnalysis, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── Cover page ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 160).fill(NAVY);
    doc.fontSize(26).fillColor(WHITE).font('Helvetica-Bold')
      .text('Technical Interview Report', 50, 50, { width: 500 });
    doc.fontSize(12).fillColor(CYAN).font('Helvetica')
      .text('Confidential — For Internal Review Only', 50, 90);

    doc.fillColor(WHITE).fontSize(14).font('Helvetica-Bold')
      .text(session.candidate_name || 'Unknown Candidate', 50, 120);
    doc.fontSize(11).font('Helvetica').fillColor('#93C5FD')
      .text(`${session.confirmed_role}  •  ${new Date(session.created_at).toLocaleDateString()}`, 50, 140);

    // Score badge
    const score = Math.round(finalAnalysis.overall_score || 0);
    const grade = finalAnalysis.grade || 'N/A';
    doc.rect(doc.page.width - 130, 50, 80, 80).fillColor(gradeColour(grade)).fill();
    doc.fontSize(32).fillColor(WHITE).font('Helvetica-Bold')
      .text(grade, doc.page.width - 118, 72, { width: 56, align: 'center' });
    doc.fontSize(10).fillColor(WHITE).font('Helvetica')
      .text(`${score}/100`, doc.page.width - 118, 108, { width: 56, align: 'center' });

    doc.moveDown(6);

    // ── Executive Summary ────────────────────────────────────────────────────
    doc.addPage();
    sectionHeader(doc, 'Executive Summary');
    doc.fontSize(11).fillColor(DARK_GREY).font('Helvetica')
      .text(finalAnalysis.executive_summary || 'No summary available.', { lineGap: 4 });

    doc.moveDown();
    doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('Recommendation');
    doc.moveDown(0.3);
    const recColour = finalAnalysis.recommended_next_step?.includes('proceed') ? GREEN : AMBER;
    doc.rect(50, doc.y, doc.page.width - 100, 28).fillColor(recColour).fill();
    doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold')
      .text(finalAnalysis.recommended_next_step || 'Pending review', 58, doc.y - 22);

    doc.moveDown(2);

    // ── Competency scores ────────────────────────────────────────────────────
    sectionHeader(doc, 'Competency Overview');
    const cs = finalAnalysis.competency_scores || {};
    const competencies = [
      ['Technical Knowledge', cs.technical_knowledge || 0],
      ['Problem Solving', cs.problem_solving || 0],
      ['Communication', cs.communication || 0],
      ['Practical Experience', cs.practical_experience || 0],
    ];
    let cy = doc.y + 10;
    for (const [label, val] of competencies) {
      scoreBar(doc, label, val, 50, cy);
      cy += 32;
    }
    doc.y = cy + 10;

    // Role fit
    doc.fontSize(11).fillColor(DARK_GREY).font('Helvetica')
      .text(`Role Fit: ${finalAnalysis.role_fit_percentage || 0}%`, { continued: false });

    doc.moveDown();

    // Strengths + development areas
    twoColList(doc, 'Top Strengths', finalAnalysis.top_strengths || [],
      'Development Areas', finalAnalysis.development_areas || []);

    // ── Q&A Analysis ─────────────────────────────────────────────────────────
    doc.addPage();
    sectionHeader(doc, 'Question-by-Question Analysis');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = answers.find(a => a.question_id === q.id) || {};
      const analysis = ans.analysis_json ? JSON.parse(ans.analysis_json) : {};

      if (doc.y > doc.page.height - 200) doc.addPage();

      doc.moveDown(0.5);
      doc.rect(50, doc.y, doc.page.width - 100, 1).fillColor('#E5E7EB').fill();
      doc.moveDown(0.5);

      doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold')
        .text(`Q${i + 1}  [${q.competency} · ${q.difficulty}]  —  Score: ${ans.score || 0}/100`);
      doc.fontSize(10).fillColor(DARK_GREY).font('Helvetica-Oblique')
        .text(q.question_text, { lineGap: 2 });
      doc.moveDown(0.4);

      // Sub-scores
      const sb = analysis.score_breakdown || {};
      const subScores = [
        ['Technical Accuracy', sb.technical_accuracy || 0],
        ['Communication Clarity', sb.communication_clarity || 0],
        ['Depth of Knowledge', sb.depth_of_knowledge || 0],
        ['Practical Application', sb.practical_application || 0],
      ];
      let sy = doc.y;
      for (const [lbl, val] of subScores) {
        scoreBar(doc, lbl, val, 50, sy, 200);
        sy += 26;
      }
      doc.y = sy + 6;

      if (analysis.answer_summary) {
        doc.fontSize(10).fillColor(DARK_GREY).font('Helvetica')
          .text(`Summary: ${analysis.answer_summary}`, { lineGap: 2 });
      }
      if (analysis.evaluator_note) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor(MID_GREY).font('Helvetica-Oblique')
          .text(`Evaluator note: ${analysis.evaluator_note}`);
      }
    }

    // ── Hiring note ───────────────────────────────────────────────────────────
    if (finalAnalysis.hiring_note) {
      if (doc.y > doc.page.height - 150) doc.addPage();
      doc.moveDown(1);
      sectionHeader(doc, 'Private Hiring Note');
      doc.rect(50, doc.y, doc.page.width - 100, 4).fillColor(AMBER).fill();
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor(DARK_GREY).font('Helvetica-Oblique')
        .text(finalAnalysis.hiring_note);
    }

    // ── Footer on each page ───────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 30, doc.page.width, 30).fillColor(NAVY).fill();
      doc.fontSize(8).fillColor('#93C5FD').font('Helvetica')
        .text(
          `Confidential — For Internal Review Only | Generated by Interview AI | Page ${i + 1} of ${range.count}`,
          50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 }
        );
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

function sectionHeader(doc, title) {
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text(title);
  doc.rect(50, doc.y + 2, doc.page.width - 100, 2).fillColor(BLUE).fill();
  doc.moveDown(0.8);
}

function twoColList(doc, leftTitle, leftItems, rightTitle, rightItems) {
  const colWidth = (doc.page.width - 100) / 2 - 10;
  const startY = doc.y;

  doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold').text(leftTitle, 50, startY);
  leftItems.forEach((item, idx) => {
    doc.fontSize(10).fillColor(DARK_GREY).font('Helvetica')
      .text(`• ${item}`, 50, startY + 18 + idx * 16, { width: colWidth });
  });

  const rightX = 50 + colWidth + 20;
  doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold').text(rightTitle, rightX, startY);
  rightItems.forEach((item, idx) => {
    doc.fontSize(10).fillColor(DARK_GREY).font('Helvetica')
      .text(`• ${item}`, rightX, startY + 18 + idx * 16, { width: colWidth });
  });

  const maxItems = Math.max(leftItems.length, rightItems.length);
  doc.y = startY + 18 + maxItems * 16 + 10;
}

module.exports = { generateReport };
