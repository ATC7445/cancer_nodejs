document.addEventListener("DOMContentLoaded", () => {
  // const BASE_URL = window.location.origin; // ✅ กำหนด BASE_URL อัตโนมัติ ถ้าใช้ server ม. window.location.origin + "/cancer_nodejs";

  const fileInput = document.getElementById("fileInput");
  const originalImage = document.getElementById("originalImage");
  const predictedImage = document.getElementById("predictedImage");
  const fileNameDisplay = document.getElementById("fileName");
  const predictBtn = document.getElementById("predictBtn");
  const alertModal = document.getElementById("alertModal");
  const modalMessage = document.getElementById("modalMessage");
  const loadingOverlay = document.getElementById("loadingOverlay");
  // ตัวแปรสำหรับเก็บข้อมูล predictions
  let currentPredictions = [];
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
    formData.append("image", file);

    showLoading();

    fetch("/predict", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => Promise.reject(err));
        }
        return response.json();
      })
      .then((data) => {
        hideLoading();
        if (data.path) {
          // ตรวจสอบและแก้ไข path ถ้าจำเป็น
          let imagePath = data.path;
          if (!imagePath.startsWith("http")) {
            imagePath = window.location.origin + imagePath;
          }
          predictedImage.src = imagePath;

          // ตรวจสอบว่าภาพโหลดได้จริง
          predictedImage.onload = () => {
            console.log("Image loaded successfully");
          };
        } else {
          console.error("No path in response:", data);
          alert(
            "Prediction completed, but no image path received. Details in console."
          );
        }
      })
      .catch((error) => {
        hideLoading();
        console.error("Error during prediction:", error);
        alert(`Prediction error: ${error.message || "Unknown error"}`);
      });
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    fileInput.value = "";
    fileNameDisplay.textContent = "No file selected.";
    originalImage.src = "";
    predictedImage.src = "";

    showAlert("Clearing files...");

    fetch("/clear-upload", { method: "POST" }) // ✅ ใช้ BASE_URL
      .then((response) => response.json())
      .then((data) => {
        showAlert(data.message);
        hideAlert();
      })
      .catch((error) => {
        hideAlert();
        console.error("Error:", error);
      });
  });
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const filePath = predictedImage.src;
    console.log("Download filePath:", filePath);
    if (!filePath || filePath.includes("placeholder")) {
      showAlert("No predicted image available to download.");
      return;
    }

    const fileName = filePath.split("/").pop();
    console.log("Download fileName:", fileName);

    fetch(filePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch the image for download");
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); // ล้าง URL หลังใช้งาน
      })
      .catch((error) => {
        console.error("Download error:", error);
        showAlert(`Failed to download image: ${error.message}`);
      });
  });
  document.getElementById("saveBtn").addEventListener("click", () => {
    const file_path = predictedImage.src;
    if (!file_path) {
      showAlert("No predicted image available to save.");
      return;
    }

    function formatDateForMySQL(date) {
      const d = new Date(date);
      return d.toISOString().slice(0, 19).replace("T", " ");
    }

    const uploaded_at = formatDateForMySQL(new Date());

    showAlert("Saving result...");

    fetch("/save", {
      // ✅ ใช้ BASE_URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path, uploaded_at }),
    })
      .then((response) => response.json())
      .then((data) => {
        showAlert(data.message);
        hideAlert();
      })
      .catch((error) => {
        console.error("Error saving result:", error);
        showAlert("Error saving result");
        hideAlert();
      });
  });
});
