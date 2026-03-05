const { google } = require("googleapis");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!email || !key || !sheetId) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error:
            "서버 환경변수 누락: GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_SHEET_ID 확인",
        }),
      };
    }

    const data = JSON.parse(event.body || "{}");

    const auth = new google.auth.JWT(
      email,
      null,
      key.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    // ✅ App.tsx 데이터 키 그대로 매핑
    const values = [[
      data.paymentDate || "",
      data.amount || "",
      data.cardIssuer || "",
      data.approvalNumber || "",
      data.businessNumber || "",
      data.studentName || "",
      data.remarks || "",
      data.branch || "",
      data.paymentMethod || "",
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: "구글 시트 저장 완료" }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
