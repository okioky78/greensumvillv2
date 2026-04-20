import { validateAllowedOrigin } from "../../shared/app-security.ts";
import { Method } from "../../shared/types.ts";
import type { ApiFilter } from "../types.ts";

const originProtectedMethods: readonly Method[] = [
  Method.Post,
  Method.Put,
  Method.Patch,
  Method.Delete,
];

export const allowedOriginFilter: ApiFilter = {
  name: "allowed-origin",
  condition: (apiContext) =>
    originProtectedMethods.includes(apiContext.request.method as Method),
  apply: (apiContext) => {
    validateAllowedOrigin(apiContext.request);
  },
};
