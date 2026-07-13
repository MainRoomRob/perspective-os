/** Client-safe surface: status helpers only (no pipeline or API clients). */
export {
  friendlyLlmErrorMessage,
  isAiEnabled,
  resolveLlmProvider,
} from "./llm";
export type { LlmProvider } from "./llm";
export { isWebSearchEnabled } from "./web-search-status";
