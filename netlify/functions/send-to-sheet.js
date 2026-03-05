const { google } = require("googleapis");

exports.handler = async (event) => {
  try {

    const data = JSON.parse(event.body);

    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const values = [[
      data.date,
      data.amount,
      data.card,
      data.approval,
      data.business,
      data.student,
      data.memo,
      data.branch,
      data.payment
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "구글 시트 저장 완료"
      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    };

  }
};
