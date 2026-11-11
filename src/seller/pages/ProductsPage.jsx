import React, { useState, useEffect, useMemo } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import {
  subscribeToShopProducts,
  createProduct,
  updateProduct,
  toggleProductStock,
  deleteProduct,
} from '../services/products';
import ProductRow from '../components/products/ProductRow';
import ProductFormModal from '../components/products/ProductFormModal';
import ProductSkeleton from '../components/products/ProductSkeleton';

export default function ProductsPage() {
  const { user } = useSellerAuth();
  const shopId = user?.shopId;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProducts = () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    return subscribeToShopProducts(shopId, ({ products: freshProducts, loading: l, error: err }) => {
      setLoading(l);
      if (err) {
        setError(err);
        return;
      }
      setProducts(freshProducts);
    });
  };

  useEffect(() => {
    const unsub = loadProducts();
    return () => {
      if (unsub) unsub();
    };
  }, [shopId]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Filter products by category & search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'ALL' || (p.category || 'General') === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [products, selectedCategory, searchQuery]);

  // Quick In-Stock Toggle handler
  const handleToggleStock = async (productId, nextInStock) => {
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, inStock: nextInStock } : p))
    );
    await toggleProductStock(productId, nextInStock);
  };

  // Add / Edit Modal Open
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  // Form Submit (Create or Update)
  const handleFormSubmit = async (formData) => {
    if (!shopId) return;
    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await updateProduct(editingProduct.id, shopId, formData);
      } else {
        await createProduct(shopId, formData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      alert(`Could not save product: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const handleOpenDelete = (product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (err) {
      alert(`Could not delete product: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header with Title & + Add Button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Menu & Products</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-600)' }}>
            {products.length} {products.length === 1 ? 'item' : 'items'} in catalogue
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{ minHeight: '44px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '14px' }}>
        <input
          type="search"
          placeholder="Search products by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            minHeight: 'var(--touch-target-min)',
            padding: '0 16px',
            backgroundColor: 'var(--cream-card)',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ink-900)',
            fontSize: '14px',
            boxShadow: 'var(--shadow-xs)',
          }}
        />
      </div>

      {/* Category Pills (if categories exist) */}
      {categories.length > 0 && (
        <div className="chip-scroller-wrap">
          <div className="chip-scroller"
            style={{ marginBottom: '16px' }}
            >
            <button
              type="button"
                className={selectedCategory === 'ALL' ? 'mango-surface' : undefined}
              onClick={() => setSelectedCategory('ALL')}
              style={{
                minHeight: '40px',
                padding: '0 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '13px',
                fontWeight: selectedCategory === 'ALL' ? 800 : 600,
                backgroundColor: selectedCategory === 'ALL' ? 'var(--mango-500)' : 'var(--cream-card)',
                color: selectedCategory === 'ALL' ? 'var(--mango-text)' : 'var(--ink-600)',
                border: `1px solid ${selectedCategory === 'ALL' ? 'var(--mango-600)' : 'var(--line)'}`,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              All Items
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={selectedCategory === cat ? 'mango-surface' : undefined}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  minHeight: '40px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '13px',
                  fontWeight: selectedCategory === cat ? 800 : 600,
                  backgroundColor: selectedCategory === cat ? 'var(--mango-500)' : 'var(--cream-card)',
                  color: selectedCategory === cat ? 'var(--mango-text)' : 'var(--ink-600)',
                  border: `1px solid ${selectedCategory === cat ? 'var(--mango-600)' : 'var(--line)'}`,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

        {/* Products List Area */}
        <div>
          {loading ? (
            <ProductSkeleton count={4} />
          ) : error ? (
            <div className="error-state">
              <p><strong>Failed to load catalogue:</strong> {error}</p>
              <button type="button" onClick={loadProducts} className="btn-secondary">
                ↻ Retry Connection
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <h3 className="empty-state-title">No products yet</h3>
              <p className="empty-state-desc">
                Add your first menu item so customers in Papanasam & Ayyampettai can start ordering from your store.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="btn-primary"
                style={{ marginTop: '8px' }}
              >
                + Add First Product
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state-title">No matching products</h3>
              <p className="empty-state-desc">
                No products found matching "{searchQuery}". Try a different keyword or reset filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="btn-secondary"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onToggleStock={handleToggleStock}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add / Edit Product Modal */}
        <ProductFormModal
          isOpen={isModalOpen}
          initialProduct={editingProduct}
          existingCategories={categories}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />

        {/* Delete Confirmation Dialog */}
        {productToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(42, 33, 22, 0.5)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '380px',
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <h3 style={{ fontSize: '18px', color: 'var(--ink-900)', marginBottom: '8px' }}>
                Delete "{productToDelete.name}"?
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--ink-600)', marginBottom: '20px' }}>
                This will remove the item from your store catalogue. Customers will no longer be able to order it.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  disabled={isDeleting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    padding: '0 16px',
                    backgroundColor: 'var(--error)',
                    color: '#FFFFFF',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.7 : 1,
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
