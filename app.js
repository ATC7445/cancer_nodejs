const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const { exec } = require('child_process');
const app = express();
const PORT = 3001

// MySQL connection setup
const db = mysql.createConnection({
    host: '44zer.h.filess.io',
    user: 'predictedImg_roomgirldo',
    password: '7148e63122ff221276d0d61d74e7724005c2d403',
    database: 'predictedImg_roomgirldo',
    port: 3305
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
app.use("/saved", express.static(path.join(__dirname, "static", "saved")));
app.use((req, res, next)=>{
    req.originalUrl = req.originalUrl.replace(/^\/cancer_nodejs/, '');
    next();
});
// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เพิ่มการลบไฟล์เมื่อมีการเปลี่ยนหน้า
app.get('/history', (req, res) => {
    // จัดการลบไฟล์ในโฟลเดอร์ uploads และ outputs
    function clearUploadsAndOutputs() {
        const directories = ['uploads', 'outputs'];
        directories.forEach(dir => {
            const dirPath = path.join(__dirname, 'static', dir);
            const files = fs.readdirSync(dirPath);
            
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                if (fs.lstatSync(filePath).isFile()) { // เช็คว่าเป็นไฟล์
                    fs.unlinkSync(filePath);
                }
            });
        });
    }    
    clearUploadsAndOutputs();  // ลบไฟล์เมื่อเปลี่ยนหน้าไปที่ history
    res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

// Route สำหรับการอัปโหลดไฟล์
app.post('/upload', (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send({ message: "No file uploaded" });
    }

    const image = req.files.image;
    const uploadPath = path.join(__dirname, 'static', 'uploads', image.name);

    try {
        // ลบไฟล์ใน outputs และ uploads
        ['uploads', 'outputs'].forEach(dir => {
            const files = fs.readdirSync(path.join(__dirname, 'static', dir));
            files.forEach(file => {
                fs.unlinkSync(path.join(__dirname, 'static', dir, file));
            });
        });

        image.mv(uploadPath, (err) => {
            if (err) {
                return res.status(500).send({ message: "Error uploading file", error: err });
            }
            res.json({ message: "File uploaded successfully", path: `/uploads/${image.name}` });
        });
    } catch (error) {
        console.error('Error cleaning folders:', error);
        res.status(500).send('Error cleaning folders');
    }
});

// Clear btn
app.post('/clear-upload', (req, res) => {
    const uploadDir = path.join(__dirname, 'static', 'uploads');
    const outputDir = path.join(__dirname, 'static', 'outputs');
    
    // ลบไฟล์ใน uploads
    const uploadFiles = fs.readdirSync(uploadDir);
    uploadFiles.forEach(file => {
        fs.unlinkSync(path.join(uploadDir, file));
    });

    // ลบไฟล์ใน outputs
    const outputFiles = fs.readdirSync(outputDir);
    outputFiles.forEach(file => {
        fs.unlinkSync(path.join(outputDir, file));
    });

    res.json({ message: "Uploaded and output files cleared." });
});


app.post("/predict", (req, res) => {
    const imageFile = req.files.image;
    if (!imageFile) {
        return res.status(400).json({ error: "No image file provided" });
    }

    const originalFileName = path.basename(imageFile.name);
    const uploadPath = path.join(__dirname, 'static', 'uploads', originalFileName);
    const outputDir = path.join(__dirname, 'static', 'outputs');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    imageFile.mv(uploadPath, (err) => {
        if (err) {
            console.error("Error uploading image:", err);
            return res.status(500).json({ error: "Failed to upload image" });
        }

        const command = `python3 yolov8_predict.py --weights best.pt --source ${uploadPath} --output ${outputDir}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Error during prediction:", error);
                return res.status(500).json({ message: "Prediction failed", error: stderr });
            }

            const outputFiles = fs.readdirSync(outputDir);
            let predictedImagePath = null;

            outputFiles.forEach(file => {
                if (file.startsWith("predicted_") && (file.endsWith(".jpg") || file.endsWith(".png"))) {
                    predictedImagePath = file;
                }
            });

            if (!predictedImagePath) {
                return res.status(500).json({ message: "No predicted image found" });
            }

            // ลบไฟล์ในโฟลเดอร์ outputs หลังจากพยากรณ์เสร็จ
            outputFiles.forEach(file => {
                if (file !== predictedImagePath) {
                    fs.unlinkSync(path.join(outputDir, file)); // ลบไฟล์อื่น ๆ ใน outputs
                }
            });

            const predictedImageUrl = `/outputs/${predictedImagePath}`;
            res.json({
                message: "Prediction completed",
                path: predictedImageUrl.replace(/^\/cancer_nodejs/, '')  // ลบ /cancer_nodejs ออก
            });
        });
    });
});

// Save
app.post('/save', (req, res) => {
    const { file_path, uploaded_at } = req.body;
    const originalFilename = path.basename(file_path);
    
    // ดึง Unix Timestamp (วินาที)
    const unixTimestamp = Math.floor(Date.now() / 1000);
    
    // สร้างชื่อไฟล์ใหม่โดยเพิ่ม Unix Timestamp ต่อท้าย
    const uniqueFilename = `${originalFilename.split('.')[0]}_${unixTimestamp}.${originalFilename.split('.').pop()}`;
    
    const relativePath = path.join('saved', uniqueFilename);
    const outputPath = path.join(__dirname, 'static', 'outputs', originalFilename);

    try {
        // ย้ายไฟล์จาก outputs ไปที่ saved โดยใช้ชื่อใหม่
        const savedPath = path.join(__dirname, 'static', 'saved', uniqueFilename);
        fs.renameSync(outputPath, savedPath);

        // ลบไฟล์ใน uploads
        const uploadFiles = fs.readdirSync(path.join(__dirname, 'static', 'uploads'));
        uploadFiles.forEach(file => {
            fs.unlinkSync(path.join(__dirname, 'static', 'uploads', file));
        });

        const sql = 'INSERT INTO images (file_name, file_path, uploaded_at) VALUES (?, ?, ?)';
        db.query(sql, [uniqueFilename, relativePath, uploaded_at], (err, result) => {
            if (err) {
                console.error('Error saving result:', err);
                return res.status(500).send('Database error');
            }
            res.send({ message: 'Result saved successfully', id: result.insertId });
        });
    } catch (err) {
        console.error('Error saving file:', err);
        res.status(500).send('Error saving file');
    }
});

// Fetch history
app.get('/history-data', (req, res) => {
    const sql = 'SELECT * FROM images ORDER BY uploaded_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching history:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        
        console.log("📌 Results from DB:", results); // ✅ ตรวจสอบว่าผลลัพธ์เป็นอาร์เรย์
        
        if (!Array.isArray(results)) {
            console.error("❌ Expected an array but got:", results);
            return res.status(500).json({ message: 'Invalid data format' });
        }

        res.json(results); // ✅ ส่งข้อมูลกลับเป็น JSON อาร์เรย์
    });
});

// ลบข้อมูลจากฐานข้อมูล
app.delete('/delete/:id', (req, res) => {
    const imageId = req.params.id;

    const getFileQuery = 'SELECT file_path FROM images WHERE id = ?';
    db.query(getFileQuery, [imageId], (err, results) => {
        if (err) {
            console.error('Error fetching file path:', err);
            return res.status(500).send({ message: 'Error fetching file path' });
        }

        if (results.length > 0) {
            const filePath = path.join(__dirname, 'static', results[0].file_path);

            try {
                // ลบไฟล์ใน saved
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                const deleteQuery = 'DELETE FROM images WHERE id = ?';
                db.query(deleteQuery, [imageId], (err, result) => {
                    if (err) {
                        console.error('Error deleting record:', err);
                        return res.status(500).send({ message: 'Error deleting record' });
                    }
                    res.send({ message: 'Record and file deleted successfully' });
                });
            } catch (err) {
                console.error('Error deleting file:', err);
                res.status(500).send('Error deleting file');
            }
        } else {
            res.status(404).send({ message: 'Record not found' });
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

