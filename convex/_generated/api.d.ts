/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentRuns from "../agentRuns.js";
import type * as agents_assessment from "../agents/assessment.js";
import type * as agents_lesson from "../agents/lesson.js";
import type * as agents_resource from "../agents/resource.js";
import type * as agents_skillDiff from "../agents/skillDiff.js";
import type * as lib_onet from "../lib/onet.js";
import type * as lib_onetFuzzy from "../lib/onetFuzzy.js";
import type * as lib_youtube from "../lib/youtube.js";
import type * as modules from "../modules.js";
import type * as orchestrate from "../orchestrate.js";
import type * as paths from "../paths.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentRuns: typeof agentRuns;
  "agents/assessment": typeof agents_assessment;
  "agents/lesson": typeof agents_lesson;
  "agents/resource": typeof agents_resource;
  "agents/skillDiff": typeof agents_skillDiff;
  "lib/onet": typeof lib_onet;
  "lib/onetFuzzy": typeof lib_onetFuzzy;
  "lib/youtube": typeof lib_youtube;
  modules: typeof modules;
  orchestrate: typeof orchestrate;
  paths: typeof paths;
  sessions: typeof sessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
