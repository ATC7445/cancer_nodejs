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

  function showAlert(message, type = "info") {
    const icons = {
      success: "✅",
      warning: "⚠️",
      error: "❌",
      info: "ℹ️",
      saving: "💾",
      clearing: "🧹",
    };

    const icon = icons[type] || "ℹ️";
    modalMessage.innerHTML = `<span style="font-size: 1.5rem;">${icon}</span> <span class="ms-2">${message}</span>`;
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

      // ✅ ล้างทุกอย่างเมื่อเลือกไฟล์ใหม่
      originalImage.src = "";
      predictedImage.src = "";
      fileNameDisplay.textContent = `Selected: ${file.name}`;

      const predictionGrid = document.getElementById("predictionGrid");
      if (predictionGrid) predictionGrid.innerHTML = "";

      // ✅ ลบไฟล์เดิมบน server ด้วย
      fetch("/clear-upload", { method: "POST" })
        .then((response) => response.json())
        .then((data) => {
          console.log(
            "Cleared old files before uploading new one:",
            data.message
          );
        })
        .catch((error) => {
          console.error("Error clearing files on file change:", error);
        });

      const reader = new FileReader();
      reader.onload = (e) => {
        originalImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      fileNameDisplay.textContent = "No file selected.";
      originalImage.src = "";
      predictedImage.src = "";
      const predictionGrid = document.getElementById("predictionGrid");
      if (predictionGrid) predictionGrid.innerHTML = "";
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
          generateConfidenceImages(data.path); // render 3x3 grid

          // 👉 ใช้ภาพ predicted_conf10.jpg เป็นภาพหลักด้านขวา
          const confidence = 60;
          const imagePath = `/outputs/predicted_conf${confidence}.jpg?t=${Date.now()}`;
          predictedImage.src = imagePath;

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
    fileInput.value = ""; // reset file input
    fileNameDisplay.textContent = "No file selected.";

    // เคลียร์รูป
    originalImage.src = "";
    predictedImage.src = "";

    const predictionGrid = document.getElementById("predictionGrid");
    if (predictionGrid) predictionGrid.innerHTML = "";

    showAlert("Clearing files...", "clearing");

    fetch("/clear-upload", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        showAlert(data.message, "success");
        hideAlert();
      })
      .catch((error) => {
        hideAlert();
        console.error("Error:", error);
        showAlert("Error while clearing", "error");
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
  function generateConfidenceImages(baseImagePath) {
    const predictionGrid = document.getElementById("predictionGrid");
    predictionGrid.innerHTML = "";

    const timestamp = Date.now(); // ✅ เพิ่ม timestamp เดียวกันทุกภาพ

    for (let i = 9; i >= 4; i--) {
      const confidence = i * 10;
      const imgSrc = `https://yolo-api-tde1.onrender.com/outputs/predicted_conf${confidence}.jpg?t=${timestamp}`; // ✅ ป้องกัน cache

      const col = document.createElement("div");
      col.className = "col-md-4 mb-4";
      col.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-header text-center fw-bold">Confidence: ${confidence}-100%</div>
          <img src="${imgSrc}" class="card-img-top rounded" style="cursor:pointer;" data-bs-toggle="modal" data-bs-target="#imageModal" data-img="${imgSrc}">
          <div class="card-body d-flex justify-content-between">
            <button class="btn btn-sm btn-info download-btn">Download</button>
            <button class="btn btn-sm btn-secondary save-btn">Save</button>
          </div>
        </div>
      `;
      predictionGrid.appendChild(col);
    }
    const cards = document.querySelectorAll(".card");
    cards.forEach((card) => {
      const text = card.textContent;
      if (
        text.includes("10-100") ||
        text.includes("20-100") ||
        text.includes("30-100")
      ) {
        card.style.display = "none";
      }
    });

    // Modal
    document.querySelectorAll('img[data-bs-toggle="modal"]').forEach((img) => {
      img.addEventListener("click", () => {
        document.getElementById("modalImage").src = img.dataset.img;
      });
    });

    // Download
    document.querySelectorAll(".download-btn").forEach((btn, index) => {
      const confidence = (9 - index) * 10;
      btn.addEventListener("click", () => {
        const imgURL = `/outputs/predicted_conf${confidence}.jpg?t=${timestamp}`; // ✅ ใส่ timestamp
        const link = document.createElement("a");
        link.href = imgURL;
        link.download = `prediction_${confidence}.jpg`;
        link.click();
      });
    });

    // Save
    document.querySelectorAll(".save-btn").forEach((btn, index) => {
      const confidence = (9 - index) * 10;
      btn.addEventListener("click", () => {
        const filename = `predicted_conf${confidence}.jpg`;
        const file_path = `/outputs/${filename}`;
        const uploaded_at = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        fetch("/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: filename, uploaded_at }),
        })
          .then((res) => res.json())
          .then((data) => alert(data.message || "Saved!"))
          .catch((err) => alert("Error saving"));
      });
    });
  }
});
