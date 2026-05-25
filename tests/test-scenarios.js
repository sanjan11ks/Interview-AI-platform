require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

const TEST_SCENARIOS = [
  {
    name: 'Frontend Developer',
    resumeFile: 'tests/resume-samples/frontend-dev.txt',
    expectedRole: 'Frontend Developer',
    mockTranscripts: [
      'React hooks allow functional components to use state and lifecycle methods. useState manages local state, useEffect handles side effects like API calls and subscriptions, and useMemo and useCallback optimise performance by memoising values and functions.',
      'I would approach this by breaking the component into smaller pieces, using React.memo for pure components and useCallback for event handlers passed as props.',
      'I\'ve built a dashboard application using React and TypeScript. I set up a custom hook for data fetching with loading and error states, and used Context API for global state management.',
      'The virtual DOM is a lightweight JavaScript representation of the actual DOM. React uses it to batch updates and calculate the minimal set of changes required, making updates efficient.',
      'I handled CSS specificity conflicts by adopting a BEM naming convention and using CSS Modules to scope styles to components, eliminating global conflicts.',
      'When the site was slow on mobile, I used Lighthouse to identify large images and render-blocking scripts. I implemented lazy loading, code splitting with dynamic imports, and optimised images to WebP format.',
    ],
  },
  {
    name: 'Cybersecurity Analyst',
    resumeFile: 'tests/resume-samples/cybersecurity.txt',
    expectedRole: 'Cybersecurity Analyst',
    mockTranscripts: [
      'A penetration test simulates a real-world attack to identify vulnerabilities before malicious actors do. It differs from a vulnerability assessment, which only identifies and reports weaknesses without exploiting them.',
      'I would first isolate the affected systems to contain the breach, then preserve logs for forensic analysis. After notifying stakeholders, I\'d investigate the attack vector and implement remediation steps.',
      'SQL injection occurs when user input is included in a database query without sanitisation. The fix is to use parameterised queries or prepared statements, which separate data from code.',
      'Zero-trust architecture operates on the principle of never trust, always verify. Every user and device must authenticate and authorise for every resource request, regardless of network location.',
      'I used SIEM tools like Splunk to correlate logs across multiple systems. I created detection rules for anomalous login attempts and set up automated alerts for high-severity events.',
      'I prioritise vulnerabilities based on CVSS scores, exploitability, and business impact. Critical assets with publicly known exploits get patched immediately, while lower-risk items follow a scheduled cadence.',
    ],
  },
  {
    name: 'SAP Consultant',
    resumeFile: 'tests/resume-samples/sap-consultant.txt',
    expectedRole: 'SAP Consultant',
    mockTranscripts: [
      'SAP S/4HANA is the fourth-generation ERP suite built on the in-memory HANA database. It simplifies the data model compared to ECC and offers embedded analytics and a Fiori-based user interface.',
      'During a recent SAP FI implementation, we discovered the client\'s chart of accounts didn\'t align with IFRS requirements. I worked with finance stakeholders to redesign the account structure before go-live.',
      'I configured the material ledger in SAP to support actual costing, mapping the client\'s cost allocation requirements to standard SAP account-based COPA.',
      'Transport management in SAP involves moving changes through the landscape: development to QA to production. I always test in QA thoroughly and use the SE10 transaction to manage transport requests.',
      'I facilitated workshops with end users to document as-is processes using BPMN notation, then mapped gaps against standard SAP best practices to design the to-be configuration.',
      'User training is critical to adoption. I created role-based training materials and ran hands-on sessions in the sandbox environment, then provided hypercare support during the first two weeks post go-live.',
    ],
  },
  {
    name: 'UI/UX Designer',
    resumeFile: 'tests/resume-samples/ux-designer.txt',
    expectedRole: 'UI/UX Designer',
    mockTranscripts: [
      'My design process starts with empathy research — user interviews and contextual enquiry — then moves to defining the problem statement, ideating solutions through sketching, prototyping in Figma, and iterating based on usability testing.',
      'I ran five usability tests with representative users, observing where they hesitated or made errors. The biggest insight was that our navigation labels were too technical, so we simplified them using plain language.',
      'I approach accessibility by following WCAG 2.1 AA guidelines: sufficient colour contrast ratios, keyboard navigability, ARIA labels for interactive elements, and testing with screen readers like NVDA.',
      'I present design decisions with supporting research data. If a stakeholder pushes back, I offer to run an A/B test or usability study to let user evidence guide the decision rather than opinion.',
      'I reduced friction in the checkout flow by eliminating unnecessary form fields, enabling guest checkout, and adding inline validation. Conversion improved by 18% in the A/B test.',
      'I balance aesthetics and usability by starting with usability constraints — information hierarchy, touch target sizes, readability — then applying brand guidelines within those guardrails. Function leads, then form enhances it.',
    ],
  },
];

function createSampleResumes() {
  const dir = path.join(__dirname, 'resume-samples');
  fs.mkdirSync(dir, { recursive: true });

  const samples = {
    'frontend-dev.txt': `Jane Smith\njane@example.com | github.com/janesmith\n\nSKILLS\nJavaScript, TypeScript, React, Next.js, Vue.js, HTML5, CSS3, Tailwind CSS\nWebpack, Vite, Jest, Cypress, Git, GitHub Actions, Docker\n\nEXPERIENCE\nSenior Frontend Developer — Acme Corp (2021–Present)\n- Led migration from class components to React hooks, reducing bundle size by 30%\n- Built design system with 40+ reusable components used across 5 products\n- Implemented CI/CD pipeline with automated visual regression testing\n\nFrontend Developer — Startup Inc (2019–2021)\n- Developed responsive React SPA with real-time data visualisation using D3.js\n- Collaborated with UX team to improve Core Web Vitals scores by 45%\n\nEDUCATION\nBSc Computer Science — University of Cape Town (2019)`,

    'cybersecurity.txt': `Michael Chen\nmichael@example.com | linkedin.com/in/michaelchen\n\nCERTIFICATIONS\nCISSP, CEH, CompTIA Security+, OSCP\n\nSKILLS\nPenetration Testing, SIEM (Splunk, QRadar), Vulnerability Assessment, Incident Response\nNetwork Security, Firewalls, IDS/IPS, OWASP Top 10, Python, Bash scripting\nThreat Intelligence, ISO 27001, NIST Framework, Digital Forensics\n\nEXPERIENCE\nSenior Cybersecurity Analyst — TechBank (2020–Present)\n- Conducted 20+ internal and external penetration tests annually\n- Built SIEM detection rules reducing mean time to detect by 60%\n- Led incident response for two major ransomware events\n\nSOC Analyst — SecureNet (2018–2020)\n- Monitored 500+ security events daily using Splunk\n- Developed playbooks for phishing and malware incident types\n\nEDUCATION\nBSc Information Security — Wits University (2018)`,

    'sap-consultant.txt': `Priya Naidoo\npriya@example.com\n\nSKILLS\nSAP S/4HANA, SAP ECC, SAP FI/CO, SAP MM, SAP SD, SAP BW\nSAP Fiori, ABAP (basic), SAP Solution Manager, Transport Management\nProject Management, Business Process Reengineering, IFRS\n\nEXPERIENCE\nSenior SAP FI/CO Consultant — Deloitte (2019–Present)\n- Delivered 3 full-cycle SAP S/4HANA implementations in manufacturing sector\n- Configured New GL, Profit Centre Accounting and Material Ledger\n- Designed and delivered end-user training for 200+ users\n\nSAP Consultant — BigCo Advisory (2016–2019)\n- Supported SAP ECC upgrades and rollouts across 5 countries\n- Created functional specifications for ABAP development team\n\nEDUCATION\nBCom Accounting — University of Pretoria (2016)\nSAP Certified Application Associate — Financial Accounting (2017)`,

    'ux-designer.txt': `Amara Osei\namara@example.com | dribbble.com/amaradesigns\n\nSKILLS\nFigma, Adobe XD, Sketch, InVision, Principle\nUser Research, Usability Testing, Wireframing, Prototyping\nDesign Systems, WCAG Accessibility, Information Architecture\nHTML/CSS (basic), Hotjar, Maze, UserTesting.com\n\nEXPERIENCE\nSenior UX Designer — FinTech Corp (2021–Present)\n- Redesigned mobile onboarding flow, reducing drop-off by 35%\n- Built and maintained design system used by 12 designers and 8 developers\n- Ran 30+ usability research studies and moderated user interviews\n\nUX Designer — Agency Works (2018–2021)\n- Delivered UX for e-commerce, healthcare, and SaaS clients\n- Introduced design critique sessions improving collaboration between design and engineering\n\nEDUCATION\nBA Interaction Design — Stellenbosch University (2018)`,
  };

  for (const [name, content] of Object.entries(samples)) {
    const filepath = path.join(dir, name);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, content);
      console.log(`  Created sample: ${name}`);
    }
  }
}

async function apiRequest(method, path, body, isFormData = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: isFormData ? body.getHeaders() : { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', reject);

    if (isFormData) {
      body.pipe(req);
    } else {
      if (body) req.write(JSON.stringify(body));
      req.end();
    }
  });
}

async function runScenario(scenario) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`${'─'.repeat(60)}`);

  const resumePath = path.join(__dirname, '..', scenario.resumeFile);
  if (!fs.existsSync(resumePath)) {
    console.log(`  SKIP: resume file not found: ${scenario.resumeFile}`);
    return false;
  }

  let passed = 0;
  let failed = 0;

  function check(label, condition, detail = '') {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  // Step 1: Upload resume
  console.log('\n  Step 1: Upload resume + role detection');
  const form = new FormData();
  form.append('resume', fs.createReadStream(resumePath));
  form.append('candidateName', 'Test Candidate');
  form.append('candidateEmail', 'test@example.com');

  const uploadRes = await apiRequest('POST', '/api/upload/resume', form, true);
  check('Upload returns 200', uploadRes.status === 200);
  check('Session ID returned', !!uploadRes.body.sessionId);
  check('Role detected', !!uploadRes.body.detectedRole, uploadRes.body.detectedRole);
  check(
    `Role matches expected (${scenario.expectedRole})`,
    uploadRes.body.detectedRole === scenario.expectedRole,
    `got: ${uploadRes.body.detectedRole}`
  );

  if (!uploadRes.body.sessionId) {
    console.log('  ABORT: No session ID, cannot continue.');
    return false;
  }

  const { sessionId } = uploadRes.body;

  // Step 2: Generate questions
  console.log('\n  Step 2: Generate questions');
  const startRes = await apiRequest('POST', '/api/interview/start', {
    sessionId,
    confirmedRole: scenario.expectedRole,
  });
  check('Start returns 200', startRes.status === 200);
  check('Questions returned', Array.isArray(startRes.body.questions));
  const qCount = startRes.body.questions?.length || 0;
  check(`Question count 5-7 (got ${qCount})`, qCount >= 5 && qCount <= 7);

  const competencies = startRes.body.questions?.map(q => q.competency) || [];
  check('Has conceptual question', competencies.some(c => c === 'conceptual'));
  check('Has practical question', competencies.some(c => c === 'practical'));

  if (!startRes.body.questions?.length) {
    console.log('  ABORT: No questions generated.');
    return false;
  }

  const questions = startRes.body.questions;

  // Step 3: Submit mock transcripts
  console.log('\n  Step 3: Submit mock transcripts + per-answer analysis');
  for (let i = 0; i < Math.min(questions.length, scenario.mockTranscripts.length); i++) {
    const q = questions[i];
    const transcript = scenario.mockTranscripts[i];

    await apiRequest('POST', '/api/recording/transcript', {
      sessionId, questionId: q.id, transcript, durationSeconds: 90,
    });

    const analysisRes = await apiRequest('POST', '/api/analysis/answer', { sessionId, questionId: q.id });
    check(
      `Q${i + 1} analysis: score 0-100 (${analysisRes.body.score})`,
      typeof analysisRes.body.score === 'number' &&
      analysisRes.body.score >= 0 && analysisRes.body.score <= 100
    );
    check(`Q${i + 1} analysis has structure`, !!analysisRes.body.analysis?.score_breakdown);
  }

  // Step 4: Finalise
  console.log('\n  Step 4: Final analysis + PDF report');
  const finalRes = await apiRequest('POST', '/api/analysis/finalise', { sessionId });
  check('Finalise returns 200', finalRes.status === 200);
  check('Overall score present', typeof finalRes.body.overallScore === 'number');
  check('Grade present', ['A', 'B', 'C', 'D'].includes(finalRes.body.grade));

  // Step 5: Admin API
  console.log('\n  Step 5: Admin API retrieval');
  const adminRes = await apiRequest('GET', `/api/admin/session/${sessionId}?token=${process.env.ADMIN_PASSWORD || 'admin123'}`);
  check('Admin session detail returns 200', adminRes.status === 200);
  check('Final analysis in admin response', !!adminRes.body.finalAnalysis);
  check('Q&A data in admin response', Array.isArray(adminRes.body.qa));

  console.log(`\n  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function main() {
  console.log('Interview Agent — Test Scenarios');
  console.log('=================================');
  console.log(`Server: ${BASE_URL}\n`);

  // Create sample resumes if needed
  createSampleResumes();

  // Check server is running
  try {
    const health = await apiRequest('GET', '/api/health');
    if (health.status !== 200) throw new Error('Not 200');
    console.log('Server health: OK');
  } catch {
    console.error('\nERROR: Server is not running. Start it with: npm run server\n');
    process.exit(1);
  }

  let allPassed = 0;
  let allFailed = 0;

  for (const scenario of TEST_SCENARIOS) {
    try {
      const passed = await runScenario(scenario);
      if (passed) allPassed++; else allFailed++;
    } catch (err) {
      console.error(`  ERROR in scenario ${scenario.name}:`, err.message);
      allFailed++;
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Final: ${allPassed}/${TEST_SCENARIOS.length} scenarios passed`);
  console.log(`${'═'.repeat(60)}`);
  process.exit(allFailed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
