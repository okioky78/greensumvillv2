import { GoogleGenAI, Type } from "@google/genai";
import { createHttpError } from "../shared/http.js";
import { normalizePaymentDate } from "../shared/filename.js";
import { withUpstreamTimeout } from "../shared/upstream.js";

const getGeminiApiKey = () => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    throw createHttpError("Gemini API 키가 설정되지 않았습니다. GEMINI_API_KEY를 확인해 주세요.", 500, "MISSING_GEMINI_API_KEY");
  }

  return apiKey;
};

const fileToGenerativePart = (file) => ({
  inlineData: {
    data: file.buffer.toString("base64"),
    mimeType: file.mimeType || "image/jpeg",
  },
});

export const extractPaymentDateFromReceipt = async (file) => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await withUpstreamTimeout(
    ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            fileToGenerativePart(file),
            {
              text: [
                "영수증 또는 매출전표 이미지에서 결제일만 추출해 주세요.",
                "반드시 YYYY-MM-DD 형식으로 응답해 주세요.",
                "결제일을 확실히 찾을 수 없으면 빈 문자열을 반환해 주세요.",
              ].join("\n"),
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            paymentDate: { type: Type.STRING },
          },
          required: ["paymentDate"],
        },
      },
    }),
    {
      message: "AI 결제일 추출 응답 시간이 초과되었습니다.",
      code: "AI_TIMEOUT",
    },
  );

  if (!response.text) {
    throw createHttpError("AI 응답을 받지 못했습니다. 다시 시도해 주세요.", 502, "EMPTY_AI_RESPONSE");
  }

  let result;
  try {
    result = JSON.parse(response.text);
  } catch {
    throw createHttpError("AI 응답 형식을 해석하지 못했습니다. 다시 시도해 주세요.", 502, "INVALID_AI_RESPONSE");
  }

  const paymentDate = normalizePaymentDate(result.paymentDate || "");

  if (!paymentDate) {
    throw createHttpError("결제일을 찾지 못했습니다. 직접 입력해 주세요.", 422, "PAYMENT_DATE_NOT_FOUND");
  }

  return paymentDate;
};
