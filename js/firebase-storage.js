/**
 * Firebase-backed Storage API for DSIMS with User-Based Data Isolation.
 */

(function () {
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Admin email - hardcoded as requested
  const ADMIN_EMAIL = 'rajwanshiswayam@gmail.com'; // Replace with your actual admin email

  const KEYS = {
    currentUser: 'currentUser'
  };

  const generateId = () => `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const now = () => Date.now();

  // Helper to get current user UID or null
  const getCurrentUid = async () => {
    const user = auth.currentUser;
    if (user) return user.uid;
    
    // Fallback to localStorage if auth not ready
    const stored = localStorage.getItem(KEYS.currentUser);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.uid || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Check if current user is admin
  const isAdminUser = async () => {
    const user = auth.currentUser;
    if (user && user.email) {
      return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(KEYS.currentUser);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.email && parsed.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  // Get Firestore path prefix for current user
  const getUserPath = async (collection) => {
    const isAdmin = await isAdminUser();
    if (isAdmin) {
      // Admin uses root collections (legacy data)
      return collection;
    }
    
    const uid = await getCurrentUid();
    if (!uid) throw new Error('No user logged in');
    
    // Regular users use subcollections under /users/{uid}
    return `users/${uid}/${collection}`;
  };

  const StorageAPI = {
    // -----------------------------
    // User & Session Management
    // -----------------------------

    async getCurrentUser() {
      let user = auth.currentUser;
      if (user) {
        const userObj = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email,
          lastActive: now()
        };
        localStorage.setItem(KEYS.currentUser, JSON.stringify(userObj));
        return userObj;
      }
      
      // Fallback to localStorage
      const raw = localStorage.getItem(KEYS.currentUser);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    async setCurrentUser(user) {
      if (!user) {
        localStorage.removeItem(KEYS.currentUser);
        return null;
      }
      
      const current = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.name || user.email,
        lastActive: now()
      };
      
      localStorage.setItem(KEYS.currentUser, JSON.stringify(current));
      return current;
    },

    async clearCurrentUser() {
      localStorage.removeItem(KEYS.currentUser);
      return true;
    },

    async updateUserProfile(email, data) {
      const user = auth.currentUser;
      if (user) {
        if (data.name) {
          await user.updateProfile({ displayName: data.name });
        }
      }
      
      // Update localStorage
      const current = await this.getCurrentUser();
      if (current) {
        const updated = { ...current, ...data };
        localStorage.setItem(KEYS.currentUser, JSON.stringify(updated));
        return updated;
      }
      return null;
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
      const path = await getUserPath('shop');
      const doc = await db.doc(`${path}/details`).get();
      return doc.exists ? doc.data() : null;
    },

    async saveShopDetails(details) {
      const path = await getUserPath('shop');
      await db.doc(`${path}/details`).set({
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
      const path = await getUserPath('products');
      const snapshot = await db.collection(path).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async addProduct(product) {
      const id = generateId();
      const { id: incomingId, ...rest } = product;
      const newProduct = { 
        ...rest, 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const path = await getUserPath('products');
      await db.collection(path).doc(id).set(newProduct);
      await this.logActivity('Product added', `Added product: ${newProduct.name}`);
      return { id, ...newProduct };
    },

    async updateProduct(id, data) {
      const path = await getUserPath('products');
      const prodRef = db.collection(path).doc(id);
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
      const path = await getUserPath('products');
      const doc = await db.collection(path).doc(id).get();
      const product = doc.exists ? doc.data() : null;
      await db.collection(path).doc(id).delete();
      if (product) {
        await this.logActivity('Product deleted', `Deleted product: ${product.name}`);
      }
      return true;
    },

    // -----------------------------
    // Invoices
    // -----------------------------

    async getInvoices() {
      const path = await getUserPath('invoices');
      const snapshot = await db.collection(path).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async addInvoice(invoice) {
      const id = generateId();
      const newInvoice = { 
        ...invoice, 
        createdAt: new Date().toISOString()
      };
      
      const path = await getUserPath('invoices');
      await db.collection(path).doc(id).set(newInvoice);
      
      // Update product quantities in Firestore
      if (newInvoice.items && Array.isArray(newInvoice.items)) {
        const productsPath = await getUserPath('products');
        for (const item of newInvoice.items) {
          if (item.productId) {
            const prodRef = db.collection(productsPath).doc(item.productId);
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
      const path = await getUserPath('invoices');
      const doc = await db.collection(path).doc(id).get();
      const invoice = doc.exists ? doc.data() : null;
      await db.collection(path).doc(id).delete();
      if (invoice) {
        await this.logActivity('Invoice deleted', `Deleted invoice #${invoice.invoiceNumber}`);
      }
      return true;
    },

    // -----------------------------
    // Analytics
    // -----------------------------

    async getAnalytics() {
      const path = await getUserPath('analytics');
      const snapshot = await db.collection(path).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async addAnalyticsEntry(entry) {
      const id = generateId();
      const record = { ...entry, createdAt: entry.createdAt || new Date().toISOString() };
      
      const path = await getUserPath('analytics');
      await db.collection(path).doc(id).set(record);
      return { id, ...record };
    },

    // -----------------------------
    // Activity Log
    // -----------------------------

    async getActivities() {
      const path = await getUserPath('activity');
      const snapshot = await db.collection(path).orderBy('timestamp', 'desc').limit(50).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    async logActivity(type, message) {
      const id = generateId();
      const activity = {
        type,
        message,
        timestamp: new Date().toISOString()
      };
      
      const path = await getUserPath('activity');
      await db.collection(path).doc(id).set(activity);
      return activity;
    },

    // -----------------------------
    // Invoice numbering
    // -----------------------------

    async generateInvoiceNumber() {
      const path = await getUserPath('invoices');
      const snapshot = await db.collection(path).get();
      const base = snapshot.size + 1;
      return `INV-${base.toString().padStart(4, '0')}`;
    },

    // -----------------------------
    // First Time Setup Check
    // -----------------------------

    async hasCompletedSetup() {
      const shopDetails = await this.getShopDetails();
      return !!shopDetails;
    }
  };

  // Make it globally available
  window.StorageAPI = StorageAPI;

  // Lightweight global activity tracking
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
