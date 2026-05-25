CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  candidate_name TEXT,
  candidate_email TEXT,
  resume_path TEXT,
  resume_text TEXT,
  detected_role TEXT,
  confirmed_role TEXT,
  experience_level TEXT,
  status TEXT DEFAULT 'pending',
  total_score REAL,
  report_path TEXT,
  final_analysis_json TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  sequence INTEGER,
  question_text TEXT,
  competency TEXT,
  difficulty TEXT,
  time_limit_seconds INTEGER DEFAULT 120,
  expected_keywords TEXT,
  follow_up_hint TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  question_id TEXT,
  recording_path TEXT,
  transcript TEXT,
  duration_seconds INTEGER,
  score REAL,
  analysis_json TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
