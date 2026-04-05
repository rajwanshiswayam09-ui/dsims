// Initialize - check auth
(async () => {
  const active = await StorageAPI.getCurrentUser();
  if (!active) {
    window.location.href = 'auth.html';
    return;
  }

  const invoiceNumberEl = document.getElementById('invoiceNumber');
  const invoiceDateEl = document.getElementById('invoiceDate');
  const invoiceDateInput = document.getElementById('invoiceDateInput');
  const shopDetailsDisplay = document.getElementById('shopDetailsDisplay');
  const invoiceProductsBody = document.getElementById('invoiceProducts');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const grandTotalEl = document.getElementById('grandTotal');
  const customerNameInput = document.getElementById('customerName');
  const saveBtn = document.getElementById('saveInvoice');
  const downloadBtn = document.getElementById('downloadInvoice');
  const topPrintBtn = document.getElementById('topPrint');

  let shop = await StorageAPI.getShopDetails();
  let products = await StorageAPI.getProducts();

  // Currency formatter
  const currency = (shop && shop.currency) || 'USD';
  const formatCurrency = (() => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency });
    } catch (e) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
    }
  })();

  const renderInvoiceHeader = async () => {
    const num = await StorageAPI.generateInvoiceNumber();
    invoiceNumberEl.textContent = `#${num}`;
    const today = new Date().toISOString().split('T')[0];
    invoiceDateInput.value = today;
    invoiceDateEl.textContent = new Date(today).toDateString();

    if (shop) {
      shopDetailsDisplay.innerHTML = `
        <div style="text-align: right; line-height: 1.4;">
          <h2 style="margin: 0; font-size: 1.75rem; color: var(--accent); font-weight: 800; text-transform: uppercase;">${shop.shopName}</h2>
          <p style="margin: 0.15rem 0 0.5rem; font-size: 0.95rem; font-weight: 600; color: var(--text-muted); text-transform: capitalize; letter-spacing: 0.05em;">${shop.category}</p>
          <div style="margin-top: 0.75rem; font-size: 0.875rem;">
            <p style="margin: 0; color: var(--text-main);"><span style="color: var(--text-muted); font-weight: 500;">Owner:</span> ${shop.ownerName}</p>
            <p style="margin: 0; color: var(--text-main);"><span style="color: var(--text-muted); font-weight: 500;">Currency:</span> ${shop.currency}</p>
          </div>
        </div>
      `;
    }
  };

  const renderProductRows = () => {
    invoiceProductsBody.innerHTML = '';
    products.forEach(prod => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="no-print" data-label="Select"><input type="checkbox" data-id="${prod.id}" checked style="width: 18px; height: 18px; cursor: pointer;"></td>
        <td data-label="Product"><span style="font-weight: 600;">${prod.name}</span></td>
        <td data-label="Price">${formatCurrency.format(Number(prod.price) || 0)}</td>
        <td data-label="Qty"><input type="number" min="1" value="1" data-qty="${prod.id}" class="form-control qty-input" style="padding: 0.4rem;"></td>
        <td data-label="Total" class="line-total" data-total="${prod.id}" style="text-align: right; font-weight: 600;">0</td>
      `;
      invoiceProductsBody.appendChild(row);
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    invoiceProductsBody.querySelectorAll('tr').forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const qtyInput = row.querySelector('.qty-input');
      const prodId = checkbox.getAttribute('data-id');
      const product = products.find(p => p.id === prodId);
      const qty = Number(qtyInput.value) || 0;
      const lineTotalCell = row.querySelector('.line-total');

      if (checkbox.checked && product) {
        const line = qty * Number(product.price);
        lineTotalCell.textContent = formatCurrency.format(line || 0);
        subtotal += line;
      } else {
        lineTotalCell.textContent = '0';
      }
    });

    const tax = subtotal * 0.05;
    const grand = subtotal + tax;
    subtotalEl.textContent = formatCurrency.format(subtotal || 0);
    taxEl.textContent = formatCurrency.format(tax || 0);
    grandTotalEl.textContent = formatCurrency.format(grand || 0);
    return { subtotal, tax, grand };
  };

  invoiceProductsBody.addEventListener('change', calculateTotals);
  invoiceDateInput.addEventListener('change', () => {
    invoiceDateEl.textContent = new Date(invoiceDateInput.value).toDateString();
  });

  const gatherInvoice = () => {
    const totals = calculateTotals();
    const items = [];
    invoiceProductsBody.querySelectorAll('tr').forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const qtyInput = row.querySelector('.qty-input');
      if (!checkbox.checked) return;
      const id = checkbox.getAttribute('data-id');
      const product = products.find(p => p.id === id);
      const quantity = Number(qtyInput.value) || 0;
      if (product && quantity > 0) {
        items.push({
          productId: id,
          name: product.name,
          price: Number(product.price),
          quantity,
          total: quantity * Number(product.price)
        });
      }
    });

    if (!items.length) {
      showToast('Select at least one product.', 'error');
      return null;
    }

    return {
      invoiceNumber: invoiceNumberEl.textContent.replace('#', ''),
      customerName: customerNameInput.value.trim() || 'Walk-in Customer',
      date: invoiceDateInput.value,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      grandTotal: totals.grand,
      shopDetails: shop
    };
  };

  saveBtn.addEventListener('click', async () => {
    const invoice = gatherInvoice();
    if (!invoice) return;
    try {
      await StorageAPI.addInvoice(invoice);
      showToast('Invoice saved as draft');
      await renderInvoiceHeader();
      products = await StorageAPI.getProducts();
      renderProductRows();
      calculateTotals();
    } catch (error) {
      showToast('Error saving invoice: ' + error.message, 'error');
    }
  });

  const preparePrint = () => {
    invoiceProductsBody.querySelectorAll('tr').forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        row.style.display = 'none';
      }
    });
  };

  const cleanupPrint = () => {
    invoiceProductsBody.querySelectorAll('tr').forEach(row => {
      row.style.display = '';
    });
  };

  downloadBtn.addEventListener('click', async () => {
    const invoice = gatherInvoice();
    if (!invoice) return;
    try {
      await StorageAPI.addInvoice(invoice);
      
      showToast('Invoice finalized and printing...');
      const restoreAfterPrint = () => {
        window.onafterprint = null;
        cleanupPrint();
        (async () => {
          await renderInvoiceHeader();
          products = await StorageAPI.getProducts();
          renderProductRows();
          calculateTotals();
        })();
      };
      window.onafterprint = restoreAfterPrint;
      preparePrint();
      window.print();
    } catch (error) {
      showToast('Error saving invoice: ' + error.message, 'error');
    }
  });

  if (topPrintBtn) {
    topPrintBtn.addEventListener('click', () => {
      const totals = calculateTotals();
      if (!totals || totals.subtotal <= 0) {
        showToast('Select at least one product before printing.', 'error');
        return;
      }
      preparePrint();
      window.onafterprint = () => {
        window.onafterprint = null;
        cleanupPrint();
      };
      window.print();
    });
  }

  // Initialize
  const user = await StorageAPI.getCurrentUser();
  if (user) {
    updateTopbarProfile(user);
  }

  await renderInvoiceHeader();
  renderProductRows();
  calculateTotals();
})();
