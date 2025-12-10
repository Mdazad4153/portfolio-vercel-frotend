
async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        e.target.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB');
        e.target.value = '';
        return;
    }

    // Upload immediately
    const formData = new FormData();
    formData.append('profileImage', file);

    // Show loading
    const preview = document.getElementById('previewImg');
    const originalSrc = preview.src;
    const parent = preview.parentElement;

    // Minimal loading feedback
    showToast('Uploading photo... ⏳');

    try {
        const res = await fetch(`${API}/profile/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // specific for upload, no Content-Type (auto-boundary)
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            const imgUrl = data.imageUrl.startsWith('http') ? data.imageUrl : `${API.replace('/api', '')}${data.imageUrl}`;
            preview.src = imgUrl; // Force refresh might be needed if url same
            preview.style.display = 'block';
            document.getElementById('photoInitials').style.display = 'none';
            document.getElementById('removePhotoBtn').style.display = 'inline-flex';
            showToast('Photo uploaded successfully! 📸');
        } else {
            showToast(data.message || 'Upload failed');
            preview.src = originalSrc;
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error during upload');
        preview.src = originalSrc;
    }

    // Clear input so selecting same file triggers change again
    e.target.value = '';
}

async function removePhoto() {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    try {
        const res = await fetch(`${API}/profile/image`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            document.getElementById('previewImg').src = PLACEHOLDER_IMAGE;
            document.getElementById('photoInitials').style.display = 'none'; // Or flex if we want initials separate
            document.getElementById('removePhotoBtn').style.display = 'none';

            // Reload to check if we should show initials or placeholder
            // Actually locally updating is faster
            document.getElementById('previewImg').src = PLACEHOLDER_IMAGE;
            // Check if name exists to show initials
            const name = document.querySelector('input[name="name"]').value || 'MA';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            document.getElementById('photoInitials').textContent = initials;
            document.getElementById('photoInitials').style.display = 'flex';
            document.getElementById('previewImg').style.display = 'none';

            showToast('Photo removed! 🗑️');
        } else {
            showToast('Failed to remove photo');
        }
    } catch {
        showToast('Connection error');
    }
}
