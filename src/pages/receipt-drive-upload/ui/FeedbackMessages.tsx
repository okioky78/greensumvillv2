import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { DriveUploadResponse } from "../api/receiptDriveApi";

type FeedbackMessagesProps = {
  error: string | null;
  success: DriveUploadResponse | null;
};

export const FeedbackMessages = ({ error, success }: FeedbackMessagesProps) => (
  <>
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {success && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{success.message}</p>
              <p className="mt-1 break-all text-xs text-emerald-600">{success.filename}</p>
              <a
                href={success.driveFileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold underline underline-offset-4"
              >
                Drive에서 열기
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);
