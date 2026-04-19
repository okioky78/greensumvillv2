import { extractPaymentDateFromReceipt } from "../../server/receipt-ai/index.ts";
import { Post } from "../../server/shared/api-handler.ts";
import { jsonResponse } from "../../server/shared/http.ts";
import { parseMultipartFormData } from "../../server/shared/multipart.ts";

export const handler = Post(
  async ({ event }) => {
    const { file } = await parseMultipartFormData(event);
    const paymentDate = await extractPaymentDateFromReceipt(file);

    return jsonResponse(200, {
      paymentDate,
    });
  },
);
