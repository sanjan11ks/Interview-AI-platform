const fs = require('fs');
const path = require('path');

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return extractFromPdf(filePath);
  }
  if (ext === '.docx' || ext === '.doc') {
    return extractFromDocx(filePath);
  }
  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

async function extractFromPdf(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    if (!text || text.length < 50) {
      throw new Error('PDF appears to be image-based or empty');
    }
    return text;
  } catch (err) {
    if (err.message.includes('image-based')) throw err;
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

async function extractFromDocx(filePath) {
  try {
    // mammoth is optional — try to load it
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();
    if (!text || text.length < 50) {
      throw new Error('DOCX appears to be empty');
    }
    return text;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error('DOCX parsing requires the mammoth package. Please upload a PDF instead.');
    }
    throw new Error(`Failed to parse DOCX: ${err.message}`);
  }
}

module.exports = { extractTextFromFile };
