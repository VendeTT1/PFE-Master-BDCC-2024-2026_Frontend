/**
 * Public page — no auth required.
 * CinetPay redirects here after payment completes inside the popup.
 *
 * Behaviour:
 *  - If opened in a popup/iframe → notifies the parent window and closes itself
 *  - If opened in the same tab (mobile fallback) → redirects to /billing?payment=success
 */
export default function BillingReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status") || "success";

  // Notify parent window if this was opened as a popup
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: "CINETPAY_RETURN", status }, window.location.origin);
    window.close();
    return null;
  }

  // Fallback: same-tab redirect
  window.location.replace(`/billing?payment=${status}`);
  return null;
}