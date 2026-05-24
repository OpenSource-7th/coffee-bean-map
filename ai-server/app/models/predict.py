import os

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

from app.core.config import settings


class OnnxSequenceClassifier:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)

        session_options = ort.SessionOptions()
        session_options.intra_op_num_threads = settings.ONNX_INTRA_OP_NUM_THREADS
        session_options.inter_op_num_threads = settings.ONNX_INTER_OP_NUM_THREADS
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        model_path = os.path.join(model_dir, "model_quantized.onnx")

        if not os.path.exists(model_path):
            model_path = os.path.join(model_dir, "model.onnx")

        self.session = ort.InferenceSession(
            model_path,
            sess_options=session_options,
            providers=["CPUExecutionProvider"],
        )

    def predict_logits(self, text: str):
        inputs = self.tokenizer(
            text,
            return_tensors="np",
            max_length=settings.MAX_TOKEN_LENGTH,
            padding="max_length",
            truncation=True,
        )

        onnx_inputs = {
            "input_ids": inputs["input_ids"].astype(np.int64),
            "attention_mask": inputs["attention_mask"].astype(np.int64),
        }

        if "token_type_ids" in inputs:
            onnx_inputs["token_type_ids"] = inputs["token_type_ids"].astype(np.int64)

        outputs = self.session.run(None, onnx_inputs)
        return outputs[0][0]

    @staticmethod
    def softmax(logits):
        logits = logits - np.max(logits)
        exp = np.exp(logits)
        return exp / np.sum(exp)


class KcbertRelevancePredictor:
    def __init__(self):
        self.model = OnnxSequenceClassifier(settings.KCBERT_ONNX_MODEL_DIR)

    @property
    def tokenizer(self):
        return self.model.tokenizer

    def predict(self, text: str):
        logits = self.model.predict_logits(text)
        probs = self.model.softmax(logits)

        label = int(np.argmax(probs))
        menu_relevance = float(probs[1])

        return label, menu_relevance


class KoelectraSentimentPredictor:
    def __init__(self):
        self.model = OnnxSequenceClassifier(settings.KOELECTRA_ONNX_MODEL_DIR)

    def predict(self, text: str):
        logits = self.model.predict_logits(text)
        probs = self.model.softmax(logits)

        label = int(np.argmax(probs))
        confidence = float(probs[label])
        sentiment = self._map_sentiment(label)

        return sentiment, confidence

    @staticmethod
    def _map_sentiment(label: int):
        if label == 1:
            return "positive"
        return "negative"