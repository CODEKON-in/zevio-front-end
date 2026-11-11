import React, { useState, useEffect } from 'react';
import { VegIndicator } from './ProductRow';

export default function ProductFormModal({
  isOpen,
  initialProduct = null,
  existingCategories = [],
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [minOrderQty, setMinOrderQty] = useState(1);
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(initialProduct);

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name || '');
      setDescription(initialProduct.description || '');
      setPrice(initialProduct.price !== undefined ? String(initialProduct.price) : '');
      setCategory(initialProduct.category || (existingCategories[0] || 'General'));
      setNewCategory('');
      setIsVeg(initialProduct.isVeg !== false);
      setMinOrderQty(initialProduct.minOrderQty || 1);
      setInStock(initialProduct.inStock !== false);
      setImageUrl(initialProduct.imageUrl || '');
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setCategory(existingCategories[0] || 'General');
      setNewCategory('');
      setIsVeg(true);
      setMinOrderQty(1);
      setInStock(true);
      setImageUrl('');
    }
    setErrors({});
  }, [initialProduct, isOpen, existingCategories]);

  if (!isOpen) return null;

  // Handle local image file picker
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 2.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImageUrl(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Product name is required';

    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) {
      errs.price = 'Price must be greater than 0';
    }

    const qty = parseInt(minOrderQty, 10);
    if (isNaN(qty) || qty < 1) {
      errs.minOrderQty = 'Minimum order quantity must be at least 1';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalCategory = category === '__NEW__'
      ? (newCategory.trim() || 'General')
      : category;

    onSubmit({
      name: name.trim(),
      description: description.trim().slice(0, 200),
      price: parseFloat(price),
      category: finalCategory,
      isVeg,
      minOrderQty: parseInt(minOrderQty, 10) || 1,
      inStock,
      imageUrl,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        backgroundColor: 'rgba(42, 33, 22, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 20px',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          boxShadow: 'var(--shadow-lg)',
          backgroundColor: 'var(--cream-card)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle for mobile sheet */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--line)',
            borderRadius: '2px',
            margin: '0 auto 16px auto',
          }}
        />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h2 style={{ fontSize: '20px', color: 'var(--ink-900)' }}>
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Item Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Filter Coffee, Masala Dosa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                minHeight: 'var(--touch-target-min)',
                padding: '0 14px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${errors.name ? 'var(--error)' : 'var(--line)'}`,
                fontSize: '14px',
              }}
            />
            {errors.name && (
              <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Description with Live 200-char counter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>
                Description (optional)
              </label>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: description.length >= 190 ? 'var(--error)' : 'var(--ink-400)',
                }}
              >
                {description.length} / 200
              </span>
            </div>
            <textarea
              placeholder="Freshly brewed with chicory and pure milk..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--line)',
                fontSize: '14px',
                resize: 'none',
              }}
            />
          </div>

          {/* Price & Minimum Order Qty */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Price (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="₹ 45"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target-min)',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${errors.price ? 'var(--error)' : 'var(--line)'}`,
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              />
              {errors.price && (
                <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                  {errors.price}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Min Order Qty
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target-min)',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${errors.minOrderQty ? 'var(--error)' : 'var(--line)'}`,
                  fontSize: '14px',
                }}
              />
              {errors.minOrderQty && (
                <span style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px', display: 'block' }}>
                  {errors.minOrderQty}
                </span>
              )}
            </div>
          </div>

          {/* Category Dropdown & Custom Type */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Category
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
                marginBottom: category === '__NEW__' ? '8px' : '0',
              }}
            >
              {existingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!existingCategories.includes('General') && (
                <option value="General">General</option>
              )}
              <option value="__NEW__">+ Type a new category...</option>
            </select>

            {category === '__NEW__' && (
              <input
                type="text"
                placeholder="Enter new category name (e.g. Beverages, Snacks)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target-min)',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--mango-500)',
                  fontSize: '14px',
                }}
              />
            )}
          </div>

          {/* Veg / Non-Veg Toggle & In-Stock Switch */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '14px',
              backgroundColor: 'var(--mango-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--mango-100)',
            }}
          >
            {/* Veg toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px' }}>
                Food Type
              </label>
              <button
                type="button"
                onClick={() => setIsVeg(!isVeg)}
                style={{
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1.5px solid ${isVeg ? 'var(--success)' : 'var(--error)'}`,
                  backgroundColor: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <VegIndicator isVeg={isVeg} />
                <span>{isVeg ? 'Vegetarian' : 'Non-Veg'}</span>
              </button>
            </div>

            {/* In stock toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px' }}>
                Availability
              </label>
              <button
                type="button"
                onClick={() => setInStock(!inStock)}
                style={{
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1.5px solid ${inStock ? 'var(--success)' : 'var(--ink-400)'}`,
                  backgroundColor: inStock ? 'var(--success-bg)' : '#FFFFFF',
                  color: inStock ? 'var(--success)' : 'var(--ink-600)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: inStock ? 'var(--success)' : 'var(--ink-400)',
                  }}
                />
                <span>{inStock ? 'In Stock' : 'Out of Stock'}</span>
              </button>
            </div>
          </div>

          {/* Image Upload with preview */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Product Photo
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px dashed var(--line)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-400)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
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

          {/* Form Actions */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              marginTop: '10px',
              paddingTop: '14px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

