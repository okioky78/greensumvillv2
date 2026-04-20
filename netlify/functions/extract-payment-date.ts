import { api } from "../../server/config.ts";
import { extractPaymentDate } from "../../server/service/extract-payment-date.ts";
import { jsonResponse } from "../../server/shared/http.ts";

export default api.Post(
  async ({ request }) => {
    const body = await extractPaymentDate(request);

    return jsonResponse(200, body);
  },
);
