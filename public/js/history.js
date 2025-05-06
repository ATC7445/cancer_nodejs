document.addEventListener("DOMContentLoaded", () => {
  const BASE_URL = window.location.origin; // ✅ กำหนด BASE_URL อัตโนมัติ
  //const BASE_URL = window.location.origin + "/cancer_nodejs"
  const historyTable = document.getElementById("historyTable");
  const noDataMessage = document.getElementById("noDataMessage");
  const searchInput = document.getElementById("searchInput");

  // ดึงข้อมูลจาก API
  fetch(`${BASE_URL}/history-data`) //
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) {
        noDataMessage.style.display = "block"; // แสดงข้อความหากไม่มีข้อมูล
        return;
      }
      if (!Array.isArray(data)) {
        throw new Error("API response is not an array");
      }
      data.forEach((entry, index) => {
        const row = document.createElement("tr");

        // คอลัมน์ลำดับ
        row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.file_name}</td>
                    <td>${new Date(entry.uploaded_at).toLocaleString()}</td>
                    <td>
                        <img src="${
                          entry.file_path_original
                        }" alt="Original Image" class="img-thumbnail clickable-img" style="max-width: 100px; cursor: pointer;">
                    </td>
                    <td>
                        <img src="${
                          entry.file_path
                        }" alt="Predicted Image" class="img-thumbnail clickable-img" style="max-width: 100px; cursor: pointer;">
                    </td>
                    <td class="text-center">
                        <a href="${entry.file_path_original}" download="${
          entry.file_path_original
        }" class="btn btn-info btn-sm me-2">
                            <i class="bi bi-download"></i>Original
                        </a>
                        <a href="${entry.file_path}" download="${
          entry.file_name
        }" class="btn btn-success btn-sm me-2">
                            <i class="bi bi-download"></i>Predicted
                        </a>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${
                          entry.id
                        }">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                        
                    </td>
                `;

        historyTable.appendChild(row);
      });

      // เพิ่ม Event Listener ให้รูปทั้งหมด
      document.querySelectorAll(".clickable-img").forEach((img) => {
        img.addEventListener("click", function () {
          document.getElementById("modalImage").src = this.src;
          new bootstrap.Modal(document.getElementById("imageModal")).show();
        });
      });

      // เพิ่ม Event Listener ให้ปุ่มลบ
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", function () {
          const recordId = this.getAttribute("data-id");
          deleteRecord(recordId, this);
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching history data:", error);
      noDataMessage.textContent = "⚠️ Error loading history data.";
      noDataMessage.style.display = "block";
    });

  // ค้นหาข้อมูลในตาราง
  searchInput.addEventListener("keyup", function () {
    let filter = this.value.toLowerCase();
    let rows = document.querySelectorAll("#historyTable tr");

    rows.forEach((row) => {
      let text = row.textContent.toLowerCase();
      row.style.display = text.includes(filter) ? "" : "none";
    });
  });
});

// ฟังก์ชันลบข้อมูลแบบ Popup สวยงาม
function deleteRecord(recordId, button) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`${window.location.origin}/cancer_nodejs/delete/${recordId}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          Swal.fire("Deleted!", data.message, "success");
          button.closest("tr").remove(); // ลบแถวออกจากตาราง
        })
        .catch((error) => {
          console.error("Error deleting record:", error);
          Swal.fire("Error", "Failed to delete record", "error");
        });
    }
  });
}
