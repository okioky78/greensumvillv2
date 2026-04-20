import { Get } from "../../server/netlify-runtime/api-handler.ts";
import { getDriveBranches } from "../../server/service/drive-branches.ts";
import { jsonResponse } from "../../server/shared/http.ts";

export default Get(
  async ({ drive }) => {
    const body = await getDriveBranches(drive);

    return jsonResponse(200, body);
  },
);
