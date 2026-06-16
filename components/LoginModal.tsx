import { LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";
import { useLoginWithOAuth } from "@privy-io/react-auth";
import { GoogleIcon } from "./SocialIcons";
import { isPrivyConfigured } from "../lib/privy";
import budolLogoImage from "../../public/assets/budol-politics-market.png";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { initOAuth, loading } = useLoginWithOAuth({
    onComplete: () => {
      setPendingProvider("");
      onClose();
    },
    onError: error => {
      setServerError(errorMessage(error));
      setPendingProvider("");
    },
  });
  const [serverError, setServerError] = useState("");
  const [pendingProvider, setPendingProvider] = useState("");
  const isLoading = loading || Boolean(pendingProvider);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const loginWithGoogle = async () => {
    setServerError("");
    if (!isPrivyConfigured()) {
      setServerError("Set VITE_PRIVY_APP_ID in .env, then restart the frontend dev server.");
      return;
    }

    setPendingProvider("google");

    try {
      await initOAuth({ provider: "google" });
    } catch (loginError) {
      setServerError(errorMessage(loginError));
      setPendingProvider("");
    } finally {
      if (!loading) {
        setPendingProvider("");
      }
    }
  };

  return (
    <div className="login-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="login-modal"
        onMouseDown={event => event.stopPropagation()}
        role="dialog"
      >
        <button className="login-modal-close" aria-label="Close login modal" onClick={onClose}>
          <X size={22} />
        </button>

        <div className="login-header">
          <div className="login-brand-mark">
            <img src={budolLogoImage} alt="Budol" className="login-logo-image" />
          </div>
          <div>
            <span>Budol account</span>
            <h2>PH politics markets</h2>
          </div>
        </div>

        <div className="login-copy">
          <h3 id="login-modal-title">Log in to trade the chismis</h3>
          <p>Use your social account to create or reconnect your Privy wallet for Budol.</p>
        </div>

        <div className="login-provider-list">
          <button className="login-provider-button google" disabled={isLoading} onClick={() => void loginWithGoogle()}>
            <span className="provider-mark">
              {isLoading ? <LoaderCircle className="spin-icon" size={18} /> : <GoogleIcon />}
            </span>
            <span>Continue with Google</span>
          </button>
        </div>

        {serverError ? <p className="login-error">{serverError}</p> : null}

        <small>
          By continuing, you agree to our <a href="/">Terms of Service</a> and <a href="/">Privacy Policy</a>
        </small>
      </section>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Privy login failed. Please try again.";
}
