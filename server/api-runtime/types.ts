import type { Context } from "@netlify/functions";
import type { DriveClient } from "../integrations/google-drive.ts";
import type { AuthenticatedOAuthContext } from "../integrations/google-oauth.ts";

export interface ApiContext extends Partial<AuthenticatedOAuthContext> {
  request: Request;
  context: Context;
  drive?: DriveClient;
}

export type ApiFilterCondition = (apiContext: ApiContext) => boolean | Promise<boolean>;

export interface ApiFilter {
  name: string;
  condition: ApiFilterCondition;
  apply: (apiContext: ApiContext) => void | Promise<void>;
}
