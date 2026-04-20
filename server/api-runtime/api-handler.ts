import { allowedOriginFilter } from "./filters/allowed-origin-filter.ts";
import { authenticatedDriveFilter } from "./filters/authenticated-drive-filter.ts";
import { errorResponse, methodNotAllowed } from "../shared/http.ts";
import type { Context } from "@netlify/functions";
import { Method, type Method as MethodValue } from "../shared/types.ts";
import type { ApiContext, ApiFilter } from "./types.ts";

export { Method } from "../shared/types.ts";

const SET_COOKIE_HEADER = "Set-Cookie";

export type MethodList = readonly [MethodValue, ...MethodValue[]];

export interface ApiHandlerOptions {
  filters?: readonly ApiFilter[];
}

interface ApiHandlerConfig extends ApiHandlerOptions {
  methods: MethodList;
}

const apiFilters: ApiFilter[] = [
  allowedOriginFilter,
  authenticatedDriveFilter,
];

export type ApiHandlerCallback = (
  context: ApiContext,
) => Response | Promise<Response>;

const withOptionalSetCookie = (response: Response, setCookie?: string) => {
  if (!response || !setCookie) return response;

  const headers = new Headers(response.headers);
  headers.append(SET_COOKIE_HEADER, setCookie);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const applyFilters = async (apiContext: ApiContext, filters: readonly ApiFilter[]) => {
  for (const filter of filters) {
    if (await filter.condition(apiContext)) {
      await filter.apply(apiContext);
    }
  }
};

export const createApiHandler = (
  {
    methods,
    filters = apiFilters,
  }: ApiHandlerConfig,
  handler: ApiHandlerCallback,
) => {
  return async (request: Request, context: Context) => {
    if (!methods.includes(request.method as Method)) {
      return methodNotAllowed();
    }

    try {
      const apiContext: ApiContext = { request, context };
      await applyFilters(apiContext, filters);

      const response = await handler(apiContext);

      return withOptionalSetCookie(response, apiContext.setCookie);
    } catch (error) {
      return errorResponse(error);
    }
  };
};

const createMethodHandler =
  (method: MethodValue) =>
  (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
    Methods([method], handler, options);

export const Methods = (
  methods: MethodList,
  handler: ApiHandlerCallback,
  options: ApiHandlerOptions = {},
) =>
  createApiHandler(
    {
      ...options,
      methods,
    },
    handler,
  );

export const Get = createMethodHandler(Method.Get);
export const Post = createMethodHandler(Method.Post);
export const Put = createMethodHandler(Method.Put);
export const Patch = createMethodHandler(Method.Patch);
export const Delete = createMethodHandler(Method.Delete);
export const Options = createMethodHandler(Method.Options);
