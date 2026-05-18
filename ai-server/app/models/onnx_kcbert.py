import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from onnxruntime.quantization import quantize_dynamic, QuantType, shape_inference


def export_and_quantize_native(model_dir, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("⏳ 모델 및 토크나이저 로드 중...")
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)

    # 🌟 핵심 1: return_dict=False 로 설정하면 복잡한 Wrapper 클래스가 필요 없습니다!
    model = AutoModelForSequenceClassification.from_pretrained(
        model_dir,
        return_dict=False,
        local_files_only=True
    )

    # 🌟 핵심 2: 모델을 완전한 추론 모드로 고정하여 내부 변동성을 차단합니다.
    model.eval()

    dummy_text = "커피가 너무 맛있어요!"
    inputs = tokenizer(
        dummy_text,
        return_tensors="pt",
        max_length=256,
        padding="max_length",
        truncation=True
    )

    onnx_model_path = os.path.join(output_dir, "model.onnx")

    print("⚙️ ONNX 파일로 추출 중...")
    with torch.no_grad():
        torch.onnx.export(
            model,
            (inputs["input_ids"], inputs["attention_mask"], inputs["token_type_ids"]),
            onnx_model_path,
            export_params=True,
            opset_version=14,  # 가장 호환성이 좋은 14버전 사용
            do_constant_folding=True,
            input_names=['input_ids', 'attention_mask', 'token_type_ids'],
            output_names=['logits'],
            # 🌟 핵심 3: 에러의 주범이었던 dynamic_axes를 삭제하여 크기를 고정합니다.
        )
    print(f"✅ ONNX 추출 성공 -> {onnx_model_path}")

    # 서버 구동에 필요한 파일 저장
    tokenizer.save_pretrained(output_dir)
    model.config.save_pretrained(output_dir)

    # 🌟 핵심 4: 양자화 전처리 (에러 로그에서 권장한 교정 작업)
    print("🧹 ONNX 그래프 전처리 및 형태(Shape) 교정 중...")
    preprocessed_model_path = os.path.join(output_dir, "model_prep.onnx")
    shape_inference.quant_pre_process(
        onnx_model_path,
        preprocessed_model_path
    )

    quantized_model_path = os.path.join(output_dir, "model_quantized.onnx")
    print("🗜️ 모델 양자화(INT8) 진행 중...")

    quantize_dynamic(
        model_input=preprocessed_model_path,  # 교정이 끝난 전처리 모델을 넣습니다!
        model_output=quantized_model_path,
        weight_type=QuantType.QUInt8
    )
    print(f"✅ 양자화 성공 -> {quantized_model_path}")

    # 사용이 끝난 전처리 중간 파일은 깔끔하게 삭제
    if os.path.exists(preprocessed_model_path):
        os.remove(preprocessed_model_path)


if __name__ == "__main__":
    current_file_path = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file_path)

    # 이전 코드에서 잘 설정하셨던 경로 그대로!
    saved_model_dir = os.path.abspath(
        os.path.join(current_dir, "..", "..", "models", "kcbert_model", "20260511_173914_fft")
    )

    onnx_output_dir = os.path.join(current_dir, "kcbert_onnx")

    export_and_quantize_native(saved_model_dir, onnx_output_dir)