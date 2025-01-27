document.addEventListener("DOMContentLoaded", () => {
    const historyTable = document.getElementById("historyTable");
    const noDataMessage = document.createElement("p");
    noDataMessage.textContent = "No history data available.";
    noDataMessage.style.display = "none"; // ซ่อนข้อความตอนแรก
    historyTable.parentNode.appendChild(noDataMessage);

    // ดึงข้อมูลจาก endpoint
    fetch('/history-data')
        .then((response) => response.json()) // แปลง response เป็น JSON
        .then((data) => {
            if (data.length === 0) {
                noDataMessage.style.display = "block"; // แสดงข้อความหากไม่มีข้อมูล
                return;
            }

            data.forEach((entry, index) => {
                const row = document.createElement("tr");

                // คอลัมน์ลำดับ
                const indexCell = document.createElement("td");
                indexCell.textContent = index + 1;
                row.appendChild(indexCell);

                // คอลัมน์ชื่อไฟล์
                const imageCell = document.createElement("td");
                imageCell.textContent = entry.file_name; // แสดงชื่อไฟล์
                row.appendChild(imageCell);

                // คอลัมน์ Timestamp
                const timestampCell = document.createElement("td");
                timestampCell.textContent = new Date(entry.uploaded_at).toLocaleString(); // แปลง timestamp
                row.appendChild(timestampCell);

                // แปลง path ให้เป็นรูปแบบที่เหมาะสมสำหรับแสดงผลใน URL
                const imagePath = entry.file_path.replace(/\\/g, '/'); // แทนที่ backslashes ด้วย forward slashes

                // คอลัมน์แสดงรูปภาพ
                const imageDisplayCell = document.createElement("td");
                const imageElement = document.createElement("img");
                imageElement.src = imagePath; // ตั้งค่า src ด้วย path ที่ถูกต้อง
                imageElement.alt = "Predicted Image";
                imageElement.style.maxWidth = "150px";  // กำหนดขนาดภาพที่แสดง
                imageDisplayCell.appendChild(imageElement);
                row.appendChild(imageDisplayCell);

                // คอลัมน์ Actions: ปุ่มลบและดาวน์โหลด
                const actionCell = document.createElement("td");

                // ใช้ Bootstrap classes เพื่อจัดตำแหน่งปุ่ม
                const buttonContainer = document.createElement("div");
                buttonContainer.classList.add("d-flex", "gap-3"); // ใช้ d-flex และ gap-3 เพื่อให้มีระยะห่างระหว่างปุ่ม

                // ปุ่มดาวน์โหลด
                const downloadBtn = document.createElement("button");
                downloadBtn.textContent = "Download";
                downloadBtn.classList.add("btn", "btn-success", "btn-sm");
                downloadBtn.addEventListener("click", () => {
                    window.location.href = imagePath;  // ให้ดาวน์โหลดไฟล์ภาพ
                });
                buttonContainer.appendChild(downloadBtn); // เพิ่มปุ่มดาวน์โหลดใน container

                // ปุ่มลบ
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.classList.add("btn", "btn-danger", "btn-sm");
                deleteBtn.addEventListener("click", () => {
                    if (confirm("Are you sure you want to delete this record?")) {
                        fetch(`/delete/${entry.id}`, { method: 'DELETE' })  // ใช้ backticks เพื่อให้ ${entry.id} ทำงาน
                            .then(response => response.json())
                            .then(data => {
                                alert(data.message);
                                row.remove(); // ลบแถวที่ถูกเลือก
                            })
                            .catch(error => {
                                console.error('Error deleting record:', error);
                                alert('Error deleting record');
                            });
                    }
                });
                buttonContainer.appendChild(deleteBtn); // เพิ่มปุ่มลบใน container

                // เพิ่มปุ่มทั้งหมดในแถว
                actionCell.appendChild(buttonContainer);

                // เพิ่มแถวลงในตาราง
                row.appendChild(actionCell);
                historyTable.appendChild(row);
            });
        })
        .catch((err) => {
            console.error("Error fetching history data:", err); // แสดง error หากเกิดปัญหา
            noDataMessage.textContent = "Error loading history data.";
            noDataMessage.style.display = "block";
        });
});
