from ultralytics import YOLO
import argparse
import os
import shutil

def predict(weights_path, source_path, output_dir):
    # โหลดโมเดล YOLOv8
    model = YOLO(weights_path)

    # รันการพยากรณ์โดยไม่ต้องสร้างโฟลเดอร์ย่อย
    results = model.predict(source=source_path, save=True, save_txt=False, project=output_dir, name="")  # ใช้ชื่อไฟล์เดิม

    # ตรวจสอบและย้ายไฟล์ที่พยากรณ์ไปยังโฟลเดอร์ outputs
    for folder in os.listdir(output_dir):
        folder_path = os.path.join(output_dir, folder)
        
        # ตรวจสอบว่าเป็นโฟลเดอร์หรือไม่
        if os.path.isdir(folder_path):
            # ตรวจหาภาพไฟล์ที่พยากรณ์
            for file in os.listdir(folder_path):
                if file.endswith(".jpg") or file.endswith(".png"):  # ตรวจหาภาพที่พยากรณ์
                    # เพิ่มคำว่า predicted_ นำหน้าไฟล์
                    new_filename = f"predicted_{file}"  # ใช้ชื่อเดิมแต่เพิ่มคำว่า predicted_
                    new_file_path = os.path.join(output_dir, new_filename)

                    # ย้ายไฟล์ไปยังโฟลเดอร์ outputs
                    shutil.move(os.path.join(folder_path, file), new_file_path)
                    print(f"Moved file to {new_file_path}")

            # ลบโฟลเดอร์ย่อยที่ไม่ต้องการ
            shutil.rmtree(folder_path)

if __name__ == "__main__":
    # รับค่าจาก Command Line
    parser = argparse.ArgumentParser(description="YOLOv8 Prediction Script")
    parser.add_argument("--weights", type=str, required=True, help="Path to the .pt model file")
    parser.add_argument("--source", type=str, required=True, help="Path to the input image or directory of images")
    parser.add_argument("--output", type=str, default="runs/detect", help="Directory to save the output predictions")
    
    args = parser.parse_args()

    # ตรวจสอบว่าโมเดลและแหล่งข้อมูลมีอยู่จริง
    if not os.path.exists(args.weights):
        raise FileNotFoundError(f"Model file not found: {args.weights}")
    if not os.path.exists(args.source):
        raise FileNotFoundError(f"Source file/directory not found: {args.source}")
    
    # เรียกฟังก์ชันพยากรณ์
    predict(weights_path=args.weights, source_path=args.source, output_dir=args.output)
