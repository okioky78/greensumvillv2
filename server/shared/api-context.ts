import type { DriveClient } from "../google-drive/index.ts";
import type { AuthenticatedOAuthContext } from "../google-oauth/index.ts";
import type { NetlifyContext, NetlifyEvent } from "./types.ts";

export interface ApiContext extends Partial<AuthenticatedOAuthContext> {
  event: NetlifyEvent;
  context: NetlifyContext;
  drive?: DriveClient;
}
