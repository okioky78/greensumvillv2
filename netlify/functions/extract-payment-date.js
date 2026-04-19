import { getAuthenticatedOAuthClient } from "../../server/google-oauth/index.js";
import { extractPaymentDateFromReceipt } from "../../server/receipt-ai/index.js";
import {
  errorResponse,
  headersWithOptionalCookie,
  jsonResponse,
  methodNotAllowed,
  validateAllowedOrigin,
} from "../../server/shared/http.js";
import { parseMultipartFormData } from "../../server/shared/multipart.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  try {
    validateAllowedOrigin(event);

    const { setCookie } = await getAuthenticatedOAuthClient(event);
    const { file } = await parseMultipartFormData(event);
    const paymentDate = await extractPaymentDateFromReceipt(file);

    return jsonResponse(
      200,
      {
        paymentDate,
      },
      headersWithOptionalCookie(setCookie),
    );
  } catch (error) {
    return errorResponse(error, "결제일 추출 실패");
  }
};
