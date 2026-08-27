export function accountDetectedMessage(isCoordinator: boolean | null | undefined) {
  if (isCoordinator == null) return null;
  return isCoordinator ? "Coordinator account detected." : "Member account detected.";
}
