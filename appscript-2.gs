/**
 * appscript.gs
 *
 * Google Apps Script Web App that receives exam result submissions
 * (sent as JSON via POST from script.js) and appends a row to the
 * linked Google Sheet.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. In the Sheet, go to Extensions > Apps Script.
 * 3. Delete any starter code and paste this entire file in.
 * 4. In the first sheet (rename it "Results" or update SHEET_NAME below),
 *    add this header row in row 1:
 *    Timestamp | Student Name | Class | Total Questions | Correct Answers |
 *    Wrong Answers | Score (%) | Grade | Time Used | Status
 * 5. Click Deploy > New deployment > Select type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployment URL and paste it into GOOGLE_SCRIPT_URL in script.js.
 */

const SHEET_NAME = "Results"; // change if your sheet tab has a different name

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
      || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);

    // Ensure header row exists
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Student Name", "Class", "Total Questions",
        "Correct Answers", "Wrong Answers", "Score (%)", "Grade",
        "Time Used", "Status"
      ]);
    }

    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.name || "",
      data.class || "",
      data.total || 0,
      data.correct || 0,
      data.wrong || 0,
      data.percentage || 0,
      data.grade || "",
      data.timeUsed || "",
      data.status || "Submitted"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "Online", message: "BISEASE SHS Exam Results endpoint is active." }))
    .setMimeType(ContentService.MimeType.JSON);
}
