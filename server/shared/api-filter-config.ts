import {
  createAllowedOriginFilter,
  createAuthenticatedDriveFilter,
  matchApiPath,
  type ApiFilter,
} from "./api-filters.ts";
import { Method } from "./types.ts";

const publicApi = matchApiPath(
  "google-auth-start",
  "google-auth-callback",
  "google-auth-logout",
);

export const apiFilters: ApiFilter[] = [
  createAllowedOriginFilter({
    methods: [Method.Post, Method.Put, Method.Patch, Method.Delete],
  }),
  createAuthenticatedDriveFilter({
    except: [publicApi],
  }),
];
