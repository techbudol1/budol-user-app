import {
  ArrowLeft,
  Bell,
  Eye,
  LoaderCircle,
  LogOut,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatDate, formatNotificationTime, shortAddress } from "../lib/format";
import { updateAccountDisplayName } from "../lib/api";
import type { AccountNotification, BudolUser } from "../types";

type MyAccountPageProps = {
  accountAddress?: string;
  notifications: AccountNotification[];
  onBack: () => void;
  onLogout: () => Promise<void>;
  onUserChange: (user: BudolUser) => void;
  onWalletClick: () => void;
  user: BudolUser | null;
};

type AccountPreferences = {
  defaultOrderSize: string;
  oddsFormat: "percent" | "cents";
  riskMode: "chill" | "normal" | "spicy";
  categories: string[];
  hideResolved: boolean;
  hideSpicyMarkets: boolean;
  marketAlerts: boolean;
  maxMarketExposure: string;
};

const categoryOptions = ["Elections", "Congress", "LGU", "Policy"];
const defaultPreferences: AccountPreferences = {
  defaultOrderSize: "1000",
  oddsFormat: "cents",
  riskMode: "normal",
  categories: ["Elections", "Policy"],
  hideResolved: true,
  hideSpicyMarkets: false,
  marketAlerts: true,
  maxMarketExposure: "5000",
};

export function MyAccountPage({ accountAddress, notifications, onBack, onLogout, onUserChange, onWalletClick, user }: MyAccountPageProps) {
  const [displayNameDraft, setDisplayNameDraft] = useState(user?.publicAlias ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMessageTone, setProfileMessageTone] = useState<"error" | "success">("success");
  const [preferences, setPreferences] = useState<AccountPreferences>(() => {
    const stored = localStorage.getItem("budol-account-preferences");
    if (!stored) {
      return defaultPreferences;
    }

    try {
      return { ...defaultPreferences, ...(JSON.parse(stored) as Partial<AccountPreferences>) };
    } catch {
      return defaultPreferences;
    }
  });

  const displayAddress = accountAddress ?? user?.walletAddress ?? "";
  const displayName = user?.publicAlias || user?.email || (displayAddress ? shortAddress(displayAddress) : "BudolPH trader");
  const provider = user?.authProvider ? titleCase(user.authProvider) : "Self-custodial wallet";
  const preferenceSummary = useMemo(
    () => `${preferences.riskMode} risk / ${preferences.oddsFormat} odds / P${Number(preferences.defaultOrderSize || 0).toLocaleString()}`,
    [preferences.defaultOrderSize, preferences.oddsFormat, preferences.riskMode],
  );

  useEffect(() => {
    localStorage.setItem("budol-account-preferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    setDisplayNameDraft(user?.publicAlias ?? "");
  }, [user?.publicAlias]);

  const toggleCategory = (category: string) => {
    setPreferences(current => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter(item => item !== category)
        : [...current.categories, category],
    }));
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      onBack();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const saveDisplayName = async () => {
    if (!user || isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileMessage("");
    try {
      const updatedUser = await updateAccountDisplayName(displayNameDraft);
      onUserChange(updatedUser);
      setDisplayNameDraft(updatedUser.publicAlias);
      setProfileMessageTone("success");
      setProfileMessage("Display name updated.");
    } catch (error) {
      setProfileMessageTone("error");
      setProfileMessage(error instanceof Error ? error.message : "Unable to update display name.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <section className="account-page">
      <div className="account-hero">
        <button className="ghost-button account-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to markets
        </button>
        <div>
          <span className="eyebrow">My Account</span>
          <h1>{displayName}</h1>
          <p>Manage your BudolPH profile, wallet, trading defaults, and alerts.</p>
        </div>
      </div>

      <div className="account-layout">
        <aside className="account-summary panel">
          <div className="account-avatar">
            <UserRound size={30} />
          </div>
          <strong>{displayName}</strong>
          <span>{displayAddress ? shortAddress(displayAddress) : "No wallet connected"}</span>
          <div className="account-status-pill">
            <ShieldCheck size={15} />
            Active account
          </div>
          <div className="account-summary-stats">
            <Stat label="Login count" value={(user?.loginCount ?? 0).toString()} />
            <Stat label="Last login" value={formatDate(user?.lastLoginAt)} />
            <Stat label="Preferences" value={preferenceSummary} />
          </div>
          <button className="primary-button account-summary-button" disabled={!displayAddress} onClick={onWalletClick}>
            <Wallet size={18} />
            Open My Wallet
          </button>
        </aside>

        <div className="account-content">
          <section className="panel account-card">
            <div className="panel-title">
              <UserRound size={19} />
              <h2>Profile</h2>
            </div>
            <form
              className="account-profile-form"
              onSubmit={event => {
                event.preventDefault();
                void saveDisplayName();
              }}
            >
              <label htmlFor="account-display-name">Display name</label>
              <div className="account-profile-input-row">
                <input
                  autoComplete="nickname"
                  disabled={!user || isSavingProfile}
                  id="account-display-name"
                  maxLength={40}
                  minLength={3}
                  onChange={event => {
                    setDisplayNameDraft(event.target.value);
                    setProfileMessage("");
                  }}
                  placeholder="Choose a public display name"
                  value={displayNameDraft}
                />
                <button
                  className="primary-button"
                  disabled={!user || isSavingProfile || displayNameDraft.trim() === user.publicAlias}
                  type="submit"
                >
                  {isSavingProfile ? <LoaderCircle className="spin-icon" size={17} /> : <Save size={17} />}
                  {isSavingProfile ? "Saving" : "Save"}
                </button>
              </div>
              <div className="account-profile-help">
                <small>This public name appears in market activity and comments. Use 3–40 characters.</small>
                <small>{displayNameDraft.length}/40</small>
              </div>
              {profileMessage ? <p className={`account-profile-message ${profileMessageTone}`} aria-live="polite">{profileMessage}</p> : null}
            </form>
            <div className="account-detail-grid">
              <Detail label="Social provider" value={provider} />
              <Detail label="Email" value={user?.email || "Not provided"} />
              <Detail label="Joined" value={formatDate(user?.createdAt)} />
            </div>
          </section>

          <section className="panel account-card">
            <div className="panel-title">
              <SlidersHorizontal size={19} />
              <h2>Trading Preferences</h2>
            </div>
            <div className="preference-grid">
              <label>
                Default order size
                <input
                  min="100"
                  step="100"
                  type="number"
                  value={preferences.defaultOrderSize}
                  onChange={event => setPreferences(current => ({ ...current, defaultOrderSize: event.target.value }))}
                />
              </label>
              <label>
                Max market exposure
                <input
                  min="500"
                  step="500"
                  type="number"
                  value={preferences.maxMarketExposure}
                  onChange={event => setPreferences(current => ({ ...current, maxMarketExposure: event.target.value }))}
                />
              </label>
              <label>
                Odds display
                <select
                  value={preferences.oddsFormat}
                  onChange={event => setPreferences(current => ({ ...current, oddsFormat: event.target.value as AccountPreferences["oddsFormat"] }))}
                >
                  <option value="cents">Cents</option>
                  <option value="percent">Percent</option>
                </select>
              </label>
            </div>
            <div className="segmented-control" aria-label="Risk mode">
              {(["chill", "normal", "spicy"] as const).map(mode => (
                <button
                  className={preferences.riskMode === mode ? "active" : ""}
                  key={mode}
                  onClick={() => setPreferences(current => ({ ...current, riskMode: mode }))}
                >
                  {titleCase(mode)}
                </button>
              ))}
            </div>
            <div className="category-picker">
              {categoryOptions.map(category => (
                <button
                  className={preferences.categories.includes(category) ? "selected" : ""}
                  key={category}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="settings-list">
              <Toggle
                checked={preferences.hideResolved}
                icon={<Eye size={18} />}
                label="Hide resolved markets"
                onChange={checked => setPreferences(current => ({ ...current, hideResolved: checked }))}
              />
              <Toggle
                checked={preferences.hideSpicyMarkets}
                icon={<Eye size={18} />}
                label="Hide joke/spicy markets"
                onChange={checked => setPreferences(current => ({ ...current, hideSpicyMarkets: checked }))}
              />
              <Toggle
                checked={preferences.marketAlerts}
                icon={<Bell size={18} />}
                label="Hot poll alerts"
                onChange={checked => setPreferences(current => ({ ...current, marketAlerts: checked }))}
              />
            </div>
          </section>

          <section className="panel account-card">
            <div className="panel-title">
              <Bell size={19} />
              <h2>Recent Activity</h2>
            </div>
            <div className="activity-list">
              {notifications.length > 0 ? (
                notifications.slice(0, 6).map(notification => (
                  <Activity
                    detail={notification.detail}
                    key={notification.id}
                    label={notification.title}
                    value={formatNotificationTime(notification.createdAt)}
                  />
                ))
              ) : (
                <>
                  <Activity label="Logged in" value={formatDate(user?.lastLoginAt)} />
                  <Activity label="Preferences updated" value="Saved on this device" />
                  <Activity label="Watchlist ready" value="Follow markets from detail pages" />
                </>
              )}
            </div>
          </section>

          <section className="panel account-danger-card">
            <div>
              <strong>Session</strong>
              <span>Log out from this browser session.</span>
            </div>
            <button className="ghost-button account-logout-button" disabled={isLoggingOut} onClick={() => void logout()}>
              <LogOut size={18} />
              {isLoggingOut ? "Logging out" : "Logout"}
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Toggle({
  checked,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="account-toggle">
      <span>
        {icon}
        {label}
      </span>
      <input checked={checked} type="checkbox" onChange={event => onChange(event.target.checked)} />
    </label>
  );
}

function Activity({ detail, label, value }: { detail?: string; label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
