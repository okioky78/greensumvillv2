import { api } from "../../server/config.ts";
import { getDriveBranches } from "../../server/service/drive-branches.ts";
import { jsonResponse } from "../../server/shared/http.ts";

export default api.Get(
  async ({ drive }) => {
    const body = await getDriveBranches(drive);

    return jsonResponse(200, body);
  },
);
