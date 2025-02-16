document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const originalImage = document.getElementById("originalImage");
    const fileNameDisplay = document.getElementById("fileName");
    const predictBtn = document.getElementById("predictBtn");
    const alertModal = document.getElementById("alertModal");
    const modalMessage = document.getElementById("modalMessage");
    const loadingOverlay = document.getElementById("loadingOverlay");
    
    // ฟังก์ชันสำหรับแสดงสถานะ
    function showAlert(message) {
        modalMessage.textContent = message;
        new bootstrap.Modal(alertModal).show();
    }

    // ฟังก์ชันสำหรับซ่อนสถานะ
    function hideAlert() {
        new bootstrap.Modal(alertModal).hide();
    }

    // แสดงแอนิเมชันโหลด
    function showLoading() {
        loadingOverlay.classList.remove("d-none");
    }

    // ซ่อนแอนิเมชันโหลด
    function hideLoading() {
        loadingOverlay.classList.add("d-none");
    }

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.textContent = "No file selected.";
            originalImage.src = "";
        }
    });

    predictBtn.addEventListener("click", () => {
        if (!fileInput.files.length) {
            alert("Please select a file first.");
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);

        showLoading(); // แสดงแอนิเมชันตอนเริ่มพยากรณ์

        fetch('/predict', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            hideLoading(); // ซ่อนแอนิเมชันเมื่อ predict เสร็จ
            if (data.path) {
                predictedImage.src = data.path;
            } else {
                alert("Prediction completed, but no image path received.");
            }
        })
        .catch(error => {
            hideLoading();
            alert("Error during prediction");
            console.error('Error:', error);
        });
    });

    // คำสั่งสำหรับ Clear
    document.getElementById('clearBtn').addEventListener('click', () => {
            // รีเซ็ต input file
        fileInput.value = "";

        // ลบข้อความที่แสดงชื่อไฟล์
        fileNameDisplay.textContent = "No file selected.";

        // ลบรูปภาพที่แสดงอยู่
        originalImage.src = "";
        predictedImage.src = "";
        
        document.getElementById('originalImage').src = '';
        document.getElementById('predictedImage').src = '';
        showAlert("Clearing files...");

        fetch('/clear-upload', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                showAlert(data.message);
                hideAlert();
            })
            .catch(error => {
                hideAlert();
                console.error('Error:', error);
            });
    });

    // ปุ่ม save
    document.getElementById('saveBtn').addEventListener('click', () => {
        const file_path = document.getElementById('predictedImage').src;
        if (!file_path) {
            showAlert('No predicted image available to save.');
            return;
        }

        showAlert("Saving result...");

        fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path, uploaded_at: new Date().toISOString() })
        })
        .then(response => response.json())
        .then(data => {
            showAlert(data.message);
            hideAlert();
        })
        .catch(error => {
            console.error('Error saving result:', error);
            showAlert('Error saving result');
            hideAlert();
        });
    });
});
