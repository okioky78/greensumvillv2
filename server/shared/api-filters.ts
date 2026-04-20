import { createDriveClient } from "../google-drive/index.ts";
import { getAuthenticatedOAuthClient } from "../google-oauth/index.ts";
import { validateAllowedOrigin } from "./http.ts";
import type { ApiContext, Method } from "./types.ts";

export type ApiFilterCondition = (apiContext: ApiContext) => boolean | Promise<boolean>;

export interface ApiFilter {
  name: string;
  condition: ApiFilterCondition;
  apply: (apiContext: ApiContext) => void | Promise<void>;
}

interface AuthenticatedDriveFilterOptions {
  except?: ApiFilterCondition[];
}

interface AllowedOriginFilterOptions {
  methods: readonly Method[];
  except?: ApiFilterCondition[];
}

const getCandidatePaths = (apiContext: ApiContext) => {
  const functionName =
    typeof apiContext.context.functionName === "string"
      ? apiContext.context.functionName
      : undefined;
  const candidates = [
    apiContext.event.path,
    apiContext.event.rawUrl,
    functionName,
    functionName ? `/${functionName}` : undefined,
  ].filter(Boolean) as string[];

  return candidates.map((value) => {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  });
};

const isExcepted = async (apiContext: ApiContext, conditions: ApiFilterCondition[]) => {
  for (const condition of conditions) {
    if (await condition(apiContext)) return true;
  }

  return false;
};

export const matchApiPath =
  (...apiNames: string[]): ApiFilterCondition =>
  (apiContext) => {
    const paths = getCandidatePaths(apiContext);

    return apiNames.some((apiName) =>
      paths.some((path) =>
        path === `/api/${apiName}` ||
        path === `/.netlify/functions/${apiName}` ||
        path.endsWith(`/${apiName}`),
      ),
    );
  };

export const createAuthenticatedDriveFilter = ({
  except = [],
}: AuthenticatedDriveFilterOptions = {}): ApiFilter => ({
  name: "authenticated-drive",
  condition: async (apiContext) => !(await isExcepted(apiContext, except)),
  apply: async (apiContext) => {
    const auth = await getAuthenticatedOAuthClient(apiContext.event);
    apiContext.oauth2Client = auth.oauth2Client;
    apiContext.session = auth.session;
    apiContext.setCookie = auth.setCookie;
    apiContext.drive = createDriveClient(auth.oauth2Client);
  },
});

export const createAllowedOriginFilter = ({
  methods,
  except = [],
}: AllowedOriginFilterOptions): ApiFilter => ({
  name: "allowed-origin",
  condition: async (apiContext) =>
    methods.includes(apiContext.event.httpMethod as Method) &&
    !(await isExcepted(apiContext, except)),
  apply: (apiContext) => {
    validateAllowedOrigin(apiContext.event);
  },
});
