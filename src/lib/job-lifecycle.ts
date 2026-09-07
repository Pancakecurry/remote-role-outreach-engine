export const missingJobTransition = (runs: number, sourceSucceeded: boolean, reappeared: boolean) => reappeared ? { runs: 0, active: true, closed: false } : !sourceSucceeded ? { runs, active: true, closed: false } : { runs: runs + 1, active: runs + 1 < 3, closed: runs + 1 >= 3 };
export function canReconcileMissingJobs(completeSnapshot: boolean, malformedCount: number, lastSuccessAt: string | null, now = Date.now()) {
  return completeSnapshot && malformedCount === 0 && (!lastSuccessAt || now - Date.parse(lastSuccessAt) >= 4 * 60 * 60 * 1000);
}
