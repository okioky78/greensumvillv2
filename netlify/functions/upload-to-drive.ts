import { Post } from "../../server/netlify-runtime/api-handler.ts";
import { uploadReceiptToDrive } from "../../server/service/upload-to-drive.ts";
import { jsonResponse } from "../../server/shared/http.ts";

export default Post(
  async ({ request, drive }) => {
    const body = await uploadReceiptToDrive({ request, drive });

    return jsonResponse(200, body);
  },
);
