import { assignRideAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";

export function AssignRideForm({
  rideId,
  drivers,
}: {
  rideId: string;
  drivers: Array<{
    id: string;
    name: string;
    availability: string | null;
    startTime: string | null;
    endTime: string | null;
    passengerCapacity: number | null;
  }>;
}) {
  if (drivers.length === 0) {
    return <p className="text-xs text-slate-500">No available Transportation volunteers to assign yet.</p>;
  }
  return (
    <form action={assignRideAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="rideId" value={rideId} />
      <select name="driverUserId" required className="rounded-md border px-2 py-1 text-sm">
        <option value="">Assign Ride To</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
            {driver.availability === "AVAILABLE"
              ? driver.startTime
                ? ` — Available ${driver.startTime} onward`
                : " — Available"
              : driver.availability === "PARTIAL"
                ? ` — Partial: ${driver.startTime ?? "?"}–${driver.endTime ?? "?"}`
                : ""}
            {driver.passengerCapacity ? ` · ${driver.passengerCapacity} seats` : ""}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        Save Assignment
      </Button>
    </form>
  );
}
