import base64
import io
import os
import torch
import torch.nn as nn
from flask import Flask, render_template, request, jsonify
from torchvision import models, transforms
from PIL import Image

app = Flask(__name__)


def get_device():
    return torch.device("cuda:0" if torch.cuda.is_available() else "cpu")


def load_model():
    device = get_device()
    model = models.mobilenet_v2(weights=None)

    model.classifier[1] = nn.Sequential(
        nn.Dropout(0.2),
        nn.Linear(model.last_channel, 128),
        nn.ReLU(),
        nn.Linear(128, 3)
    )

    try:
        model.load_state_dict(torch.load('veggie_mobilenet.pth', map_location=device))
    except:
        return None, None

    model.eval()
    model.to(device)
    return model, device


model, device = load_model()

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

PRICES = {
    "banana": 7.50,
    "orange": 6.20,
    "red_apple": 4.90
}


def get_classes():
    try:
        with open('classes.txt', 'r') as f:
            return [line.strip() for line in f.readlines()]
    except:
        return ["banana", "orange", "red_apple"]


class_names = get_classes()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model file not found.'})

    try:
        data = request.get_json()
        image_data = data['image']

        header, encoded = image_data.split(",", 1)
        binary_data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(binary_data)).convert('RGB')

        input_tensor = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            output = model(input_tensor)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            confidence, predicted_class = torch.max(probabilities, 0)

        idx = predicted_class.item()
        label = class_names[idx]
        conf_score = confidence.item()
        price = PRICES.get(label, 0.0)

        return jsonify({
            'label': label,
            'price': price,
            'confidence': conf_score
        })
    except Exception as e:
        return jsonify({'error': str(e)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)