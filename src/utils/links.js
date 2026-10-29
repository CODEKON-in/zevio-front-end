/** Builders for tel:, WhatsApp and UPI deep links. */

/** "9876500001" → "tel:+919876500001" */
export function telLink(phone) {
  return `tel:+91${String(phone || '').replace(/\D/g, '').slice(-10)}`;
}

export function whatsappLink(phone, text = '') {
  const num = `91${String(phone || '').replace(/\D/g, '').slice(-10)}`;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/**
 * UPI intent link that opens GPay / PhonePe / Paytm with the amount filled in.
 * @param {{ upiId: string, name: string, amount: number, note?: string }} p
 */
export function upiLink({ upiId, name, amount, note = '' }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: Number(amount).toFixed(2),
    cu: 'INR',
  });
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}
