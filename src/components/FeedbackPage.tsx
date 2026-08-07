import { ArrowLeft, Bug, CheckCircle2, Gauge, Lightbulb, MessageSquareHeart, ShieldCheck, Smartphone, Star } from "lucide-react";
import { useState } from "react";
import { submitPilotFeedback } from "../lib/pilot";

const categories = [
  { id: "bug", icon: Bug, label: "Bug" },
  { id: "usability", icon: Smartphone, label: "Ease of use" },
  { id: "privacy", icon: ShieldCheck, label: "Privacy" },
  { id: "performance", icon: Gauge, label: "Speed" },
  { id: "idea", icon: Lightbulb, label: "Idea" },
];
const areas = ["onboarding", "markets", "trading", "portfolio", "claims", "wallet", "privacy", "other"];

export function FeedbackPage({ onBack }: { onBack: () => void }) {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("usability");
  const [area, setArea] = useState("trading");
  const [message, setMessage] = useState("");
  const [safe, setSafe] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!rating) return setError("Choose a rating first.");
    if (message.trim().length < 10) return setError("Tell us a little more (at least 10 characters).");
    if (!safe) return setError("Confirm that your message contains no private wallet or claim information.");
    setStatus("sending");
    try {
      await submitPilotFeedback({ area, category, message: message.trim(), rating });
      setStatus("sent");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send feedback.");
      setStatus("idle");
    }
  };

  if (status === "sent") return (
    <section className="feedback-page">
      <article className="feedback-thanks panel">
        <CheckCircle2 size={46} />
        <span className="eyebrow">Feedback received</span>
        <h1>Thank you for testing BudolPH.</h1>
        <p>Your report is now in the pilot dashboard. It contains no wallet address, trade amount, market choice, transaction hash, or private proof data.</p>
        <button className="primary-button" onClick={onBack} type="button">Back to markets</button>
      </article>
    </section>
  );

  return (
    <section className="feedback-page">
      <button className="ghost-button legal-back-button" onClick={onBack} type="button"><ArrowLeft size={18} /> Back to markets</button>
      <header className="feedback-hero panel">
        <span className="feedback-hero-icon"><MessageSquareHeart size={30} /></span>
        <div><span className="eyebrow">Testnet pilot</span><h1>Help shape BudolPH.</h1><p>Tell us what worked, what felt confusing, or what should change. Feedback is anonymous and reviewed directly by the team.</p></div>
      </header>
      <article className="feedback-form panel">
        <fieldset><legend>How was your experience?</legend><div className="feedback-rating" aria-label="Rating from 1 to 5">{[1,2,3,4,5].map(value => <button aria-label={`${value} stars`} className={rating >= value ? "active" : ""} key={value} onClick={() => setRating(value)} type="button"><Star fill={rating >= value ? "currentColor" : "none"} /></button>)}</div></fieldset>
        <fieldset><legend>What kind of feedback is this?</legend><div className="feedback-choice-grid">{categories.map(item => <button className={category === item.id ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)} type="button"><item.icon size={19} />{item.label}</button>)}</div></fieldset>
        <label className="feedback-field"><span>Which part of the app?</span><select onChange={event => setArea(event.target.value)} value={area}>{areas.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        <label className="feedback-field"><span>What happened, or what would make it better?</span><textarea maxLength={1500} onChange={event => setMessage(event.target.value)} placeholder="Describe the steps you took and what you expected. Screenshots can be included later in the test report." rows={7} value={message} /><small>{message.length}/1500</small></label>
        <label className="feedback-safe"><input checked={safe} onChange={event => setSafe(event.target.checked)} type="checkbox" /><span><strong>Keep feedback privacy-safe.</strong> I did not include a wallet address, transaction hash, claim note, proof, secret, or personal information.</span></label>
        {error ? <div className="feedback-error">{error}</div> : null}
        <button className="primary-button feedback-submit" disabled={status === "sending"} onClick={() => void submit()} type="button">{status === "sending" ? "Sending feedback…" : "Send anonymous feedback"}</button>
      </article>
    </section>
  );
}
