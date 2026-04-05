// Guard auth
(async () => {
  const activeUser = await StorageAPI.getCurrentUser();
  if (!activeUser) {
    window.location.href = 'auth.html';
    return;
  }

  const totalProductsEl = document.getElementById('totalProducts');
  const lowStockEl = document.getElementById('lowStock');
  const inventoryValueEl = document.getElementById('inventoryValue');
  const inventoryTable = document.getElementById('inventoryTable');
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalForm = document.getElementById('productModalForm');
  const modalId = document.getElementById('modalProductId');
  const modalName = document.getElementById('modalName');
  const modalCategory = document.getElementById('modalCategory');
  const modalPrice = document.getElementById('modalPrice');
  const modalQty = document.getElementById('modalQty');

  const openAdd = document.getElementById('openAdd');
  const closeModal = document.getElementById('closeModal');

  let shop = await StorageAPI.getShopDetails();
  let products = [];

  const currencyFormatter = (value) => {
    const symbol = shop?.currency || 'USD';
    return `${symbol} ${Number(value || 0).toFixed(2)}`;
  };

  const animateCounter = (el, target) => {
    const start = 0;
    const duration = 1000;
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor(progress * target);
      el.textContent = current;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    };
    window.requestAnimationFrame(step);
  };

  const animateValueCounter = (el, target) => {
    const symbol = shop?.currency || 'USD';
    const duration = 1000;
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = progress * target;
      el.textContent = `${symbol} ${current.toFixed(2)}`;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = `${symbol} ${target.toFixed(2)}`;
      }
    };
    window.requestAnimationFrame(step);
  };

  const renderStats = (animate = false) => {
    if (animate) {
      animateCounter(totalProductsEl, products.length);
      animateCounter(lowStockEl, InventoryUtils.countLowStock(products));
      animateValueCounter(inventoryValueEl, InventoryUtils.calculateInventoryValue(products));
    } else {
      totalProductsEl.textContent = products.length;
      lowStockEl.textContent = InventoryUtils.countLowStock(products);
      inventoryValueEl.textContent = currencyFormatter(InventoryUtils.calculateInventoryValue(products));
    }
  };

  const toggleModal = (show) => {
    modal.classList.toggle('active', show);
  };

  const renderTable = () => {
    inventoryTable.innerHTML = '';
    if (products.length === 0) {
      inventoryTable.innerHTML = `
        <tr>
          <td colspan="6">
            <div style="text-align: center; padding: 3rem 1rem;">
              <div style="font-size: 3rem; color: var(--border); margin-bottom: 1rem;">
                <i class="fas fa-box-open"></i>
              </div>
              <h3 style="color: var(--text-muted); margin-bottom: 0.5rem;">No products yet</h3>
              <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Start by adding your first product to manage your inventory.</p>
              <button class="btn btn-primary" onclick="document.getElementById('openAdd').click()">
                <i class="fas fa-plus"></i> Add First Product
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    products.forEach(prod => {
      const statusLow = Number(prod.quantity) < 5;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="Product Name"><span style="font-weight: 600;">${prod.name}</span></td>
        <td data-label="Category"><span class="badge" style="background: rgba(148, 163, 184, 0.1);">${prod.category}</span></td>
        <td data-label="Price">${currencyFormatter(prod.price)}</td>
        <td data-label="Quantity">${prod.quantity}</td>
        <td data-label="Status"><span class="badge ${statusLow ? 'badge-danger' : 'badge-success'}">${statusLow ? 'Low Stock' : 'In Stock'}</span></td>
        <td class="actions-cell">
          <button class="btn btn-ghost" style="padding: 0.4rem;" data-id="${prod.id}" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost" style="padding: 0.4rem; color: var(--danger);" data-id="${prod.id}" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>
        </td>
      `;
      inventoryTable.appendChild(row);
    });
  };

  openAdd.addEventListener('click', () => {
    modalTitle.textContent = 'Add Product';
    modalId.value = '';
    modalForm.reset();
    toggleModal(true);
  });

  closeModal.addEventListener('click', () => toggleModal(false));
  document.getElementById('cancelModal').addEventListener('click', () => toggleModal(false));

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: modalName.value.trim(),
      category: modalCategory.value.trim(),
      price: parseFloat(modalPrice.value),
      quantity: parseInt(modalQty.value, 10)
    };
    if (!payload.name || !payload.category || isNaN(payload.price) || isNaN(payload.quantity)) {
      showToast('Fill all fields correctly.', 'error');
      return;
    }

    try {
      if (modalId.value) {
        await StorageAPI.updateProduct(modalId.value, payload);
        showToast('Product updated successfully');
      } else {
        await StorageAPI.addProduct(payload);
        showToast('Product added successfully');
      }
      toggleModal(false);
      await loadData();
    } catch (error) {
      showToast('Error saving product: ' + error.message, 'error');
    }
  });

  inventoryTable.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!action || !id) return;

    if (action === 'edit') {
      const prod = products.find(p => p.id === id);
      if (!prod) return;
      modalTitle.textContent = 'Edit Product';
      modalId.value = prod.id;
      modalName.value = prod.name;
      modalCategory.value = prod.category || '';
      modalPrice.value = prod.price;
      modalQty.value = prod.quantity;
      toggleModal(true);
    }

    if (action === 'delete') {
      if (confirm('Delete this product?')) {
        try {
          await StorageAPI.deleteProduct(id);
          showToast('Product deleted successfully');
          await loadData();
        } catch (error) {
          showToast('Error deleting product: ' + error.message, 'error');
        }
      }
    }
  });

  const loadData = async () => {
    shop = await StorageAPI.getShopDetails();
    products = await StorageAPI.getProducts();
    const user = await StorageAPI.getCurrentUser();
    if (user) {
      updateTopbarProfile(user);
    }
    renderStats(true); // Animate stats on load
    renderTable();
    renderActivities();
  };

  const renderActivities = async () => {
    const activities = await StorageAPI.getActivities();
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No activity logged yet.</p>';
      return;
    }

    container.innerHTML = activities.slice(0, 5).map(act => `
      <div style="display: flex; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-top: 0.5rem; flex-shrink: 0;"></div>
        <div>
          <p style="margin: 0; font-weight: 600; font-size: 0.875rem;">${act.type}</p>
          <p style="margin: 0; font-size: 0.8125rem; color: var(--text-muted);">${act.message}</p>
          <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--text-muted); opacity: 0.7;">${new Date(act.timestamp).toLocaleString()}</p>
        </div>
      </div>
    `).join('');
  };

  await loadData();
})();
