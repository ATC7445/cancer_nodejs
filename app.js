const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2");
const { exec } = require("child_process");
const session = require("express-session");
const app = express();
const PORT = 3001;
require("dotenv").config();
// MySQL connection setup
const db = mysql.createPool({
  connectionLimit: 10, // จำกัดจำนวน connection ที่เปิดพร้อมกัน
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// เชื่อมต่อทดสอบ
db.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL connection error:", err);
    return;
  }
  console.log("✅ Connected to MySQL database");
  connection.release(); // ปล่อย connection กลับไปใน pool
});

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "static")));
app.use("/uploads", express.static(path.join(__dirname, "static", "uploads")));
app.use("/outputs", express.static(path.join(__dirname, "static", "outputs")));
app.use("/saved", express.static(path.join(__dirname, "static", "saved")));
app.use((req, res, next) => {
  req.originalUrl = req.originalUrl.replace(/^\/cancer_nodejs/, "");
  next();
});
app.use(
  session({
    secret: "my_2255_112defkeofjri44545rg",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Routes
app.get("/", (req, res) => {
  // ป้องกัน caching
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

  if (req.session.loggedin) {
    return res.redirect("/home");
  }

  // ส่งพารามิเตอร์ logout ไปยังหน้า login
  const logoutSuccess = req.query.logout === "true";
  res.sendFile(path.join(__dirname, "public", "login.html"), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
});

app.get("/home", (req, res) => {
  if (!req.session.loggedin) {
    // ถ้ายังไม่ได้ล็อกอิน ให้ redirect ไปหน้า Login
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.post("/auth", function (request, response) {
  let username = request.body.username;
  let password = request.body.password;

  if (username && password) {
    db.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection:", err);
        return response
          .status(500)
          .redirect(
            "/?error=" + encodeURIComponent("Database connection error")
          );
      }

      connection.query(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        function (error, results, fields) {
          connection.release();

          if (error) {
            console.error("Query error:", error);
            return response.redirect(
              "/?error=" + encodeURIComponent("Database error occurred")
            );
          }

          if (results.length > 0) {
            request.session.loggedin = true;
            request.session.username = username;
            response.redirect("/home");
          } else {
            response.redirect(
              "/?error=" + encodeURIComponent("Incorrect Username or Password")
            );
          }
        }
      );
    });
  } else {
    response.redirect(
      "/?error=" + encodeURIComponent("Please enter both Username and Password")
    );
  }
});

// ตรวจสอบสถานะการล็อกอิน
app.get("/check-auth", (req, res) => {
  res.json({
    loggedin: req.session.loggedin || false,
    username: req.session.username || "",
  });
});

// ออกจากระบบ
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).send("Logout failed");
    }

    // ลบ cookies และ redirect ไปหน้า login พร้อมป้องกัน caching
    res.clearCookie("connect.sid");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.redirect("/?logout=true"); // เพิ่มพารามิเตอร์ logout เพื่อแสดงข้อความ
  });
});

// เพิ่มการลบไฟล์เมื่อมีการเปลี่ยนหน้า
app.get("/history", (req, res) => {
  // จัดการลบไฟล์ในโฟลเดอร์ uploads และ outputs
  function clearUploadsAndOutputs() {
    const directories = ["uploads", "outputs"];
    directories.forEach((dir) => {
      const dirPath = path.join(__dirname, "static", dir);
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        if (fs.lstatSync(filePath).isFile()) {
          // เช็คว่าเป็นไฟล์
          fs.unlinkSync(filePath);
        }
      });
    });
  }
  clearUploadsAndOutputs(); // ลบไฟล์เมื่อเปลี่ยนหน้าไปที่ history
  res.sendFile(path.join(__dirname, "public", "history.html"));
});

// Route สำหรับการอัปโหลดไฟล์
app.post("/upload", (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).send({ message: "No file uploaded" });
  }

  const image = req.files.image;
  const uploadPath = path.join(__dirname, "static", "uploads", image.name);

  try {
    // ลบไฟล์ใน outputs และ uploads
    ["uploads", "outputs"].forEach((dir) => {
      const files = fs.readdirSync(path.join(__dirname, "static", dir));
      files.forEach((file) => {
        fs.unlinkSync(path.join(__dirname, "static", dir, file));
      });
    });

    image.mv(uploadPath, (err) => {
      if (err) {
        return res
          .status(500)
          .send({ message: "Error uploading file", error: err });
      }
      res.json({
        message: "File uploaded successfully",
        path: `/uploads/${image.name}`,
      });
    });
  } catch (error) {
    console.error("Error cleaning folders:", error);
    res.status(500).send("Error cleaning folders");
  }
});

// Clear btn
app.post("/clear-upload", (req, res) => {
  const uploadDir = path.join(__dirname, "static", "uploads");
  const outputDir = path.join(__dirname, "static", "outputs");

  // ลบไฟล์ใน uploads
  const uploadFiles = fs.readdirSync(uploadDir);
  uploadFiles.forEach((file) => {
    fs.unlinkSync(path.join(uploadDir, file));
  });

  // ลบไฟล์ใน outputs
  const outputFiles = fs.readdirSync(outputDir);
  outputFiles.forEach((file) => {
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
  const uploadPath = path.join(
    __dirname,
    "static",
    "uploads",
    originalFileName
  );
  const outputDir = path.join(__dirname, "static", "outputs");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  imageFile.mv(uploadPath, (err) => {
    if (err) {
      console.error("Error uploading image:", err);
      return res.status(500).json({ error: "Failed to upload image" });
    }

    const command = `python yolov8_predict.py --weights exp33.pt --source ${uploadPath} --output ${outputDir}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error during prediction:", error);
        return res
          .status(500)
          .json({ message: "Prediction failed", error: stderr });
      }

      const outputFiles = fs.readdirSync(outputDir);
      let predictedImagePath = null;

      outputFiles.forEach((file) => {
        if (
          file.startsWith("predicted_") &&
          (file.endsWith(".jpg") || file.endsWith(".png"))
        ) {
          predictedImagePath = file;
        }
      });

      if (!predictedImagePath) {
        return res.status(500).json({ message: "No predicted image found" });
      }

      // ลบไฟล์ในโฟลเดอร์ outputs หลังจากพยากรณ์เสร็จ
      outputFiles.forEach((file) => {
        if (file !== predictedImagePath) {
          fs.unlinkSync(path.join(outputDir, file)); // ลบไฟล์อื่น ๆ ใน outputs
        }
      });

      const predictedImageUrl = `/outputs/${predictedImagePath}`;
      res.json({
        message: "Prediction completed",
        path: predictedImageUrl.replace(/^\/cancer_nodejs/, ""), // ลบ /cancer_nodejs ออก
      });
    });
  });
});

// Save
app.post("/save", (req, res) => {
  const { file_path, uploaded_at, file_path_original } = req.body;

  console.log("Received data:", req.body); // Debug log

  if (!file_path_original) {
    return res.status(400).send("Original file path is required");
  }

  const originalFilename = path.basename(file_path);
  const originalOriginalFilename = path.basename(file_path_original);
  const unixTimestamp = Math.floor(Date.now() / 1000);

  // สร้างชื่อไฟล์ที่ไม่ซ้ำ
  const uniqueFilename = `${
    originalFilename.split(".")[0]
  }_${unixTimestamp}.${originalFilename.split(".").pop()}`;
  const uniqueOriginalFilename = `${
    originalOriginalFilename.split(".")[0]
  }_${unixTimestamp}.${originalOriginalFilename.split(".").pop()}`;

  const relativePath = path.join("saved", uniqueFilename);
  const relativeOriginalPath = path.join("saved", uniqueOriginalFilename);

  // ย้ายไฟล์และบันทึกลงฐานข้อมูล
  try {
    // ย้ายไฟล์ predicted
    const outputPath = path.join(
      __dirname,
      "static",
      "outputs",
      originalFilename
    );
    const savedPath = path.join(__dirname, "static", "saved", uniqueFilename);
    fs.renameSync(outputPath, savedPath);

    // ย้ายไฟล์ original
    const uploadPath = path.join(
      __dirname,
      "static",
      "uploads",
      originalOriginalFilename
    );
    const savedOriginalPath = path.join(
      __dirname,
      "static",
      "saved",
      uniqueOriginalFilename
    );
    fs.renameSync(uploadPath, savedOriginalPath);

    // บันทึกลงฐานข้อมูล
    const sql = `INSERT INTO images 
                (file_name, file_path, uploaded_at, file_path_original) 
                VALUES (?, ?, ?, ?)`;

    db.query(
      sql,
      [uniqueFilename, relativePath, uploaded_at, relativeOriginalPath],
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).send("Database error");
        }
        res.send({
          message: "Result saved successfully",
          id: result.insertId,
        });
      }
    );
  } catch (err) {
    console.error("File system error:", err);
    res.status(500).send("Error saving files");
  }
});

// Fetch history
app.get("/history-data", (req, res) => {
  const sql = "SELECT * FROM images ORDER BY uploaded_at DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching history:", err);
      return res.status(500).json({ message: "Database error" });
    }
    console.log("Database results:", results); // ✅ เช็คผลลัพธ์จาก DB
    res.json(results);
  });
});

// ลบข้อมูลจากฐานข้อมูล
app.delete("/delete/:id", (req, res) => {
  const imageId = req.params.id;

  const getFileQuery = "SELECT file_path FROM images WHERE id = ?";
  db.query(getFileQuery, [imageId], (err, results) => {
    if (err) {
      console.error("Error fetching file path:", err);
      return res.status(500).send({ message: "Error fetching file path" });
    }

    if (results.length > 0) {
      const filePath = path.join(__dirname, "static", results[0].file_path);

      try {
        // ลบไฟล์ใน saved
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        const deleteQuery = "DELETE FROM images WHERE id = ?";
        db.query(deleteQuery, [imageId], (err, result) => {
          if (err) {
            console.error("Error deleting record:", err);
            return res.status(500).send({ message: "Error deleting record" });
          }
          res.send({ message: "Record and file deleted successfully" });
        });
      } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).send("Error deleting file");
      }
    } else {
      res.status(404).send({ message: "Record not found" });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
