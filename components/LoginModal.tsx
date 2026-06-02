import { LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";
import { useConnect } from "thirdweb/react";
import { FacebookIcon, GoogleIcon } from "./SocialIcons";
import { loginWithThirdwebToken } from "../lib/api";
import { createBudolSocialWallet, thirdwebClient, web3Chain } from "../lib/thirdweb";
import type { BudolUser } from "../types";
import budolLogoImage from "../../public/assets/budol-politics-market.png";

type SocialProvider = {
  label: string;
  strategy: "google" | "facebook";
  variant: "google" | "facebook";
};

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: BudolUser) => void;
};

const providers: SocialProvider[] = [
  {
    label: "Continue with Google",
    strategy: "google",
    variant: "google",
  },
  {
    label: "Continue with Facebook",
    strategy: "facebook",
    variant: "facebook",
  },
];

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const { connect, error, isConnecting } = useConnect();
  const [serverError, setServerError] = useState("");
  const [isServerLoginLoading, setIsServerLoginLoading] = useState(false);
  const isLoading = isConnecting || isServerLoginLoading;

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

  const loginWith = async (provider: SocialProvider) => {
    setServerError("");
    setIsServerLoginLoading(true);

    try {
      let authToken = "";
      const wallet = await connect(async () => {
        const socialWallet = createBudolSocialWallet();
        await socialWallet.connect({
          chain: web3Chain,
          client: thirdwebClient,
          strategy: provider.strategy,
        });
        authToken = socialWallet.getAuthToken() ?? "";
        return socialWallet;
      });

      if (!wallet || !authToken) {
        throw new Error("Missing thirdweb auth token.");
      }

      onClose();
      const user = await loginWithThirdwebToken(authToken);
      onLogin(user);
    } catch (loginError) {
      setServerError(loginError instanceof Error ? loginError.message : "Budol login failed. Please try again.");
    } finally {
      setIsServerLoginLoading(false);
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
          <p>Use your social account to create a thirdweb wallet for Budol.</p>
        </div>

        <div className="login-provider-list">
          {providers.map(provider => (
            <button
              className={`login-provider-button ${provider.variant}`}
              disabled={isLoading}
              key={provider.strategy}
              onClick={() => void loginWith(provider)}
            >
              <span className="provider-mark">
                {isLoading ? (
                  <LoaderCircle className="spin-icon" size={18} />
                ) : provider.strategy === "google" ? (
                  <GoogleIcon />
                ) : (
                  <FacebookIcon />
                )}
              </span>
              <span>{provider.label}</span>
            </button>
          ))}
        </div>

        {error || serverError ? <p className="login-error">{serverError || error?.message}</p> : null}

        <small>
          By continuing, you agree to our <a href="/">Terms of Service</a> and <a href="/">Privacy Policy</a>
        </small>
      </section>
    </div>
  );
}
