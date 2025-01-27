// public/js/upload.js
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const originalImage = document.getElementById("originalImage");
    const fileNameDisplay = document.getElementById("fileName");
    const predictBtn = document.getElementById("predictBtn");

    if (!fileInput || !predictBtn) {
        console.error("Required elements not found in DOM.");
        return;
    }

    // แสดงชื่อไฟล์ที่เลือก
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            const reader = new FileReader();

            reader.onload = (e) => {
                originalImage.src = e.target.result; // แสดงรูปในช่อง Original Image
            };
            reader.readAsDataURL(file);

            // อัปโหลดไฟล์ไปยังเซิร์ฟเวอร์
            uploadFile(file);
        } else {
            fileNameDisplay.textContent = "No file selected.";
            originalImage.src = ""; // เคลียร์รูปในช่อง Original Image
        }
    });

    // ฟังก์ชันสำหรับอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์
    function uploadFile(file) {
        const formData = new FormData();
        formData.append("image", file);

        fetch("/upload", {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === "File uploaded successfully") {
                console.log("File uploaded:", data.path);
                // แสดงภาพที่อัปโหลดสำเร็จ
                originalImage.src = data.path;
            } else {
                console.error("Error uploading file:", data.message);
            }
        })
        .catch((error) => {
            console.error("Error uploading file:", error);
        });
    }
});

//Clear images
document.getElementById('clearBtn').addEventListener('click', function() {
    // ส่งคำขอลบไฟล์ไปที่เซิร์ฟเวอร์
    fetch('/clear', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        console.log('Clear success:', data);
        // ล้างภาพในหน้า
        document.getElementById('originalImage').src = '';
        document.getElementById('predictedImage').src = '';
    })
    .catch(error => {
        console.error('Error clearing images:', error);
    });
});

//Predict
document.getElementById('predictBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput'); // หาตัว input สำหรับไฟล์
    if (fileInput.files.length === 0) {
        alert("Please select a file first.");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file); // เพิ่มไฟล์ภาพลงใน formData
    formData.append('imagePath', file.name); // เพิ่มชื่อไฟล์ลงใน formData

    fetch('/predict', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())  // แปลง response เป็น JSON
    .then(data => {
        console.log('Prediction result:', data);

        if (data.path) {
            const predictedImage = document.getElementById('predictedImage');
            predictedImage.src = data.path; // อัปเดตภาพที่แสดงในช่อง Predicted Image
        } else {
            alert("Prediction completed, but no image path received.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

//Download
document.getElementById('downloadBtn').addEventListener('click', function() {
    const imagePath = document.getElementById('predictedImage').src;
    if (!imagePath) {
        alert('No predicted image available to download.');
        return;
    }

    // สร้างลิงก์ดาวน์โหลด
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = 'predicted_image.jpg'; // สามารถปรับเปลี่ยนชื่อไฟล์ที่ต้องการดาวน์โหลด
    link.click();
});

// Save result
document.getElementById('saveBtn').addEventListener('click', function() {
    const file_path = document.getElementById('predictedImage').src;
    if (!file_path) {
        alert('No predicted image available to save.');
        return;
    }

    // กำหนด user_id (อาจจะดึงจาก session หรือจากตัวแปรอื่นๆ)
    const userId = 123;  // ตัวอย่าง user_id

    // ส่งคำขอไปยังเซิร์ฟเวอร์เพื่อบันทึกผล
    const uploaded_at = new Date().toISOString();  // เวลาปัจจุบัน
    fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_path: file_path, uploaded_at: uploaded_at, user_id: userId })  // เพิ่ม user_id
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
    })
    .catch(error => {
        console.error('Error saving result:', error);
        alert('Error saving result');
    });
});




