export function isWebSearchEnabled(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}
