import { requireRole } from "@/lib/session";
import { listUsers } from "@/services/users";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CreateUserForm } from "@/components/users/CreateUserForm";
import { ToggleUserButton } from "@/components/users/ToggleUserButton";
import { formatDate } from "@/lib/dates";
import { roleLabel } from "@/utils/format";
import { canManageUser } from "@/lib/authorization";

export default async function UsersPage() {
  const user = await requireRole(["ADMIN", "COORDINATOR"]);
  const users = await listUsers(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description={
          user.role === "ADMIN"
            ? "Create coordinators and volunteers. Passwords are hashed and never shown."
            : "Create and manage attendance volunteers you added."
        }
      />
      <Card>
        <CardHeader title="Create user" />
        <CardBody>
          <CreateUserForm actorRole={user.role} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={user.role === "ADMIN" ? "All users" : "Your volunteers"} />
        <Table headers={["Name", "Email", "Role", "Status", "Created", "Actions"]}>
          {users.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{row.email}</td>
              <td className="px-4 py-3">{roleLabel(row.role)}</td>
              <td className="px-4 py-3">
                <Badge tone={row.active ? "green" : "slate"}>
                  {row.active ? "Active" : "Disabled"}
                </Badge>
              </td>
              <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
              <td className="px-4 py-3">
                {canManageUser(user, row) && row.id !== user.id ? (
                  <ToggleUserButton id={row.id} active={row.active} />
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
