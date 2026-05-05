/**
 * Firebase-backed Storage API for DSIMS.
 * This implementation replaces the localStorage-based StorageAPI with Firestore,
 * while maintaining the same async method signatures.
 */

(function () {
  const db = firebase.firestore();

  // Collections mapping
  const COLLECTIONS = {
    users: 'users',
    shop: 'shop',
    products: 'products',
    invoices: 'invoices',
    analytics: 'analytics',
    activity: 'activity'
  };

  const KEYS = {
    currentUser: 'currentUser'
  };

  const generateId = () => `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const now = () => Date.now();

  const StorageAPI = {
    // -----------------------------
    // User & Session Management
    // -----------------------------

    async getUsers() {
      const snapshot = await db.collection(COLLECTIONS.users).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async findUser(email) {
      const normalized = (email || '').trim().toLowerCase();
      const doc = await db.collection(COLLECTIONS.users).doc(normalized).get();
      return doc.exists ? { ...doc.data(), id: doc.id } : null;
    },

    async updateUserProfile(email, data) {
      const normalized = (email || '').trim().toLowerCase();
      await db.collection(COLLECTIONS.users).doc(normalized).update({
        ...data,
        updatedAt: new Date().toISOString()
      });
      
      const updated = await this.findUser(normalized);
      
      // If updating current user, update session too
      const current = await this.getCurrentUser();
      if (current && (current.email || '').toLowerCase() === normalized) {
        await this.setCurrentUser({ ...current, ...data });
      }
      return updated;
    },

    async addUser(user) {
      const normalized = (user.email || '').trim().toLowerCase();
      const exists = await this.findUser(normalized);
      if (exists) {
        throw new Error('User with this email already exists');
      }

      const record = {
        name: user.name,
        email: normalized,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt || new Date().toISOString()
      };

      await db.collection(COLLECTIONS.users).doc(normalized).set(record);
      return { id: normalized, ...record };
    },

    async setCurrentUser(userOrEmail) {
      if (!userOrEmail) {
        localStorage.removeItem(KEYS.currentUser);
        return null;
      }

      let current;
      if (typeof userOrEmail === 'string') {
        const fullUser = await this.findUser(userOrEmail);
        current = fullUser ? { ...fullUser } : { email: userOrEmail.trim().toLowerCase() };
      } else {
        current = { ...userOrEmail };
      }

      current.lastActive = now();
      localStorage.setItem(KEYS.currentUser, JSON.stringify(current));
      return current;
    },

    async getCurrentUser() {
      const raw = localStorage.getItem(KEYS.currentUser);
      if (!raw) return null;
      try {
        const stored = JSON.parse(raw);
        if (typeof stored === 'string') {
          return { email: stored.trim().toLowerCase(), name: null, lastActive: now() };
        }
        return stored;
      } catch (e) {
        return null;
      }
    },

    async clearCurrentUser() {
      localStorage.removeItem(KEYS.currentUser);
      return true;
    },

    async touchCurrentUser() {
      const current = await this.getCurrentUser();
      if (current) {
        current.lastActive = now();
        localStorage.setItem(KEYS.currentUser, JSON.stringify(current));
      }
      return current;
    },

    // -----------------------------
    // Shop Details
    // -----------------------------

    async getShopDetails() {
      const doc = await db.collection(COLLECTIONS.shop).doc('details').get();
      return doc.exists ? doc.data() : null;
    },

    async saveShopDetails(details) {
      await db.collection(COLLECTIONS.shop).doc('details').set({
        ...details,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      await this.logActivity('Settings updated', 'Shop business profile was updated.');
      return details;
    },

    // -----------------------------
    // Products
    // -----------------------------

    async getProducts() {
      const snapshot = await db.collection(COLLECTIONS.products).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async addProduct(product) {
      const id = generateId();
      // Remove any incoming ID from the product object to avoid confusion
      const { id: incomingId, ...rest } = product;
      const newProduct = { 
        ...rest, 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection(COLLECTIONS.products).doc(id).set(newProduct);
      await this.logActivity('Product added', `Added product: ${newProduct.name}`);
      return { id, ...newProduct };
    },

    async updateProduct(id, data) {
      const prodRef = db.collection(COLLECTIONS.products).doc(id);
      const doc = await prodRef.get();
      if (!doc.exists) {
        throw new Error('Product not found in database');
      }

      await prodRef.update({
        ...data,
        updatedAt: new Date().toISOString()
      });
      
      const updatedDoc = await prodRef.get();
      const updated = { id: updatedDoc.id, ...updatedDoc.data() };
      await this.logActivity('Product updated', `Updated product: ${updated.name}`);
      return updated;
    },

    async deleteProduct(id) {
      const doc = await db.collection(COLLECTIONS.products).doc(id).get();
      const product = doc.exists ? doc.data() : null;
      await db.collection(COLLECTIONS.products).doc(id).delete();
      if (product) {
        await this.logActivity('Product deleted', `Deleted product: ${product.name}`);
      }
      return true;
    },

    // -----------------------------
    // Invoices
    // -----------------------------

    async getInvoices() {
      const snapshot = await db.collection(COLLECTIONS.invoices).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async addInvoice(invoice) {
      const id = generateId();
      const newInvoice = { 
        ...invoice, 
        createdAt: new Date().toISOString()
      };
      await db.collection(COLLECTIONS.invoices).doc(id).set(newInvoice);
      
      // Update product quantities in Firestore
      if (newInvoice.items && Array.isArray(newInvoice.items)) {
        for (const item of newInvoice.items) {
          if (item.productId) {
            const prodRef = db.collection(COLLECTIONS.products).doc(item.productId);
            const prodDoc = await prodRef.get();
            if (prodDoc.exists) {
              const currentQty = Number(prodDoc.data().quantity) || 0;
              const newQty = Math.max(0, currentQty - (Number(item.quantity) || 0));
              await prodRef.update({ quantity: newQty, updatedAt: new Date().toISOString() });
            }
          }
        }
      }

      await this.logActivity('Invoice generated', `Generated invoice #${newInvoice.invoiceNumber} for ${newInvoice.customerName}`);
      return { id, ...newInvoice };
    },

    async deleteInvoice(id) {
      const doc = await db.collection(COLLECTIONS.invoices).doc(id).get();
      const invoice = doc.exists ? doc.data() : null;
      await db.collection(COLLECTIONS.invoices).doc(id).delete();
      if (invoice) {
        await this.logActivity('Invoice deleted', `Deleted invoice #${invoice.invoiceNumber}`);
      }
      return true;
    },

    // -----------------------------
    // Analytics
    // -----------------------------

    async getAnalytics() {
      const snapshot = await db.collection(COLLECTIONS.analytics).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async addAnalyticsEntry(entry) {
      const id = generateId();
      const record = { ...entry, createdAt: entry.createdAt || new Date().toISOString() };
      await db.collection(COLLECTIONS.analytics).doc(id).set(record);
      return { id, ...record };
    },

    // -----------------------------
    // Activity Log
    // -----------------------------

    async getActivities() {
      const snapshot = await db.collection(COLLECTIONS.activity).orderBy('timestamp', 'desc').limit(50).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async logActivity(type, message) {
      const id = generateId();
      const activity = {
        type,
        message,
        timestamp: new Date().toISOString()
      };
      await db.collection(COLLECTIONS.activity).doc(id).set(activity);
      return activity;
    },

    // -----------------------------
    // Invoice numbering
    // -----------------------------

    async generateInvoiceNumber() {
      const snapshot = await db.collection(COLLECTIONS.invoices).get();
      const base = snapshot.size + 1;
      return `INV-${base.toString().padStart(4, '0')}`;
    },

    // -----------------------------
    // Utility
    // -----------------------------

    async clearAllDataExceptUsers() {
      const collectionsToClear = [COLLECTIONS.shop, COLLECTIONS.products, COLLECTIONS.invoices, COLLECTIONS.analytics, COLLECTIONS.activity];
      
      for (const colName of collectionsToClear) {
        const snapshot = await db.collection(colName).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      return true;
    }
  };

  // Make it globally available
  window.StorageAPI = StorageAPI;

  // Lightweight global activity tracking: keeps the current session "fresh"
  const activityEvents = ['click', 'keydown', 'mousemove', 'touchstart'];
  activityEvents.forEach((evt) => {
    window.addEventListener(
      evt,
      () => {
        StorageAPI.touchCurrentUser();
      },
      { passive: true }
    );
  });
})();
