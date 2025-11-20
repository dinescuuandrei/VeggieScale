const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const cameraView = document.getElementById('camera-view');
const uploadView = document.getElementById('upload-view');
const fileInput = document.getElementById('file-input');
const previewImage = document.getElementById('preview-image');
const cartItems = document.getElementById('cart-items');
const totalPriceEl = document.getElementById('total-price');
const loader = document.getElementById('loader');
const modeBtns = document.querySelectorAll('.mode-toggle');
const notificationArea = document.getElementById('notification-area');
const uploadTrigger = document.querySelector('.upload-trigger');
const receiptModal = document.getElementById('receipt-modal');
const finalItemsList = document.getElementById('final-items-list');
const finalPriceEl = document.getElementById('final-price');

let currentMode = 'camera';
let totalAmount = 0.00;
let cartData = [];

document.addEventListener('DOMContentLoaded', () => {
    loader.classList.remove('show');
});

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(console.error);

function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `✅ ${message}` : `⚠️ ${message}`;
    notificationArea.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setMode(mode) {
    currentMode = mode;
    modeBtns.forEach(btn => btn.classList.remove('active'));
    if(mode === 'camera') {
        modeBtns[0].classList.add('active');
        cameraView.classList.remove('hidden');
        uploadView.classList.add('hidden');
    } else {
        modeBtns[1].classList.add('active');
        cameraView.classList.add('hidden');
        uploadView.classList.remove('hidden');
    }
}

function triggerUpload() {
    fileInput.click();
}

function resetUploadView() {
    fileInput.value = '';
    previewImage.src = '';
    previewImage.classList.add('hidden');
    uploadTrigger.classList.remove('hidden');
}

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            uploadTrigger.classList.add('hidden');
        }
        reader.readAsDataURL(file);
    }
});

function addToCart(name, price) {
    const emptyMsg = document.querySelector('.empty-placeholder');
    if(emptyMsg) emptyMsg.remove();

    cartData.push({
        product: name,
        price: price,
        timestamp: new Date().toISOString()
    });

    const item = document.createElement('div');
    item.classList.add('cart-item');

    let emoji = '🍎';
    if(name.includes('banana')) emoji = '🍌';
    if(name.includes('orange')) emoji = '🍊';

    item.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px;">
            <div style="font-size:2rem;">${emoji}</div>
            <div>
                <div class="item-name">${name.toUpperCase().replace('_', ' ')}</div>
                <div class="item-meta">Fresh • Bio</div>
            </div>
        </div>
        <div class="item-price">${price.toFixed(2)}</div>
    `;

    cartItems.prepend(item);
    totalAmount += price;
    totalPriceEl.innerText = totalAmount.toFixed(2) + ' Lei';
    showNotification(`${name.toUpperCase()} added!`, 'success');
}

function openReceiptModal() {
    if (cartData.length === 0) {
        showNotification("Basket is empty!", "error");
        return;
    }

    finalItemsList.innerHTML = '';
    cartData.forEach(item => {
        const row = document.createElement('div');
        row.classList.add('final-item-row');
        row.innerHTML = `
            <span>${item.product.toUpperCase().replace('_', ' ')}</span>
            <span>${item.price.toFixed(2)} Lei</span>
        `;
        finalItemsList.appendChild(row);
    });

    finalPriceEl.innerText = totalAmount.toFixed(2) + ' Lei';
    receiptModal.classList.remove('hidden');
}

function closeReceiptModal() {
    receiptModal.classList.add('hidden');
}

function exportToDatabase() {
    const exportData = {
        transaction_id: "TRX-" + Date.now(),
        date: new Date().toLocaleString(),
        total_amount: totalAmount,
        currency: "RON",
        items: cartData
    };

    const dataStr = JSON.stringify(exportData, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `veggie_receipt_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showNotification("Exported successfully!", "success");
}

function processImage() {
    loader.classList.add('show');
    let imageData;

    if (currentMode === 'camera') {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageData = canvas.toDataURL('image/jpeg');
    } else {
        if (!previewImage.src || previewImage.classList.contains('hidden')) {
            showNotification("Select an image!", "error");
            loader.classList.remove('show');
            return;
        }
        imageData = previewImage.src;
    }

    fetch('/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ image: imageData })
    })
    .then(res => res.json())
    .then(data => {
        loader.classList.remove('show');

        if(data.confidence > 0.95) {
            addToCart(data.label, data.price);
            if(currentMode === 'upload') setTimeout(resetUploadView, 1000);
        } else {
            const confPercent = (data.confidence * 100).toFixed(1);
            showNotification(`Unsure (${confPercent}%). Try again.`, "error");
            if(currentMode === 'upload') setTimeout(resetUploadView, 1500);
        }
    })
    .catch(err => {
        loader.classList.remove('show');
        console.error(err);
        showNotification("Connection Error", "error");
    });
}