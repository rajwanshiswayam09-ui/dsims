(async () => {
  let currentUser = await StorageAPI.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'auth.html';
    return;
  }
  
  const shopForm = document.getElementById('shopForm');
  const saveBtn = document.getElementById('saveShop');
  const profilePicInput = document.getElementById('profilePicInput');
  const profilePicDisplay = document.getElementById('profilePicDisplay');
  const saveUserProfileBtn = document.getElementById('saveUserProfile');
  const updateUserNameInput = document.getElementById('updateUserName');
  const profileNameDisplay = document.getElementById('profileNameDisplay');
  const profileEmailDisplay = document.getElementById('profileEmailDisplay');

  // Load User Profile
  const loadProfile = () => {
    if (currentUser) {
      profileNameDisplay.textContent = currentUser.name || 'Admin User';
      profileEmailDisplay.textContent = currentUser.email;
      updateUserNameInput.value = currentUser.name || '';
      if (currentUser.profilePic) {
        profilePicDisplay.src = currentUser.profilePic;
      } else {
        profilePicDisplay.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Admin')}&background=38bdf8&color=fff&size=150`;
      }
    }
  };

  loadProfile();

  // Handle Profile Pic Upload
  profilePicInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showToast('Image too large. Max 2MB.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        try {
          const updatedUser = await StorageAPI.updateUserProfile(currentUser.email, { profilePic: base64 });
          currentUser = updatedUser; // Update session local reference
          profilePicDisplay.src = base64;
          updateTopbarProfile(updatedUser);
          showToast('Profile picture updated');
        } catch (error) {
          showToast('Failed to update picture', 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle Profile Update
  saveUserProfileBtn.addEventListener('click', async () => {
    const newName = updateUserNameInput.value.trim();
    if (!newName) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    try {
      const updatedUser = await StorageAPI.updateUserProfile(currentUser.email, { name: newName });
      currentUser = updatedUser; // Update session local reference
      profileNameDisplay.textContent = newName;
      updateTopbarProfile(updatedUser);
      showToast('Profile updated successfully');
    } catch (error) {
      showToast('Failed to update profile', 'error');
    }
  });

  const existingShop = await StorageAPI.getShopDetails();

  if (existingShop) {
    document.getElementById('shopName').value = existingShop.shopName || '';
    document.getElementById('ownerName').value = existingShop.ownerName || '';
    document.getElementById('category').value = existingShop.category || '';
    document.getElementById('currency').value = existingShop.currency || '';
  }

  // Initial topbar update
  if (currentUser) {
    updateTopbarProfile(currentUser);
  }

  saveBtn.addEventListener('click', async () => {
    const shopDetails = {
      shopName: document.getElementById('shopName').value.trim(),
      ownerName: document.getElementById('ownerName').value.trim(),
      category: document.getElementById('category').value.trim(),
      currency: document.getElementById('currency').value.trim()
    };

    if (!shopDetails.shopName || !shopDetails.ownerName || !shopDetails.category || !shopDetails.currency) {
      showToast('Please enter all fields.', 'error');
      return;
    }

    try {
      await StorageAPI.saveShopDetails(shopDetails);
      showToast('Shop details saved successfully');
    } catch (error) {
      showToast('Error: ' + (error.message || 'Failed to save.'), 'error');
    }
  });
})();
