const { google } = require("googleapis");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const {
      paymentDate, amount, cardIssuer, approvalNumber,
      businessNumber, branch, studentName, remarks, paymentMethod,
    } = JSON.parse(event.body || "{}");

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const clientEmail = (
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      process.env.GOOGLE_SERVICE_ACCOUNT ||
      ""
    ).trim();

    // Base64 디코딩 (Express 버전과 동일)
    const base64Key = process.env.GOOGLE_PRIVATE_KEY || "";
    const privateKey = Buffer.from(base64Key, "base64").toString("utf8").trim();

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Google Sheets API credentials are not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your secrets.",
        }),
      };
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 첫 번째 시트 이름 동적으로 가져오기 (Express 버전과 동일)
    let firstSheetName = "Sheet1";
    try {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      firstSheetName =
        spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1";
    } catch (e) {
      console.warn("Could not fetch sheet name, defaulting to Sheet1", e);
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${firstSheetName}'!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          paymentDate, amount, cardIssuer, approvalNumber,
          businessNumber, branch, studentName, remarks, paymentMethod,
        ]],
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: "구글 시트 저장 완료" }),
    };
  } catch (e) {
    console.error("Sheet error:", e);
    const errorMsg = e.response?.data?.error?.message || e.message;
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "구글 시트 전송 실패: " + errorMsg }),
    };
  }
};