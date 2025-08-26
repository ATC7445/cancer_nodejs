const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const session = require("express-session");

const app = express();
const PORT = 3001;

require("dotenv").config();

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
  // req.originalUrl = req.originalUrl.replace(/^\/cancer_nodejs/, "");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// Upload
app.post("/upload", (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).send({ message: "No file uploaded" });
  }

  const image = req.files.image;
  const uploadPath = path.join(__dirname, "static", "uploads", image.name);

  // ลบไฟล์เก่าออกก่อน
  ["uploads", "outputs"].forEach((dir) => {
    const dirPath = path.join(__dirname, "static", dir);
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        fs.unlinkSync(path.join(dirPath, file));
      });
    }
  });

  image.mv(uploadPath, (err) => {
    if (err) return res.status(500).send({ message: "Error uploading file" });

    res.json({
      message: "File uploaded successfully",
      path: `/uploads/${image.name}`,
    });
  });
});

// Predict
app.post("/predict", (req, res) => {
  const imageFile = req.files?.image;
  if (!imageFile) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const originalFileName = path.basename(imageFile.name);
  const uploadPath = path.join(__dirname, "static", "uploads", originalFileName);
  const outputDir = path.join(__dirname, "static", "outputs");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  imageFile.mv(uploadPath, (err) => {
    if (err) return res.status(500).json({ error: "Failed to upload image" });

    const command = `python yolov8_predict.py --weights exp33.pt --source "${uploadPath}" --output "${outputDir}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Prediction error:", stderr);
        return res.status(500).json({ message: "Prediction failed" });
      }

      const outputFiles = fs.readdirSync(outputDir)
        .filter(f => f.endsWith(".jpg") || f.endsWith(".png"));

      if (outputFiles.length === 0) {
        return res.status(500).json({ message: "No predicted image found" });
      }

      // เอาไฟล์ล่าสุด
      const predictedImagePath = outputFiles.sort((a, b) =>
        fs.statSync(path.join(outputDir, b)).mtime -
        fs.statSync(path.join(outputDir, a)).mtime
      )[0];

      const predictedImageUrl = `/outputs/${predictedImagePath}`;
      res.json({ message: "Prediction completed", path: predictedImageUrl });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
