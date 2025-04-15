from ultralytics import YOLO
import argparse
import os
import shutil

def predict(weights_path, source_path, output_dir):
    model = YOLO(weights_path)

    # สร้างภาพ prediction 6 รูปด้วย confidence 40%-90%
    for i in range(3, 10):
        conf = i / 10.0
        model.predict(
            source=source_path,
            save=True,
            save_txt=False,
            conf=conf,
            project=output_dir,
            name=f"conf_{int(conf * 100)}"
        )

    # รวมภาพที่ได้เข้า output_dir
    for folder in os.listdir(output_dir):
        folder_path = os.path.join(output_dir, folder)
        if os.path.isdir(folder_path) and folder.startswith("conf_"):
            conf_level = folder.split("_")[1]  # เช่น "10", "20", ...
            for file in os.listdir(folder_path):
                if file.endswith(".jpg") or file.endswith(".png"):
                    ext = file.split(".")[-1]
                    new_filename = f"predicted_conf{conf_level}.{ext}"
                    new_file_path = os.path.join(output_dir, new_filename)
                    shutil.move(os.path.join(folder_path, file), new_file_path)
                    print(f"✅ Moved file to {new_file_path}")
            shutil.rmtree(folder_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLOv8 Prediction Script")
    parser.add_argument("--weights", type=str, required=True)
    parser.add_argument("--source", type=str, required=True)
    parser.add_argument("--output", type=str, default="runs/detect")

    args = parser.parse_args()

    if not os.path.exists(args.weights):
        raise FileNotFoundError(f"Model file not found: {args.weights}")
    if not os.path.exists(args.source):
        raise FileNotFoundError(f"Source file/directory not found: {args.source}")

    predict(weights_path=args.weights, source_path=args.source, output_dir=args.output)
