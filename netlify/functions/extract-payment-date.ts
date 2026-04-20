import { Post } from "../../server/api-runtime/api-handler.ts";
import { extractPaymentDateFromReceipt } from "../../server/integrations/receipt-ai.ts";
import { jsonResponse } from "../../server/shared/http.ts";
import { parseMultipartFormData } from "../../server/shared/multipart.ts";

export default Post(
  async ({ request }) => {
    const { file } = await parseMultipartFormData(request);
    const paymentDate = await extractPaymentDateFromReceipt(file);

    return jsonResponse(200, {
      paymentDate,
    });
  },
);
