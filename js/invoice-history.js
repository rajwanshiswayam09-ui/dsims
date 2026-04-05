(async () => {
  const activeUser = await StorageAPI.getCurrentUser();
  if (!activeUser) {
    window.location.href = 'auth.html';
    return;
  }

  const tableBody = document.getElementById('invoiceHistoryTable');
  const searchInput = document.getElementById('invoiceSearch');
  const viewModal = document.getElementById('viewInvoiceModal');
  const viewContent = document.getElementById('invoiceViewContent');
  const printModalBtn = document.getElementById('printModalBtn');

  let invoices = [];
  let shop = await StorageAPI.getShopDetails();

  const currencyFormatter = (value) => {
    const symbol = shop?.currency || 'USD';
    return `${symbol} ${Number(value || 0).toFixed(2)}`;
  };

  const loadInvoices = async () => {
    invoices = await StorageAPI.getInvoices();
    renderInvoices(invoices);
  };

  const renderInvoices = (list) => {
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div style="text-align: center; padding: 3rem 1rem;">
              <div style="font-size: 3rem; color: var(--border); margin-bottom: 1rem;">
                <i class="fas fa-file-invoice"></i>
              </div>
              <h3 style="color: var(--text-muted); margin-bottom: 0.5rem;">No invoices found</h3>
              <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Create your first invoice to see it here in the history.</p>
              <button class="btn btn-primary" onclick="location.href='invoice.html'">
                <i class="fas fa-plus"></i> Create First Invoice
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    list.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="Invoice #"><strong>#${inv.invoiceNumber}</strong></td>
        <td data-label="Customer">${inv.customerName}</td>
        <td data-label="Date">${new Date(inv.date).toLocaleDateString()}</td>
        <td data-label="Total">${currencyFormatter(inv.grandTotal)}</td>
        <td data-label="Status"><span class="badge badge-success">Completed</span></td>
        <td class="actions-cell">
          <button class="btn btn-ghost" onclick="viewInvoice('${inv.id}')" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn btn-ghost" style="color: var(--danger);" onclick="deleteInvoice('${inv.id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  };

  window.viewInvoice = (id) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    viewContent.innerHTML = `
      <div style="padding: 1rem;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <div>
            <h2 style="margin: 0;">#${inv.invoiceNumber}</h2>
            <p style="margin: 0; color: var(--text-muted);">${new Date(inv.date).toDateString()}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0;">${inv.shopDetails?.shopName || 'DSIMS'}</h3>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-muted);">${inv.shopDetails?.ownerName || ''}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <p style="margin: 0; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Bill To:</p>
          <h4 style="margin: 0;">${inv.customerName}</h4>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border);">
              <th style="text-align: left; padding: 0.5rem 0;">Item</th>
              <th style="text-align: center; padding: 0.5rem 0;">Qty</th>
              <th style="text-align: right; padding: 0.5rem 0;">Price</th>
              <th style="text-align: right; padding: 0.5rem 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(item => `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.5rem 0;">${item.name}</td>
                <td style="text-align: center; padding: 0.5rem 0;">${item.quantity}</td>
                <td style="text-align: right; padding: 0.5rem 0;">${currencyFormatter(item.price)}</td>
                <td style="text-align: right; padding: 0.5rem 0;">${currencyFormatter(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
          <p style="margin: 0;">Subtotal: ${currencyFormatter(inv.subtotal)}</p>
          <p style="margin: 0;">Tax (5%): ${currencyFormatter(inv.tax)}</p>
          <h3 style="margin: 0; color: var(--accent);">Grand Total: ${currencyFormatter(inv.grandTotal)}</h3>
        </div>
      </div>
    `;

    viewModal.classList.add('active');
    printModalBtn.onclick = () => {
      window.print();
    };
  };

  window.deleteInvoice = async (id) => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await StorageAPI.deleteInvoice(id);
        showToast('Invoice deleted successfully');
        loadInvoices();
      } catch (error) {
        showToast('Error deleting invoice', 'error');
      }
    }
  };

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = invoices.filter(inv => 
      inv.customerName.toLowerCase().includes(query) || 
      inv.invoiceNumber.toLowerCase().includes(query)
    );
    renderInvoices(filtered);
  });

  // Topbar update
  if (activeUser) {
    updateTopbarProfile(activeUser);
  }

  loadInvoices();
})();