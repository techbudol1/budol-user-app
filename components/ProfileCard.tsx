import type { BudolUser } from "../types";

type ProfileCardProps = {
  user: BudolUser | null;
};

export function ProfileCard({ user }: ProfileCardProps) {
  const label = user?.publicAlias || (user ? "BudolPH member" : "Guest trader");

  return (
    <div className="panel profile-panel">
      <div className="avatar">{label.slice(0, 1).toUpperCase()}</div>
      <div>
        <strong>{label}</strong>
        <span>{user ? "Account connected" : "Log in to track your activity"}</span>
      </div>
    </div>
  );
}
