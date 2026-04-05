const shopForm = document.getElementById('shopForm');
const productForm = document.getElementById('productForm');
const productTable = document.getElementById('productTable');
const addProductBtn = document.getElementById('addProductBtn');
const finishSetupBtn = document.getElementById('finishSetup');

let tempProducts = [];

(async () => {
  const currentUser = await StorageAPI.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  const renderProducts = () => {
    productTable.innerHTML = '';
    tempProducts.forEach((p, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.price}</td>
        <td>${p.quantity}</td>
      `;
      row.addEventListener('click', () => {
        if (confirm('Remove this item?')) {
          tempProducts.splice(idx, 1);
          renderProducts();
        }
      });
      productTable.appendChild(row);
    });
  };

  addProductBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQty').value, 10);
    const category = document.getElementById('productCategory').value.trim();

    if (!name || isNaN(price) || isNaN(quantity) || !category) {
      showToast('Please fill all product fields.', 'error');
      return;
    }

    tempProducts.push({ name, price, quantity, category, id: `temp-${Date.now()}` });
    productForm.reset();
    renderProducts();
    showToast('Product added to list');
  });

  finishSetupBtn.addEventListener('click', async () => {
    const shopDetails = {
      shopName: document.getElementById('shopName').value.trim(),
      ownerName: document.getElementById('ownerName').value.trim(),
      category: document.getElementById('category').value.trim(),
      currency: document.getElementById('currency').value.trim()
    };

    if (!shopDetails.shopName || !shopDetails.ownerName || !shopDetails.category || !shopDetails.currency) {
      showToast('Please complete shop details.', 'error');
      return;
    }

    try {
      await StorageAPI.saveShopDetails(shopDetails);
      
      // Add all products
      for (const product of tempProducts) {
        await StorageAPI.addProduct(product);
      }
      
      showToast('Setup completed! Redirecting...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } catch (error) {
      showToast('Error saving setup: ' + error.message, 'error');
    }
  });

  // Prefill if data exists
  const existingShop = await StorageAPI.getShopDetails();
  if (existingShop) {
    document.getElementById('shopName').value = existingShop.shopName || '';
    document.getElementById('ownerName').value = existingShop.ownerName || '';
    document.getElementById('category').value = existingShop.category || '';
    document.getElementById('currency').value = existingShop.currency || '';
  }
})();
