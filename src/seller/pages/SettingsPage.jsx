import React, { useState, useEffect } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import { subscribeToShop, updateShopDetails } from '../services/shops';

const SHOP_CATEGORIES = [
  'Restaurant & Cafe',
  'South Indian Tiffin & Meals',
  'Bakery & Sweets',
  'Grocery & Essentials',
  'Tea, Coffee & Beverages',
  'Fast Food & Snacks',
  'Fruits & Vegetables',
  'Meat & Poultry',
];

export default function SettingsPage() {
  const { user, seller } = useSellerAuth();
  const shopId = user?.shopId;

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState(SHOP_CATEGORIES[0]);
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('Papanasam');
  const [upiId, setUpiId] = useState('');
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [photoUrl, setPhotoUrl] = useState('');

  // Status & Validation states
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadShop = () => {
    if (!shopId) return;
    setLoading(true);
    setFetchError(null);

    return subscribeToShop(shopId, ({ shop: shopData, loading: l, error: err }) => {
      setLoading(l);
      if (err) {
        setFetchError(err);
        return;
      }

      if (shopData) {
        setShop(shopData);
        setName(shopData.name || seller?.shopName || '');
        setCategory(shopData.category || SHOP_CATEGORIES[0]);
        setPhone(shopData.phone || '');
        setArea(shopData.area || 'Papanasam');
        setUpiId(shopData.upiId || '');
        setOpeningTime(shopData.openingTime || shopData.timings?.open || '07:00');
        setClosingTime(shopData.closingTime || shopData.timings?.close || '22:00');
        setPhotoUrl(shopData.photoUrl || '');
      } else {
        setName(seller?.shopName || 'My Store');
      }
    });
  };

  useEffect(() => {
    const unsub = loadShop();
    return () => {
      if (unsub) unsub();
    };
  }, [shopId]);

  // Image file handler with preview
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Photo is too large. Please select an image under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setPhotoUrl(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Validation
  const validate = () => {
    const errs = {};

    if (!name.trim()) {
      errs.name = 'Shop name is required';
    }

    // Phone validation (10 digits, optional +91 prefix)
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    if (!cleanedPhone) {
      errs.phone = 'Phone number is required';
    } else if (!phoneRegex.test(cleanedPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian phone number';
    }

    // UPI ID check (must contain '@')
    if (upiId.trim() && !upiId.includes('@')) {
      errs.upiId = 'UPI ID must contain "@" (e.g. name@okaxis or 9876543210@upi)';
    }

    // Closing time after opening time
    if (openingTime && closingTime) {
      if (closingTime <= openingTime) {
        errs.closingTime = 'Closing time must be after opening time';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    if (!validate()) return;
    if (!shopId) return;

    try {
      setIsSaving(true);
      await updateShopDetails(shopId, {
        name: name.trim(),
        category,
        phone: phone.trim(),
        area: area.trim(),
        upiId: upiId.trim(),
        openingTime,
        closingTime,
        photoUrl,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update shop settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Shop Settings</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--ink-600)' }}>
          Manage your store profile, payouts UPI, and daily operating hours
        </p>
      </div>

      {/* Settings Form */}
      <div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '10px' }}>
          Store Profile Details
        </h2>

        {loading ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <div className="skeleton" style={{ width: '40%', height: '24px' }} />
            <div className="skeleton" style={{ width: '100%', height: '44px' }} />
            <div className="skeleton" style={{ width: '100%', height: '44px' }} />
            <div className="skeleton" style={{ width: '60%', height: '44px' }} />
          </div>
        ) : fetchError ? (
          <div className="error-state">
            <p><strong>Failed to load settings:</strong> {fetchError}</p>
            <button type="button" onClick={loadShop} className="btn-secondary">
              ↻ Retry Connection
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="card"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            {/* Success Toast */}
            {saveSuccess && (
              <div
                role="status"
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--success-bg)',
                  border: '1px solid rgba(47, 125, 74, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--success)',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>✓ Store settings updated successfully!</span>
              </div>
            )}

            {/* Error Banner */}
            {saveError && (
              <div
                role="alert"
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--error-bg)',
                  border: '1px solid rgba(200, 69, 59, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--error)',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Failed to save: {saveError}
              </div>
            )}

            {/* Shop Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Store Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Kumbakonam Degree Coffee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target-min)',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${errors.name ? 'var(--error)' : 'var(--line)'}`,
                  fontSize: '14.5px',
                  fontWeight: 600,
                }}
              />
              {errors.name && (
                <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                  {errors.name}
                </span>
              )}
            </div>

            {/* Category & Delivery Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Store Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--line)',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px',
                  }}
                >
                  {SHOP_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Delivery Area / Hub
                </label>
                <input
                  type="text"
                  placeholder="e.g. Papanasam, Ayyampettai"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--line)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {/* Phone & UPI ID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Store Contact Phone *
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${errors.phone ? 'var(--error)' : 'var(--line)'}`,
                    fontSize: '14px',
                  }}
                />
                {errors.phone && (
                  <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                    {errors.phone}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  UPI ID for Settlements
                </label>
                <input
                  type="text"
                  placeholder="merchant@upi or phone@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${errors.upiId ? 'var(--error)' : 'var(--line)'}`,
                    fontSize: '14px',
                  }}
                />
                {errors.upiId && (
                  <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                    {errors.upiId}
                  </span>
                )}
              </div>
            </div>

            {/* Operating Timings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Opening Time
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--line)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Closing Time
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${errors.closingTime ? 'var(--error)' : 'var(--line)'}`,
                    fontSize: '14px',
                  }}
                />
                {errors.closingTime && (
                  <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                    {errors.closingTime}
                  </span>
                )}
              </div>
            </div>

            {/* Shop Photo */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Storefront Photo
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--mango-50)',
                    border: '1.5px dashed var(--line)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Shop"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink-400)" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    style={{
                      minHeight: '38px',
                      padding: '0 14px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid var(--line)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      width: 'fit-content',
                    }}
                  >
                    Upload Shop Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      style={{
                        fontSize: '12px',
                        color: 'var(--error)',
                        fontWeight: 600,
                        width: 'fit-content',
                      }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                paddingTop: '10px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ minHeight: '46px', padding: '0 24px' }}
              >
                {isSaving ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
