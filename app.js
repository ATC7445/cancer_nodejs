const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const { exec } = require('child_process');
const app = express();
const PORT = 3000;

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cancer_detection'
});

db.connect(err => {
    if (err) {
        console.error('MySQL connection error:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'static', 'uploads')));
app.use("/outputs", express.static(path.join(__dirname, "static", "outputs")));


// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

// Upload image
app.post('/upload', (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send({ message: "No file uploaded" });
    }

    const image = req.files.image;
    const uploadPath = path.join(__dirname, 'static', 'uploads', image.name);
    // ลบไฟล์เก่าก่อนอัปโหลดใหม่
    try {
        const files = fs.readdirSync(path.join(__dirname, 'static', 'uploads'));
        files.forEach(file => {
            fs.unlinkSync(path.join(__dirname, 'static', 'uploads', file));
        });
    } catch (error) {
        console.error('Error cleaning upload folder:', error);
    }
    
    image.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).send({ message: "Error uploading file", error: err });
        }
        res.json({ message: "File uploaded successfully", path: `/uploads/${image.name}` });
    });
});


// Predict
app.post("/predict", (req, res) => {
    const imageFile = req.files.image;
    if (!imageFile) {
        return res.status(400).json({ error: "No image file provided" });
    }

    const fileName = path.basename(imageFile.name);
    const uploadPath = path.join(__dirname, 'static', 'uploads', fileName);
    const outputFilePath = path.join(__dirname, 'static', 'outputs', `predicted_${fileName}`);

    // YOLO command
    const command = `python yolov8_predict.py --weights best.pt --source ${uploadPath} --output ./static/outputs`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("Error during prediction:", error);
            return res.status(500).json({ message: "Prediction failed", error: stderr });
        }
    
        // ตรวจสอบโฟลเดอร์ใน outputs ว่าเป็นโฟลเดอร์ไหนที่ถูกสร้างล่าสุด
        const outputDir = path.join(__dirname, 'static', 'outputs');
        const folders = fs.readdirSync(outputDir).filter(folder => folder.startsWith('predictions'));
        
        // หาฟolders ที่มีหมายเลขสูงสุด (ล่าสุด)
        const latestFolder = folders.sort().reverse()[0];  // sort in descending order
        const predictedFilePath = path.join(outputDir, latestFolder, `${fileName}`);  // ปรับให้ตรงกับไฟล์ที่ YOLOv8 ผลลัพธ์
    
        console.log("Predicted File Path:", predictedFilePath);
    
        // ส่ง path ของภาพที่ทำการ predict กลับไปยัง frontend
        res.json({ 
            message: "Prediction completed", 
            path: `/outputs/${latestFolder}/${fileName}`
        });
    });
});


// Save result
app.post('/save', (req, res) => {
    const { file_path, uploaded_at } = req.body;  // รับค่าจาก body

    // กำหนดชื่อไฟล์ใหม่เพื่อไม่ให้ซ้ำกัน (สามารถใช้ UUID หรือ timestamp ได้)
    const filename = path.basename(file_path);

    // ใช้ path  // บันทึกเป็น path ที่ใช้งานใน web server
    const relativePath = path.join('outputs', 'predictions', filename);  // ใช้ path ที่ถูกต้อง

    // บันทึกข้อมูลในฐานข้อมูล (ไม่ใช้ user_id)
    const sql = 'INSERT INTO images (file_name, file_path, uploaded_at) VALUES (?, ?, ?)';
    db.query(sql, [filename, relativePath, uploaded_at], (err, result) => {
        if (err) {
            console.error('Error saving result:', err);
            return res.status(500).send('Database error');
        }
        res.send({ message: 'Result saved successfully', id: result.insertId });
    });
});

// Fetch history
app.get('/history-data', (req, res) => {
    const sql = 'SELECT * FROM images ORDER BY uploaded_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching history:', err);
            return res.status(500).send({ message: 'Database error' });
        }
        res.json(results); // ส่งข้อมูลกลับในรูปแบบ JSON
    });
});

// ลบข้อมูลจากฐานข้อมูล
app.delete('/delete/:id', (req, res) => {
    const imageId = req.params.id;

    const sql = 'DELETE FROM images WHERE id = ?';
    db.query(sql, [imageId], (err, result) => {
        if (err) {
            console.error('Error deleting record:', err);
            return res.status(500).send({ message: 'Error deleting record' });
        }
        res.send({ message: 'Record deleted successfully' });
    });
});

// Clear images
app.post('/clear', (req, res) => {
    const uploadsDir = path.join(__dirname, 'static', 'uploads');
    const outputsDir = path.join(__dirname, 'static', 'outputs');

    // ลบไฟล์ในโฟลเดอร์ uploads และ outputs
    try {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        fs.rmSync(outputsDir, { recursive: true, force: true });

        // สร้างโฟลเดอร์ใหม่
        fs.mkdirSync(uploadsDir);
        fs.mkdirSync(outputsDir);

        res.send({ message: 'Images cleared successfully' });
    } catch (error) {
        console.error('Error clearing images:', error);
        res.status(500).send({ message: 'Error clearing images', error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

