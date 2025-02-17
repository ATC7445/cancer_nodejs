document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = window.location.origin + "/cancer_nodejs"; // ✅ กำหนด BASE_URL อัตโนมัติ

    const fileInput = document.getElementById("fileInput");
    const originalImage = document.getElementById("originalImage");
    const predictedImage = document.getElementById("predictedImage");
    const fileNameDisplay = document.getElementById("fileName");
    const predictBtn = document.getElementById("predictBtn");
    const alertModal = document.getElementById("alertModal");
    const modalMessage = document.getElementById("modalMessage");
    const loadingOverlay = document.getElementById("loadingOverlay");

    function showAlert(message) {
        modalMessage.textContent = message;
        new bootstrap.Modal(alertModal).show();
    }

    function hideAlert() {
        new bootstrap.Modal(alertModal).hide();
    }

    function showLoading() {
        loadingOverlay.classList.remove("d-none");
    }

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

        showLoading();

        fetch(`${BASE_URL}/predict`, { method: 'POST', body: formData }) // ✅ ใช้ BASE_URL
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.path) {
                    predictedImage.src = `${BASE_URL}${data.path}`; // ✅ ใช้ BASE_URL + path
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

    document.getElementById('clearBtn').addEventListener('click', () => {
        fileInput.value = "";
        fileNameDisplay.textContent = "No file selected.";
        originalImage.src = "";
        predictedImage.src = "";

        showAlert("Clearing files...");

        fetch(`${BASE_URL}/clear-upload`, { method: 'POST' }) // ✅ ใช้ BASE_URL
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

    document.getElementById('saveBtn').addEventListener('click', () => {
        const file_path = predictedImage.src;
        if (!file_path) {
            showAlert('No predicted image available to save.');
            return;
        }

        function formatDateForMySQL(date) {
            const d = new Date(date);
            return d.toISOString().slice(0, 19).replace("T", " ");
        }

        const uploaded_at = formatDateForMySQL(new Date());

        showAlert("Saving result...");

        fetch(`${BASE_URL}/save`, { // ✅ ใช้ BASE_URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path, uploaded_at })
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
