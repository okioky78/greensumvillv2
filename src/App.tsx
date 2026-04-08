import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Send, Database, RotateCcw } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import { useDropzone, type DropzoneOptions, type FileRejection } from "react-dropzone";

interface ExtractedData {
  paymentDate: string;
  amount: string;
  cardIssuer: string;
  approvalNumber: string;
  businessNumber: string;
  branch: string;
  studentName: string;
  remarks: string;
  paymentMethod: string;
}

const BRANCHES = ["그린섬", "디자인", "프리어", "목동", "강남", "분당", "홍프", "강프", "하이섬", "애니섬"];
const PAYMENT_METHODS = ["카드", "현영", "입금"];
const DROPZONE_ACCEPT = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
  "application/pdf": [".pdf"],
} as const;

const UPLOAD_BOX_STYLES = {
  idle: {
    box: "border-neutral-200 hover:border-neutral-300 bg-white shadow-sm",
    iconContainer: "bg-neutral-100",
    icon: "text-neutral-400",
  },
  selected: {
    box: "border-emerald-200 bg-emerald-50/30",
    iconContainer: "bg-neutral-100",
    icon: "text-neutral-400",
  },
  active: {
    box: "border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100",
    iconContainer: "bg-emerald-100",
    icon: "text-emerald-600",
  },
  reject: {
    box: "border-red-300 bg-red-50/40",
    iconContainer: "bg-red-100",
    icon: "text-red-500",
  },
} as const;

const UPLOAD_BOX_PROMPTS = {
  idle: "파일을 선택하거나 드래그하세요",
  selected: "파일을 선택하거나 드래그하세요",
  active: "여기에 파일을 놓으세요",
  reject: "이미지 또는 PDF 파일 한 개만 업로드할 수 있습니다",
} as const;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setData(null);

    const isImage = selectedFile.type.startsWith("image/");
    const isHEIC = selectedFile.name.toLowerCase().endsWith(".heic") || selectedFile.type === "image/heic";
    const isPDF = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (isImage && !isHEIC) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      return;
    }

    if (isHEIC) {
      setPreview("heic");
      return;
    }

    if (isPDF) {
      setPreview("pdf");
      return;
    }

    setPreview(null);
  };

  const handleDropAccepted = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile);
  };

  const handleDropRejected = (fileRejections: FileRejection[]) => {
    setSuccess(null);

    if (fileRejections.some((rejection) => rejection.errors.some((error) => error.code === "too-many-files"))) {
      setError("현재는 한 번에 하나의 파일만 업로드할 수 있습니다.");
      return;
    }

    setError("이미지 또는 PDF 파일만 업로드할 수 있습니다.");
  };

  const dropzoneOptions: DropzoneOptions = {
    accept: DROPZONE_ACCEPT,
    multiple: false,
    maxFiles: 1,
    onDropAccepted: handleDropAccepted,
    onDropRejected: handleDropRejected,
    onDragEnter: undefined,
    onDragOver: undefined,
    onDragLeave: undefined,
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneOptions);
  const uploadState = isDragReject ? "reject" : isDragActive ? "active" : file ? "selected" : "idle";
  const uploadBoxStyle = UPLOAD_BOX_STYLES[uploadState];
  const uploadPrompt = UPLOAD_BOX_PROMPTS[uploadState];

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.readAsDataURL(file);
    });

    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    setData(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API 키가 설정되지 않았습니다. 관리자에게 문의하세요.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      const prompt = "매출전표(영수증)에서 다음 정보를 추출해 주세요: 결제일(paymentDate, YYYY/MM/DD 형식), 금액(amount, 숫자만), 매입카드사(cardIssuer), 승인번호(approvalNumber), 결제회사 사업자번호(businessNumber, 000-00-00000 형식). JSON 형식으로 응답해 주세요.";

      const imagePart = await fileToGenerativePart(file);

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [imagePart, { text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              paymentDate: { type: Type.STRING },
              amount: { type: Type.STRING },
              cardIssuer: { type: Type.STRING },
              approvalNumber: { type: Type.STRING },
              businessNumber: { type: Type.STRING },
            },
            required: ["paymentDate", "amount", "cardIssuer", "approvalNumber", "businessNumber"],
          },
        },
      });

      if (!response || !response.text) {
        throw new Error("AI 응답을 받지 못했습니다. 다시 시도해 주세요.");
      }

      const result = JSON.parse(response.text);
      setData({ ...result, branch: BRANCHES[0], paymentMethod: PAYMENT_METHODS[0], studentName: "", remarks: "" });
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "정보 추출 중 오류가 발생했습니다.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSendToSheet = async () => {
    if (!data) return;

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/send-to-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const text = await response.text();
      const errData: any = JSON.parse(text);
    
      if (!response.ok) {
        throw new Error(errData?.error || text || "구글 시트 전송 실패");
      }

      setSuccess("구글 시트에 성공적으로 전송되었습니다!");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setIsExtracting(false);
    setIsSending(false);
    setData(null);
    setError(null);
    setSuccess(null);
  };

  const handleDataChange = (key: keyof ExtractedData, value: string) => {
    if (!data) return;
    setData({ ...data, [key]: value });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight mb-4"
          >
            매출전표 추출기
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500"
          >
            영수증 사진을 업로드하여 정보를 추출하고 구글 시트로 전송하세요.
          </motion.p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <section className="space-y-6">
            <div
              {...getRootProps({
                className: `relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer
                  ${uploadBoxStyle.box}`,
              })}
            >
              <input {...getInputProps()} />
              
              {preview === "pdf" ? (
                <div className="p-12 bg-white rounded-xl shadow-sm mb-4 flex flex-col items-center">
                  <FileText className="w-16 h-16 text-blue-500" />
                  <p className="mt-2 text-sm font-medium text-neutral-600">PDF 문서가 선택되었습니다</p>
                </div>
              ) : preview === "heic" ? (
                <div className="p-12 bg-white rounded-xl shadow-sm mb-4 flex flex-col items-center">
                  <FileText className="w-16 h-16 text-emerald-500" />
                  <p className="mt-2 text-sm font-medium text-neutral-600">아이폰 사진(HEIC)이 선택되었습니다</p>
                </div>
              ) : preview ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-64 rounded-lg shadow-md mb-4 object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : file ? (
                <div className="p-12 bg-white rounded-xl shadow-sm mb-4">
                  <FileText className="w-16 h-16 text-neutral-400" />
                  <p className="mt-2 text-sm font-medium">{file.name}</p>
                </div>
              ) : (
                <div className="py-12">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${uploadBoxStyle.iconContainer}`}>
                    <Upload className={`w-8 h-8 ${uploadBoxStyle.icon}`} />
                  </div>
                  <p className="text-sm font-medium">{uploadPrompt}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    PNG, JPG, PDF, HEIC (한 번에 1개)
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleExtract}
              disabled={!file || isExtracting}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                ${!file || isExtracting 
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                  : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg shadow-neutral-200'}`}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  정보 추출 중...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  정보 추출하기
                </>
              )}
            </button>
          </section>

          {/* Result Section */}
          <section className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 min-h-[300px] flex flex-col">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-neutral-400" />
                추출된 정보
              </h2>

              <AnimatePresence mode="wait">
                {data ? (
                  <motion.div 
                    key="data"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4 flex-grow"
                  >
                    {[
                      { label: "결제일", key: "paymentDate", value: data.paymentDate },
                      { label: "금액", key: "amount", value: data.amount },
                      { label: "매입카드사", key: "cardIssuer", value: data.cardIssuer },
                      { label: "승인번호", key: "approvalNumber", value: data.approvalNumber },
                      { label: "사업자번호", key: "businessNumber", value: data.businessNumber },
                      { label: "학생이름", key: "studentName", value: data.studentName },
                      { label: "비고", key: "remarks", value: data.remarks },
                    ].map((item) => (
                      <div key={item.key} className="border-b border-neutral-100 pb-2 last:border-0">
                        <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5 block">
                          {item.label}
                        </label>
                        <input
                          type="text"
                          value={item.value || ""}
                          onChange={(e) => handleDataChange(item.key as keyof ExtractedData, e.target.value)}
                          className="w-full bg-transparent text-base font-medium text-neutral-800 border-none focus:ring-0 p-0 outline-none placeholder:text-neutral-300"
                          placeholder={`${item.label} 입력`}
                        />
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-b border-neutral-100 pb-2 last:border-0">
                        <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5 block">
                          지점 선택
                        </label>
                        <select
                          value={data.branch}
                          onChange={(e) => handleDataChange("branch", e.target.value)}
                          className="w-full bg-transparent text-base font-medium text-neutral-800 border-none focus:ring-0 p-0 outline-none appearance-none cursor-pointer"
                        >
                          {BRANCHES.map((branch) => (
                            <option key={branch} value={branch}>{branch}</option>
                          ))}
                        </select>
                      </div>

                      <div className="border-b border-neutral-100 pb-2 last:border-0">
                        <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5 block">
                          결제 방법
                        </label>
                        <select
                          value={data.paymentMethod}
                          onChange={(e) => handleDataChange("paymentMethod", e.target.value)}
                          className="w-full bg-transparent text-base font-medium text-neutral-800 border-none focus:ring-0 p-0 outline-none appearance-none cursor-pointer"
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-grow flex flex-col items-center justify-center text-center text-neutral-400"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
                      <Database className="w-6 h-6" />
                    </div>
                    <p className="text-sm">영수증을 분석하면<br />여기에 정보가 표시됩니다.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {data && (
                <div className="mt-8 space-y-3">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleSendToSheet}
                    disabled={isSending}
                    className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                      ${isSending 
                        ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'}`}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        전송 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        구글 시트로 전송
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={handleReset}
                    className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-neutral-500 hover:bg-neutral-50 transition-all border border-neutral-200"
                  >
                    <RotateCcw className="w-5 h-5" />
                    처음으로 (초기화)
                  </motion.button>
                </div>
              )}
            </div>

            {/* Status Messages */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-start gap-3 border border-emerald-100"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        <footer className="mt-16 pt-8 border-t border-neutral-100 text-center text-xs text-neutral-400">
          <p>© 2024 매출전표 추출기. Gemini AI 기술을 사용합니다.</p>
          <p className="mt-2">구글 시트: <a href="https://docs.google.com/spreadsheets/d/1_BeBtLOjriRAK5Mn-f5Ct6THKudzT63ySXc-pTs9dpg/edit" target="_blank" className="underline hover:text-neutral-600">연결된 시트 보기</a></p>
        </footer>
      </div>
    </div>
  );
}
