exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "send-to-sheet function OK",
        received: body,
      }),
    };
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: e.message,
      }),
    };
  }
};
