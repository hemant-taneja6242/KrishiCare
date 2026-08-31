import time
import os
from PIL import Image
import ml_inference
import json

def run_evaluation():
    test_dir = "test_samples"
    if not os.path.exists(test_dir):
        print(f"Test directory {test_dir} not found.")
        return

    # Warm up models so loading time isn't counted in the first prediction
    print("Warming up models...")
    start_warmup = time.time()
    ml_inference.warm_up()
    print(f"Warmup complete in {time.time() - start_warmup:.2f}s")

    results = []
    total_time = 0

    for filename in os.listdir(test_dir):
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
            
        filepath = os.path.join(test_dir, filename)
        with open(filepath, "rb") as f:
            image_bytes = f.read()
            
        print(f"\n--- Evaluating: {filename} ---")
        start_time = time.time()
        
        try:
            # We don't provide a crop hint to see how well it auto-detects
            prediction = ml_inference.predict(image_bytes)
            latency = time.time() - start_time
            total_time += latency
            
            print(f"Latency: {latency*1000:.1f}ms")
            print(f"Result: {json.dumps(prediction, indent=2)}")
            
            results.append({
                "file": filename,
                "latency_ms": latency * 1000,
                "prediction": prediction
            })
        except Exception as e:
            print(f"Error evaluating {filename}: {e}")
            
    if results:
        avg_latency = total_time / len(results) * 1000
        print(f"\nEvaluation Complete. Average Latency: {avg_latency:.1f}ms")
        
if __name__ == "__main__":
    run_evaluation()
