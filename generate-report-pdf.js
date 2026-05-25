const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, 'report-assets');
const PDF_OUT = path.join(__dirname, 'Interview_AI_Product_Report.pdf');

const NAVY = '#0A1628';
const BLUE = '#3B82F6';
const CYAN = '#06B6D4';
const WHITE = '#FFFFFF';
const LIGHT = '#F3F4F6';
const MID = '#6B7280';
const DARK = '#1F2937';

async function takeScreenshots() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();

  const shots = [];

  async function snap(url, name, waitMs = 1500) {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, waitMs));
    const fp = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: fp, fullPage: false });
    shots.push({ name, path: fp });
    console.log(`  Screenshot: ${name}`);
  }

  // Candidate side
  await snap(`${BASE}/`, '01_landing');
  await snap(`${BASE}/upload`, '02_upload');
  await snap(`${BASE}/done`, '03_thank_you');

  // Admin side
  await snap(`${BASE}/admin`, '04_admin_login');

  // Log into admin
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.type('input[type="password"]', 'admin123');
  await page.click('.btn-primary');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT_DIR, '05_admin_sessions.png'), fullPage: false });
  shots.push({ name: '05_admin_sessions', path: path.join(OUT_DIR, '05_admin_sessions.png') });
  console.log('  Screenshot: 05_admin_sessions');

  // Click first View button to see candidate detail
  const viewButtons = await page.$$('button');
  for (const btn of viewButtons) {
    const text = await page.evaluate(el => el.textContent.trim(), btn);
    if (text === 'View') { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT_DIR, '06_admin_detail_top.png'), fullPage: false });
  shots.push({ name: '06_admin_detail_top', path: path.join(OUT_DIR, '06_admin_detail_top.png') });
  console.log('  Screenshot: 06_admin_detail_top');

  // Scroll for competency scores
  await page.evaluate(() => window.scrollTo(0, 650));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, '07_admin_detail_scores.png'), fullPage: false });
  shots.push({ name: '07_admin_detail_scores', path: path.join(OUT_DIR, '07_admin_detail_scores.png') });
  console.log('  Screenshot: 07_admin_detail_scores');

  // Scroll for Q&A
  await page.evaluate(() => window.scrollTo(0, 1300));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, '08_admin_detail_qa.png'), fullPage: false });
  shots.push({ name: '08_admin_detail_qa', path: path.join(OUT_DIR, '08_admin_detail_qa.png') });
  console.log('  Screenshot: 08_admin_detail_qa');

  // Settings tab
  const tabs = await page.$$('button');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent.trim(), tab);
    if (text === 'Settings') { await tab.click(); break; }
  }
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT_DIR, '09_admin_settings.png'), fullPage: false });
  shots.push({ name: '09_admin_settings', path: path.join(OUT_DIR, '09_admin_settings.png') });
  console.log('  Screenshot: 09_admin_settings');

  await browser.close();
  return shots;
}

function buildPDF(shots) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  const pw = doc.page.width - 100; // usable width

  // ── Helper functions ──────────────────────────────────────────────
  function header(text, size = 20) {
    doc.fontSize(size).fillColor(NAVY).font('Helvetica-Bold').text(text);
    doc.rect(50, doc.y + 2, pw, 2).fillColor(BLUE).fill();
    doc.moveDown(0.6);
  }

  function body(text) {
    doc.fontSize(10.5).fillColor(DARK).font('Helvetica').text(text, { lineGap: 3 });
    doc.moveDown(0.5);
  }

  function caption(text) {
    doc.fontSize(9).fillColor(MID).font('Helvetica-Oblique').text(text, { align: 'center' });
    doc.moveDown(0.8);
  }

  function addImage(shotName) {
    const shot = shots.find(s => s.name === shotName);
    if (!shot || !fs.existsSync(shot.path)) return;
    const imgWidth = Math.min(pw, 460);
    const x = 50 + (pw - imgWidth) / 2;
    if (doc.y + 320 > doc.page.height - 60) doc.addPage();
    doc.image(shot.path, x, doc.y, { width: imgWidth });
    doc.moveDown(0.4);
    doc.y += 280;
  }

  // ══════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════════════════════════════
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);

  doc.fontSize(36).fillColor(WHITE).font('Helvetica-Bold')
    .text('Interview AI', 50, 200, { width: pw, align: 'center' });
  doc.fontSize(16).fillColor(CYAN).font('Helvetica')
    .text('AI-Powered Technical Interview Platform', 50, 250, { width: pw, align: 'center' });

  doc.moveDown(3);
  doc.fontSize(12).fillColor('#93C5FD').font('Helvetica')
    .text('Product Overview & Walkthrough', 50, 320, { width: pw, align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fillColor(MID)
    .text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 50, 360, { width: pw, align: 'center' });

  doc.fontSize(10).fillColor('#4B5563')
    .text('Confidential — Internal Use Only', 50, doc.page.height - 80, { width: pw, align: 'center' });

  // ══════════════════════════════════════════════════════════════════
  // TABLE OF CONTENTS
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  header('Table of Contents', 22);
  doc.moveDown(0.5);
  const toc = [
    '1. How It Works — Overview',
    '2. Candidate Flow',
    '   2.1  Landing Page',
    '   2.2  Resume Upload',
    '   2.3  Role Detection & Confirmation',
    '   2.4  Video Interview',
    '   2.5  Completion',
    '3. Admin Flow',
    '   3.1  Admin Login',
    '   3.2  Sessions Dashboard',
    '   3.3  Candidate Detail & Analysis',
    '   3.4  Settings (API Key Management)',
    '4. AI Analysis Process',
    '5. Technical Architecture',
  ];
  toc.forEach(line => {
    const indent = line.startsWith('   ') ? 30 : 0;
    doc.fontSize(11).fillColor(line.startsWith('   ') ? MID : DARK).font(line.startsWith('   ') ? 'Helvetica' : 'Helvetica-Bold')
      .text(line, 50 + indent);
    doc.moveDown(0.3);
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. HOW IT WORKS
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  header('1. How It Works — Overview');
  body(
    'Interview AI is an AI-powered technical interview platform that automates the screening process ' +
    'for tech candidates. It is designed as an analysis tool, not a filter — the goal is to understand ' +
    "a candidate's strengths, not eliminate them.\n\n" +
    'The platform uses Anthropic\'s Claude AI to:\n' +
    '  •  Detect the best-fit technical role from a candidate\'s resume\n' +
    '  •  Generate 6 adaptive, role-specific interview questions\n' +
    '  •  Analyse each answer for technical accuracy, communication, and depth\n' +
    '  •  Produce a detailed, downloadable PDF report for admin review\n\n' +
    'The entire flow takes approximately 15–20 minutes for a candidate.'
  );

  doc.moveDown(0.5);
  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('End-to-End Flow');
  doc.moveDown(0.3);
  body(
    '1. Candidate uploads resume (PDF, DOCX, or TXT)\n' +
    '2. AI analyses resume and detects the best-fit tech role\n' +
    '3. Candidate confirms or changes the role\n' +
    '4. AI generates 6 tailored interview questions\n' +
    '5. Candidate answers each question via webcam + microphone\n' +
    '6. Browser captures video recording + live speech-to-text transcript\n' +
    '7. AI scores and analyses each answer individually\n' +
    '8. AI generates a comprehensive final assessment\n' +
    '9. PDF report is generated and available for admin download\n' +
    '10. Admin reviews all sessions, scores, and reports in the dashboard'
  );

  // ══════════════════════════════════════════════════════════════════
  // 2. CANDIDATE FLOW
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  header('2. Candidate Flow');

  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('2.1  Landing Page');
  doc.moveDown(0.4);
  body(
    'The landing page is the first thing candidates see. It features a clean, dark-themed design with ' +
    'a bold headline: "Technical Interview. Reimagined." Two call-to-action buttons let users either ' +
    'start an interview or access the admin dashboard. Trust indicators at the bottom reassure candidates ' +
    'that the platform is AI-powered, recorded securely, and for assessment purposes only.'
  );
  addImage('01_landing');
  caption('Landing Page — Candidate entry point');

  doc.addPage();
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('2.2  Resume Upload');
  doc.moveDown(0.4);
  body(
    'Candidates enter their full name and email, then upload a resume via drag-and-drop or file picker. ' +
    'Accepted formats are PDF, DOC, DOCX, and TXT (max 5 MB). After uploading, the AI analyses the ' +
    'resume text and detects skills, experience level, and the best-fit technical role.'
  );
  addImage('02_upload');
  caption('Upload Page — Resume upload with drag-and-drop zone');

  doc.addPage();
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('2.3  Role Detection & Confirmation');
  doc.moveDown(0.4);
  body(
    'After upload, the AI shows its detected role (e.g. "Frontend Developer") with a confidence percentage, ' +
    'a list of detected skills as pill tags, and a summary of the candidate\'s background. The candidate ' +
    'can accept the detected role or override it using a dropdown menu with 14 supported tech roles.'
  );
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor(BLUE).font('Helvetica-Bold').text('Supported Roles:');
  doc.moveDown(0.3);
  body(
    'Frontend Developer • Backend Developer • Full Stack Developer • DevOps Engineer • ' +
    'Cybersecurity Analyst • UI/UX Designer • Mobile Developer • Data Engineer • ' +
    'ML/AI Engineer • SAP Consultant • Cloud Architect • QA Engineer • ' +
    'Blockchain Developer • Embedded Systems Engineer'
  );

  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('2.4  Video Interview');
  doc.moveDown(0.4);
  body(
    'The interview screen is split into two columns: the left shows the live webcam feed with a recording ' +
    'indicator, and the right displays the current question with competency/difficulty tags and a circular ' +
    'countdown timer.\n\n' +
    'For each question:\n' +
    '  •  A 5-second "prepare" countdown shows the question before recording starts\n' +
    '  •  Recording begins automatically (video + audio via MediaRecorder API)\n' +
    '  •  Speech recognition runs in parallel, showing a live ghost transcript on screen\n' +
    '  •  The countdown timer warns the candidate at 30 seconds remaining\n' +
    '  •  When time expires (or the candidate clicks "Stop & Submit"), recording stops\n' +
    '  •  The video blob and transcript are sent to the server\n' +
    '  •  AI analyses the answer before moving to the next question'
  );

  doc.addPage();
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('2.5  Completion');
  doc.moveDown(0.4);
  body(
    'After all questions are answered, the candidate sees a confirmation page with an animated checkmark. ' +
    'No scores or analysis are shown to the candidate — the page simply confirms their interview was ' +
    'recorded and submitted, and that the team will review it.'
  );
  addImage('03_thank_you');
  caption('Thank You Page — Shown after interview completion');

  // ══════════════════════════════════════════════════════════════════
  // 3. ADMIN FLOW
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  header('3. Admin Flow');

  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('3.1  Admin Login');
  doc.moveDown(0.4);
  body(
    'The admin dashboard is protected by a simple password gate. The default password is "admin123" ' +
    '(configurable in the .env file). After logging in, the admin has access to all interview sessions.'
  );
  addImage('04_admin_login');
  caption('Admin Login — Password-protected access');

  doc.addPage();
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('3.2  Sessions Dashboard');
  doc.moveDown(0.4);
  body(
    'The sessions list shows all completed interviews with the candidate\'s name, email, detected role, ' +
    'date, status badge (pending / in progress / analysed), and overall score. Each row has a "View" ' +
    'button for the full analysis and a "PDF" button to download the generated report.'
  );
  addImage('05_admin_sessions');
  caption('Admin Dashboard — All interview sessions at a glance');

  doc.addPage();
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('3.3  Candidate Detail & Analysis');
  doc.moveDown(0.4);
  body(
    'Clicking "View" opens the full analysis for a candidate. This includes:'
  );
  doc.moveDown(0.3);
  body(
    '  •  Score Gauge — Overall score out of 100 with a letter grade (A/B/C/D)\n' +
    '  •  Executive Summary — A 3–4 paragraph AI-written assessment\n' +
    '  •  Recommended Next Step — e.g. "proceed to technical round" or "skill gap training"\n' +
    '  •  Competency Scores — Bar charts for Technical Knowledge, Problem Solving,\n' +
    '     Communication, and Practical Experience (each 0–100)\n' +
    '  •  Top Strengths & Development Areas — Listed side by side\n' +
    '  •  Question-by-Question Accordion — Each question expandable with sub-scores,\n' +
    '     strengths, areas to explore, answer summary, and evaluator note\n' +
    '  •  Private Hiring Note — Honest internal note only visible to admins'
  );

  addImage('06_admin_detail_top');
  caption('Candidate Detail — Score gauge, name, role, and executive summary');

  doc.addPage();
  addImage('07_admin_detail_scores');
  caption('Competency Scores — Bar charts for each skill dimension');

  doc.moveDown(1);
  addImage('08_admin_detail_qa');
  caption('Question-by-Question Analysis — Expandable accordion with per-question scores');

  doc.addPage();
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text('3.4  Settings (API Key Management)');
  doc.moveDown(0.4);
  body(
    'The Settings tab lets admins update the Anthropic API key directly from the dashboard — no need to ' +
    'edit config files. It shows the current key (masked for security), provides an input to enter a new ' +
    'key, and displays system info (model name, database type, storage type).'
  );
  addImage('09_admin_settings');
  caption('Settings Page — API key management and system info');

  // ══════════════════════════════════════════════════════════════════
  // 4. AI ANALYSIS PROCESS
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  header('4. AI Analysis Process');

  body('The platform makes four distinct AI calls during each interview session:');
  doc.moveDown(0.5);

  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('4.1  Role Detection');
  doc.moveDown(0.3);
  body(
    'Input: Full resume text extracted from the uploaded file.\n' +
    'Output: Primary role (from 14 options), confidence score (0–1), detected skills, experience level ' +
    '(junior/mid/senior/lead), a 2–3 sentence summary, and secondary role suggestions.'
  );

  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('4.2  Question Generation');
  doc.moveDown(0.3);
  body(
    'Input: Confirmed role, detected skills, and experience level.\n' +
    'Output: 6 questions with a mix of competency areas — 1–2 conceptual/theory, 2–3 practical/scenario, ' +
    '1 problem-solving, and 1 behavioural. Each question includes difficulty level, time limit, expected ' +
    'keywords, and a follow-up hint (never shown to the candidate).'
  );

  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('4.3  Per-Answer Analysis');
  doc.moveDown(0.3);
  body(
    'Input: The question, speech-to-text transcript, role, and time taken.\n' +
    'Output: Score 0–100 with a four-part breakdown (technical accuracy, communication clarity, depth ' +
    'of knowledge, practical application — each 0–25), keywords mentioned vs missed, strengths, areas ' +
    'to explore, a neutral answer summary, and a constructive evaluator note.'
  );

  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('4.4  Final Session Analysis');
  doc.moveDown(0.3);
  body(
    'Input: All question summaries and individual scores.\n' +
    'Output: Overall score 0–100, letter grade (A/B/C/D), role fit percentage, a multi-paragraph executive ' +
    'summary, competency scores across four dimensions, top strengths, development areas, recommended ' +
    'next step, alternative role suggestions, and a private hiring note.'
  );

  // ══════════════════════════════════════════════════════════════════
  // 5. TECHNICAL ARCHITECTURE
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  header('5. Technical Architecture');

  const layers = [
    ['Frontend', 'React 18 + Vite, Tailwind CSS, React Router'],
    ['Backend', 'Node.js + Express, RESTful API on port 3001'],
    ['AI Engine', 'Anthropic Claude API (claude-haiku-4-5)'],
    ['Database', 'SQLite via better-sqlite3 (local file)'],
    ['Video Capture', 'Browser MediaRecorder API (WebM/VP9)'],
    ['Speech-to-Text', 'Web Speech API (browser-native)'],
    ['PDF Reports', 'PDFKit (server-side generation)'],
    ['File Storage', 'Local filesystem (resumes, recordings, reports)'],
  ];

  layers.forEach(([layer, tech]) => {
    doc.fontSize(10.5).fillColor(NAVY).font('Helvetica-Bold').text(`${layer}: `, { continued: true });
    doc.font('Helvetica').fillColor(DARK).text(tech);
    doc.moveDown(0.3);
  });

  doc.moveDown(1);
  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('File Structure');
  doc.moveDown(0.4);
  doc.fontSize(9).fillColor(DARK).font('Courier').text(
    'interview-agent/\n' +
    '  server/\n' +
    '    index.js              Express API entry point\n' +
    '    services/claude.js    All AI calls (role detect, questions, analysis)\n' +
    '    services/parser.js    Resume text extraction (PDF/DOCX/TXT)\n' +
    '    services/reportGenerator.js   PDF report builder\n' +
    '    routes/               upload, interview, recording, analysis, admin\n' +
    '    db/                   SQLite schema and database module\n' +
    '  client/src/\n' +
    '    pages/                Landing, Upload, RoleConfirm, Interview, ThankYou, Admin\n' +
    '    components/           VideoRecorder, QuestionCard, CountdownTimer, etc.\n' +
    '  tests/                  End-to-end test scenarios for 4 roles\n' +
    '  .env                    API keys and configuration'
  );

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue; // skip cover page
    doc.fontSize(8).fillColor(MID).font('Helvetica')
      .text(
        `Interview AI — Product Report | Page ${i + 1} of ${range.count}`,
        50, doc.page.height - 30, { width: pw, align: 'center' }
      );
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(PDF_OUT));
    stream.on('error', reject);
  });
}

async function main() {
  console.log('Taking screenshots...');
  const shots = await takeScreenshots();
  console.log(`\nCaptured ${shots.length} screenshots.\n`);

  console.log('Building PDF report...');
  const pdfPath = await buildPDF(shots);
  console.log(`\nPDF report generated: ${pdfPath}`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
