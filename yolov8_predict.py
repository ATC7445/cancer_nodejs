from ultralytics import YOLO
import argparse
import os

def predict(weights_path, source_path, output_dir):
    # โหลดโมเดล YOLOv8
    model = YOLO(weights_path)
    
    # รันการพยากรณ์
    results = model.predict(source=source_path, save=True, save_txt=True, project=output_dir, name="predictions")
    
    # แสดงผลลัพธ์
    for result in results:
        print(result)

if __name__ == "__main__":
    # รับค่าจาก Command Line
    parser = argparse.ArgumentParser(description="YOLOv8 Prediction Script")
    parser.add_argument("--weights", type=str, required=True, help="Path to the .pt model file")
    parser.add_argument("--source", type=str, required=True, help="Path to the input image or directory of images")
    parser.add_argument("--output", type=str, default="runs/detect", help="Directory to save the output predictions")
    
    args = parser.parse_args()

    # ตรวจสอบว่ามีไฟล์โมเดลและภาพต้นฉบับ
    if not os.path.exists(args.weights):
        raise FileNotFoundError(f"Model file not found: {args.weights}")
    if not os.path.exists(args.source):
        raise FileNotFoundError(f"Source file/directory not found: {args.source}")
    
    # เรียกฟังก์ชันพยากรณ์
    predict(weights_path=args.weights, source_path=args.source, output_dir=args.output)
