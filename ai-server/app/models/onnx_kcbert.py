import os

import torch
from torch import nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import PeftModel
from onnxruntime.quantization import quantize_dynamic, QuantType, shape_inference


class SequenceClassificationOnnxWrapper(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask, token_type_ids):
        outputs = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        )

        if isinstance(outputs, tuple):
            return outputs[0]

        return outputs.logits


def export_and_quantize_native(model_dir, base_output_dir, model_type="fft", base_model_name="beomi/kcbert-base", max_length=300):
    """
    model_dir: 학습된 모델이 있는 원본 경로
    base_output_dir: 최상위 ONNX 저장 경로 (예: kcbert_onnx)
    model_type: "fft" 또는 "lora"
    base_model_name: LoRA 로드 시 뼈대가 될 원본 모델 이름
    """

    output_dir = os.path.join(base_output_dir, f"onnx_kcbert_{model_type}")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"\n========================================================")
    print(f"[{model_type.upper()}] ⏳ 모델 및 토크나이저 로드 중... (경로: {output_dir})")

    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)

    if model_type == "lora":
        base_model = AutoModelForSequenceClassification.from_pretrained(
            base_model_name,
            return_dict=False,
            attn_implementation="eager"
        )
        base_model.config._attn_implementation = "eager"

        peft_model = PeftModel.from_pretrained(base_model, model_dir)
        model = peft_model.merge_and_unload()
        model.config._attn_implementation = "eager"

        print("💡 LoRA 가중치를 Base 모델에 성공적으로 병합(Merge)했습니다.")
    else:
        model = AutoModelForSequenceClassification.from_pretrained(
            model_dir,
            return_dict=False,
            local_files_only=True,
            attn_implementation="eager"
        )
        model.config._attn_implementation = "eager"

    model.eval()

    max_position_embeddings = getattr(model.config, "max_position_embeddings", max_length)

    if max_length > max_position_embeddings:
        raise ValueError(
            f"max_length={max_length}은 모델의 max_position_embeddings={max_position_embeddings}보다 클 수 없습니다."
        )

    dummy_text = "커피가 너무 맛있어요!"
    inputs = tokenizer(
        dummy_text,
        return_tensors="pt",
        max_length=max_length,
        padding="max_length",
        truncation=True
    )

    if "token_type_ids" not in inputs:
        inputs["token_type_ids"] = torch.zeros_like(inputs["input_ids"])

    wrapper_model = SequenceClassificationOnnxWrapper(model)
    wrapper_model.eval()

    onnx_model_path = os.path.join(output_dir, "model.onnx")

    print(f"[{model_type.upper()}] ⚙️ ONNX 파일로 추출 중...")
    with torch.no_grad():
        torch.onnx.export(
            wrapper_model,
            (
                inputs["input_ids"],
                inputs["attention_mask"],
                inputs["token_type_ids"],
            ),
            onnx_model_path,
            export_params=True,
            opset_version=17,
            do_constant_folding=True,
            input_names=["input_ids", "attention_mask", "token_type_ids"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch_size"},
                "attention_mask": {0: "batch_size"},
                "token_type_ids": {0: "batch_size"},
                "logits": {0: "batch_size"},
            },
            dynamo=False,
        )

    print(f"[{model_type.upper()}] ✅ ONNX 추출 성공 -> {onnx_model_path}")

    tokenizer.save_pretrained(output_dir)
    model.config.save_pretrained(output_dir)

    print(f"[{model_type.upper()}] 🧹 ONNX 그래프 전처리 및 형태(Shape) 교정 중...")
    preprocessed_model_path = os.path.join(output_dir, "model_prep.onnx")
    shape_inference.quant_pre_process(
        onnx_model_path,
        preprocessed_model_path
    )

    quantized_model_path = os.path.join(output_dir, "model_quantized.onnx")
    print(f"[{model_type.upper()}] 🗜️ 모델 양자화(INT8) 진행 중...")

    quantize_dynamic(
        model_input=preprocessed_model_path,
        model_output=quantized_model_path,
        weight_type=QuantType.QUInt8
    )

    print(f"[{model_type.upper()}] ✅ 양자화 성공 -> {quantized_model_path}")

    if os.path.exists(preprocessed_model_path):
        os.remove(preprocessed_model_path)

    print(f"[{model_type.upper()}] ✅ 최종 저장 경로 -> {output_dir}")


if __name__ == "__main__":
    current_file_path = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file_path)

    onnx_output_dir = os.path.join(current_dir, "kcbert_onnx")

    # FFT_MODEL_FOLDER = "20260511_173914_fft"
    LORA_MODEL_FOLDER = "20260524_151055_lora"

    # fft_model_dir = os.path.abspath(
    #     os.path.join(
    #         current_dir,
    #         "..",
    #         "..",
    #         "models",
    #         "kcbert_model",
    #         FFT_MODEL_FOLDER
    #     )
    # )

    lora_model_dir = os.path.abspath(
        os.path.join(
            current_dir,
            "..",
            "..",
            "models",
            "kcbert_model",
            LORA_MODEL_FOLDER
        )
    )

    # if os.path.exists(fft_model_dir):
    #     export_and_quantize_native(
    #         fft_model_dir,
    #         onnx_output_dir,
    #         model_type="fft"
    #     )
    # else:
    #     print(f"⚠️ FFT 모델 폴더를 찾을 수 없습니다: {fft_model_dir}")

    if os.path.exists(lora_model_dir):
        export_and_quantize_native(
            lora_model_dir,
            onnx_output_dir,
            model_type="lora",

        )
    else:
        print(f"⚠️ LoRA 모델 폴더를 찾을 수 없습니다: {lora_model_dir}")