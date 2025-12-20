// Photo Cropper - Theme Aware Design
let cropper = null;
let originalFile = null;

// Create cropper modal
function createCropperModal() {
  if (document.getElementById('cropperModal')) return;

  const modal = document.createElement('div');
  modal.id = 'cropperModal';
  modal.innerHTML = `
    <div class="crop-overlay"></div>
    <div class="crop-dialog">
      <div class="crop-header">
        <h3><i class="fas fa-crop-alt"></i> Adjust Photo</h3>
        <button type="button" class="crop-close-btn" id="closeCropperBtn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="crop-content">
        <div class="crop-image-area">
          <img id="cropperImage" src="" alt="Preview">
        </div>
      </div>
      <div class="crop-tools">
        <button type="button" class="crop-tool" data-action="rotate-left" title="Rotate Left">
          <i class="fas fa-undo"></i>
        </button>
        <button type="button" class="crop-tool" data-action="rotate-right" title="Rotate Right">
          <i class="fas fa-redo"></i>
        </button>
        <div class="crop-divider"></div>
        <button type="button" class="crop-tool" data-action="flip-h" title="Flip Horizontal">
          <i class="fas fa-arrows-alt-h"></i>
        </button>
        <button type="button" class="crop-tool" data-action="flip-v" title="Flip Vertical">
          <i class="fas fa-arrows-alt-v"></i>
        </button>
        <div class="crop-divider"></div>
        <button type="button" class="crop-tool" data-action="zoom-in" title="Zoom In">
          <i class="fas fa-plus"></i>
        </button>
        <button type="button" class="crop-tool" data-action="zoom-out" title="Zoom Out">
          <i class="fas fa-minus"></i>
        </button>
        <div class="crop-divider"></div>
        <button type="button" class="crop-tool" data-action="reset" title="Reset">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      <div class="crop-footer">
        <button type="button" class="crop-btn crop-btn-cancel" id="cancelCropBtn">
          Cancel
        </button>
        <button type="button" class="crop-btn crop-btn-save" id="uploadCropBtn">
          <i class="fas fa-check"></i> Save Photo
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Events
  document.getElementById('closeCropperBtn').addEventListener('click', closeCropper);
  document.getElementById('cancelCropBtn').addEventListener('click', closeCropper);
  document.getElementById('uploadCropBtn').addEventListener('click', uploadCroppedImage);
  modal.querySelector('.crop-overlay').addEventListener('click', closeCropper);

  // Tool buttons
  modal.querySelectorAll('.crop-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!cropper) return;
      const action = btn.dataset.action;
      switch (action) {
        case 'rotate-left': cropper.rotate(-90); break;
        case 'rotate-right': cropper.rotate(90); break;
        case 'flip-h': cropper.scaleX(-(cropper.getData().scaleX || 1)); break;
        case 'flip-v': cropper.scaleY(-(cropper.getData().scaleY || 1)); break;
        case 'zoom-in': cropper.zoom(0.1); break;
        case 'zoom-out': cropper.zoom(-0.1); break;
        case 'reset': cropper.reset(); break;
      }
    });
  });

  addCropperStyles();
}

function addCropperStyles() {
  if (document.getElementById('cropperStyles')) return;

  const style = document.createElement('style');
  style.id = 'cropperStyles';
  style.textContent = `
    /* Theme Variables for Cropper */
    #cropperModal {
      --crop-bg: #1e1e2e;
      --crop-bg-alt: #252536;
      --crop-bg-content: #1a1a28;
      --crop-text: #ffffff;
      --crop-text-muted: #94a3b8;
      --crop-border: rgba(255, 255, 255, 0.1);
      --crop-btn-bg: rgba(255, 255, 255, 0.08);
      --crop-btn-hover: rgba(255, 255, 255, 0.15);
      --crop-overlay: rgba(0, 0, 0, 0.85);
      --crop-accent: #818cf8;
      --crop-accent-hover: #6366f1;
      --crop-image-bg: #ffffff;
    }
    
    /* Light Theme */
    [data-theme="light"] #cropperModal {
      --crop-bg: #ffffff;
      --crop-bg-alt: #f8fafc;
      --crop-bg-content: #f1f5f9;
      --crop-text: #1e293b;
      --crop-text-muted: #64748b;
      --crop-border: rgba(0, 0, 0, 0.1);
      --crop-btn-bg: rgba(0, 0, 0, 0.06);
      --crop-btn-hover: rgba(0, 0, 0, 0.1);
      --crop-overlay: rgba(0, 0, 0, 0.6);
      --crop-accent: #6366f1;
      --crop-accent-hover: #4f46e5;
      --crop-image-bg: #ffffff;
    }
    
    #cropperModal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99999;
    }
    #cropperModal.active {
      display: block;
    }
    .crop-overlay {
      position: absolute;
      inset: 0;
      background: var(--crop-overlay);
      backdrop-filter: blur(8px);
    }
    .crop-dialog {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 480px;
      background: var(--crop-bg);
      border-radius: 16px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      border: 1px solid var(--crop-border);
    }
    .crop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: var(--crop-bg-alt);
      border-bottom: 1px solid var(--crop-border);
    }
    .crop-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--crop-text);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .crop-header h3 i {
      color: var(--crop-accent);
    }
    .crop-close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: var(--crop-btn-bg);
      color: var(--crop-text-muted);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .crop-close-btn:hover {
      background: #ef4444;
      color: #fff;
    }
    .crop-content {
      padding: 20px;
      background: var(--crop-bg-content);
    }
    .crop-image-area {
      width: 100%;
      height: 320px;
      background: var(--crop-image-bg);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--crop-border);
    }
    .crop-image-area img {
      max-width: 100%;
      max-height: 100%;
      display: block;
    }
    .crop-tools {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: var(--crop-bg-alt);
      border-top: 1px solid var(--crop-border);
    }
    .crop-tool {
      width: 42px;
      height: 42px;
      border: none;
      background: var(--crop-btn-bg);
      color: var(--crop-text);
      border-radius: 10px;
      cursor: pointer;
      font-size: 15px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .crop-tool:hover {
      background: var(--crop-accent);
      color: #fff;
      transform: scale(1.05);
    }
    .crop-tool:active {
      transform: scale(0.95);
    }
    .crop-divider {
      width: 1px;
      height: 28px;
      background: var(--crop-border);
      margin: 0 6px;
    }
    .crop-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      background: var(--crop-bg);
      border-top: 1px solid var(--crop-border);
    }
    .crop-btn {
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .crop-btn-cancel {
      background: var(--crop-btn-bg);
      color: var(--crop-text-muted);
    }
    .crop-btn-cancel:hover {
      background: var(--crop-btn-hover);
      color: var(--crop-text);
    }
    .crop-btn-save {
      background: linear-gradient(135deg, var(--crop-accent), var(--crop-accent-hover));
      color: #fff;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
    }
    .crop-btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }
    .crop-btn-save:disabled {
      opacity: 0.6;
      cursor: wait;
      transform: none;
    }
    
    /* Cropper.js Styles */
    .cropper-container {
      background: var(--crop-image-bg) !important;
    }
    .cropper-view-box {
      border-radius: 50%;
      outline: 3px solid var(--crop-accent);
      outline-offset: -1px;
    }
    .cropper-face {
      border-radius: 50%;
      background: transparent;
    }
    .cropper-modal {
      background: rgba(0, 0, 0, 0.5);
    }
    .cropper-point {
      background: var(--crop-accent);
      width: 8px;
      height: 8px;
    }
    .cropper-line {
      background: var(--crop-accent);
    }
    .cropper-bg {
      background: var(--crop-image-bg) !important;
    }
    
    @media (max-width: 480px) {
      .crop-dialog { width: 95%; max-width: none; }
      .crop-image-area { height: 260px; }
      .crop-tools { gap: 6px; padding: 12px; }
      .crop-tool { width: 38px; height: 38px; }
      .crop-footer { padding: 12px 16px; }
      .crop-btn { padding: 10px 18px; font-size: 13px; }
    }
  `;
  document.head.appendChild(style);
}

function openCropper(file) {
  createCropperModal();
  originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('cropperImage');
    img.src = e.target.result;

    document.getElementById('cropperModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    img.onload = () => {
      if (cropper) cropper.destroy();

      cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        guides: false,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        responsive: true,
        background: true,
        modal: true
      });
    };
  };
  reader.readAsDataURL(file);
}

function closeCropper() {
  document.getElementById('cropperModal').classList.remove('active');
  document.body.style.overflow = '';
  if (cropper) { cropper.destroy(); cropper = null; }
  originalFile = null;
  const photoInput = document.getElementById('photoInput');
  if (photoInput) photoInput.value = '';
}

function uploadCroppedImage() {
  if (!cropper) return;

  const btn = document.getElementById('uploadCropBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const canvas = cropper.getCroppedCanvas({
    width: 400,
    height: 400,
    fillColor: '#ffffff',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  });

  canvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('Failed to process image');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Save Photo';
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', blob, 'profile.jpg');

    try {
      // Use production API
      const API = 'https://backend-mu-sage.vercel.app/api';

      const token = localStorage.getItem('adminToken');
      console.log('Uploading cropped image to:', `${API}/profile/image`);

      const res = await fetch(`${API}/profile/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const previewImg = document.getElementById('previewImg');
        const photoInitials = document.getElementById('photoInitials');
        const removeBtn = document.getElementById('removePhotoBtn');

        if (previewImg) {
          previewImg.src = canvas.toDataURL('image/jpeg');
          previewImg.style.display = 'block';
        }
        if (photoInitials) photoInitials.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-flex';

        showToast('Photo saved! ✨');
        closeCropper();
      } else {
        showToast('Upload failed');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving photo');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Save Photo';
  }, 'image/jpeg', 0.9);
}

// Load Cropper.js
function loadCropperJS() {
  return new Promise((resolve) => {
    if (window.Cropper) { resolve(); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await loadCropperJS();
  createCropperModal();
});
