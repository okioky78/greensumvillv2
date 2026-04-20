import { apiFilters } from "./api-filter-config.ts";
import type { ApiFilter } from "./api-filters.ts";
import { errorResponse, methodNotAllowed } from "./http.ts";
import type {
  ApiContext,
  ApiResponse,
  Headers,
  NetlifyContext,
  NetlifyEvent,
} from "./types.ts";
import { Method, type Method as MethodValue } from "./types.ts";

export { Method } from "./types.ts";

const SET_COOKIE_HEADER = "Set-Cookie";

export type MethodList = readonly [MethodValue, ...MethodValue[]];

export interface ApiHandlerOptions {
  filters?: readonly ApiFilter[];
}

interface ApiHandlerConfig extends ApiHandlerOptions {
  methods: MethodList;
}

export type ApiHandlerCallback = (
  context: ApiContext,
) => ApiResponse | Promise<ApiResponse>;

const findHeaderName = (headers: Headers = {}, targetHeader: string) =>
  Object.keys(headers).find((name) => name.toLowerCase() === targetHeader.toLowerCase());

const isString = (value: string | undefined): value is string =>
  typeof value === "string";

const toHeaderValues = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : [value]).filter(isString);

const withOptionalSetCookie = (response: ApiResponse, setCookie?: string) => {
  if (!response || !setCookie) return response;

  const headers = { ...(response.headers || {}) };
  const multiValueHeaders = { ...(response.multiValueHeaders || {}) };
  const headerName = findHeaderName(headers, SET_COOKIE_HEADER);
  const multiHeaderName = findHeaderName(multiValueHeaders, SET_COOKIE_HEADER);
  const existingCookies = [
    ...(multiHeaderName ? toHeaderValues(multiValueHeaders[multiHeaderName]) : []),
    ...(headerName ? toHeaderValues(headers[headerName]) : []),
  ];

  if (headerName) delete headers[headerName];
  if (multiHeaderName) delete multiValueHeaders[multiHeaderName];

  const nextResponse = {
    ...response,
    headers,
  };

  if (existingCookies.length) {
    nextResponse.multiValueHeaders = {
      ...multiValueHeaders,
      [SET_COOKIE_HEADER]: [...existingCookies, setCookie],
    };
  } else {
    nextResponse.headers = {
      ...headers,
      [SET_COOKIE_HEADER]: setCookie,
    };

    if (Object.keys(multiValueHeaders).length) {
      nextResponse.multiValueHeaders = multiValueHeaders;
    } else {
      delete nextResponse.multiValueHeaders;
    }
  }

  return nextResponse;
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
  return async (event: NetlifyEvent, context: NetlifyContext = {}) => {
    if (!methods.includes(event.httpMethod as Method)) {
      return methodNotAllowed();
    }

    try {
      const apiContext: ApiContext = { event, context };
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
