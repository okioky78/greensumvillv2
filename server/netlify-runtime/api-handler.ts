import { createHttpError, errorResponse, methodNotAllowed } from "../shared/http.ts";
import type { Context } from "@netlify/functions";
import { Method, type Method as MethodValue } from "./types.ts";
import type { ApiContext, ApiFilter } from "./types.ts";

export { Method } from "./types.ts";

const SET_COOKIE_HEADER = "Set-Cookie";

export type MethodList = readonly [MethodValue, ...MethodValue[]];

export interface ApiHandlerOptions {
  filters?: readonly ApiFilter[];
}

export interface ApiConfig {
  filters?: readonly ApiFilter[];
}

interface ApiHandlerConfig extends ApiHandlerOptions {
  methods: MethodList;
}

const defaultApiFilters: ApiFilter[] = [];

export type ApiHandlerCallback = (
  context: RequiredApiContext,
) => Response | Promise<Response>;

type InternalApiContextKey = "sessionRefreshCookie";
type HandlerApiContext = Omit<ApiContext, InternalApiContextKey>;

type RequiredApiContext = {
  [Key in keyof HandlerApiContext]-?: NonNullable<HandlerApiContext[Key]>;
};

const internalApiContextKeys = new Set<PropertyKey>(["sessionRefreshCookie"]);

const createRequiredApiContext = (apiContext: ApiContext) =>
  new Proxy(apiContext, {
    get(target, property, receiver) {
      if (internalApiContextKeys.has(property)) {
        throw createHttpError(
          `API context "${String(property)}" is internal and cannot be used by handlers.`,
          500,
          "INTERNAL_API_CONTEXT",
        );
      }

      const value = Reflect.get(target, property, receiver);

      if (typeof property !== "symbol" && value == null) {
        throw createHttpError(
          `Required API context "${String(property)}" is not available.`,
          500,
          "MISSING_API_CONTEXT",
        );
      }

      return value;
    },
  }) as RequiredApiContext;

const withOptionalSessionRefreshCookie = (response: Response, sessionRefreshCookie?: string) => {
  if (!response || !sessionRefreshCookie) return response;

  const headers = new Headers(response.headers);
  headers.append(SET_COOKIE_HEADER, sessionRefreshCookie);

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
    filters = defaultApiFilters,
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

      const response = await handler(createRequiredApiContext(apiContext));

      return withOptionalSessionRefreshCookie(response, apiContext.sessionRefreshCookie);
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

export const createApi = ({ filters = defaultApiFilters }: ApiConfig = {}) => {
  const withConfiguredFilters = (options: ApiHandlerOptions = {}): ApiHandlerOptions => ({
    ...options,
    filters: options.filters ?? filters,
  });

  return {
    Methods: (
      methods: MethodList,
      handler: ApiHandlerCallback,
      options: ApiHandlerOptions = {},
    ) => Methods(methods, handler, withConfiguredFilters(options)),
    Get: (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
      Get(handler, withConfiguredFilters(options)),
    Post: (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
      Post(handler, withConfiguredFilters(options)),
    Put: (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
      Put(handler, withConfiguredFilters(options)),
    Patch: (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
      Patch(handler, withConfiguredFilters(options)),
    Delete: (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
      Delete(handler, withConfiguredFilters(options)),
    Options: (handler: ApiHandlerCallback, options: ApiHandlerOptions = {}) =>
      Options(handler, withConfiguredFilters(options)),
  };
};
