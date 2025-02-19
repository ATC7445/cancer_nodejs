document.addEventListener("DOMContentLoaded", () => {
    const historyTable = document.getElementById("historyTable");
    const noDataMessage = document.getElementById("noDataMessage");
    const searchInput = document.getElementById("searchInput");

    // ดึงข้อมูลจาก API
    fetch('/history-data')
    .then(response => response.json())
    .then(data => {
        console.log("API Response:", data); // ✅ ดูว่าค่าที่ได้คืออะไร
        
        if (!Array.isArray(data)) { // ✅ เช็คว่าเป็นอาร์เรย์จริงหรือไม่
            console.error("Expected an array but got:", data);
            noDataMessage.textContent = "⚠️ Error: Invalid data format.";
            noDataMessage.style.display = "block";
            return;
        }

        if (data.length === 0) {
            noDataMessage.style.display = "block"; // แสดงข้อความหากไม่มีข้อมูล
            return;
        }

        data.forEach((entry, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.file_name}</td>
                <td>${new Date(entry.uploaded_at).toLocaleString()}</td>
                <td>
                    <img src="${entry.file_path}" alt="Predicted Image" class="img-thumbnail clickable-img" style="max-width: 100px; cursor: pointer;">
                </td>
                <td class="text-center">
                    <a href="${entry.file_path}" download="${entry.file_name}" class="btn btn-success btn-sm me-2">
                        <i class="bi bi-download"></i> Download
                    </a>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${entry.id}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            historyTable.appendChild(row);
        });
    })
    .catch(error => {
        console.error("Error fetching history data:", error);
        noDataMessage.textContent = "⚠️ Error loading history data.";
        noDataMessage.style.display = "block";
    });


    // ค้นหาข้อมูลในตาราง
    searchInput.addEventListener("keyup", function () {
        let filter = this.value.toLowerCase();
        let rows = document.querySelectorAll("#historyTable tr");

        rows.forEach(row => {
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
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/delete/${recordId}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    Swal.fire("Deleted!", data.message, "success");
                    button.closest("tr").remove(); // ลบแถวออกจากตาราง
                })
                .catch(error => {
                    console.error("Error deleting record:", error);
                    Swal.fire("Error", "Failed to delete record", "error");
                });
        }
    });
}
