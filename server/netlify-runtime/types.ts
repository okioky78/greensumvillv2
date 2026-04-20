import type { Context } from "@netlify/functions";
import type { DriveClient } from "../integrations/google-drive.ts";
import type { AuthenticatedOAuthContext } from "../integrations/google-oauth.ts";

export const Method = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Options: "OPTIONS",
} as const;

export type Method = (typeof Method)[keyof typeof Method];

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
