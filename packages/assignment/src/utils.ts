export function resolvePerAgentTimeout(
  teamTimeout: number,
  globalDefault: number
): number {
  if (teamTimeout > 0) return teamTimeout;
  if (globalDefault > 0) return globalDefault;
  return 15;
}


