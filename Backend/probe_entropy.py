import sys
sys.path.insert(0, '.')
import ml_inference, io
from PIL import Image

ml_inference.warm_up()

def test(name, data, crop_hint=None):
    if isinstance(data, str):
        with open(data, 'rb') as f:
            data = f.read()
    r = ml_inference.predict(data, crop_hint=crop_hint)
    ne = r.get('norm_entropy', -1)
    rm = r.get('raw_max_prob', -1)
    print(f"{name}: norm_entropy={ne:.4f}  raw_max={rm:.4f}  conf={r['confidence']:.4f}")

test('early_blight (plant)',   'test_samples/tomato_early_blight.jpg', 'Tomato')
test('bacterial_spot (plant)', 'test_samples/tomato_bacterial_spot.jpg', 'Tomato')
test('healthy (plant)',        'test_samples/tomato_healthy.jpg', 'Tomato')
test('septoria (plant)',       'test_samples/tomato_septoria.jpg', 'Tomato')

def solid(color):
    buf = io.BytesIO()
    Image.new('RGB', (224, 224), color).save(buf, 'JPEG')
    buf.seek(0)
    return buf.read()

test('grey_square (non-plant)',  solid((200,200,200)), 'Tomato')
test('white_square (non-plant)', solid((255,255,255)), 'Tomato')
test('noise_image (non-plant)',  solid((50,100,200)), 'Tomato')
