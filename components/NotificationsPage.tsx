import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate } from "../lib/format";
import type { AccountNotification } from "../types";

type NotificationsPageProps = {
  notifications: AccountNotification[];
  onBack: () => void;
  onMarkRead: () => Promise<void>;
  onOpen: (notification: AccountNotification) => void;
};

export function NotificationsPage({ notifications, onBack, onMarkRead, onOpen }: NotificationsPageProps) {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(
    () => notifications.filter(notification => filter === "all" || notification.kind === filter),
    [filter, notifications],
  );
  const kinds = useMemo(() => ["all", ...Array.from(new Set(notifications.map(notification => notification.kind || "general")))], [notifications]);

  return (
    <section className="portfolio-page">
      <div className="account-hero">
        <button className="ghost-button account-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to markets
        </button>
        <div>
          <span className="eyebrow">Notifications</span>
          <h1>BudolPH inbox</h1>
          <p>Market alerts, payouts, trades, comments, and account updates.</p>
        </div>
      </div>

      <section className="panel notifications-page-card">
        <div className="panel-title notification-page-title">
          <span>
            <Bell size={19} />
            <h2>All notifications</h2>
          </span>
          <button onClick={() => void onMarkRead()}>
            <CheckCheck size={17} />
            Mark all read
          </button>
        </div>
        <div className="notification-filter-row">
          {kinds.map(kind => (
            <button className={filter === kind ? "active" : ""} key={kind} onClick={() => setFilter(kind)}>
              {kind.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        <div className="notification-page-list">
          {filtered.map(notification => (
            <button className={`notification-item ${notification.readAt ? "" : "unread"}`} key={notification.id} onClick={() => onOpen(notification)}>
              <strong>{notification.title}</strong>
              <span>{notification.detail}</span>
              <small>{formatDate(notification.createdAt)}</small>
            </button>
          ))}
          {filtered.length === 0 ? <div className="empty-state">No notifications match this filter.</div> : null}
        </div>
      </section>
    </section>
  );
}
