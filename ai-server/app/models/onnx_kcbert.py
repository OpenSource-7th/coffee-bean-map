import os
from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer
from onnxruntime.quantization import quantize_dynamic, QuantType

# 모델 ONNX 포맷 및 양자화 시키기
def export_and_quantize(model_dir, output_dir):
    # output_dir에 설정한 디렉토리가 없으면 생성
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 모델 불러오기, ONNX
    model = ORTModelForSequenceClassification.from_pretrained(
        model_dir,
        export=True,
        local_files_only=True
    )
    # 토크나이저
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)

    # 기본 모델 및 토크나이저 저장
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print(f"ONNX 포맷 성공 -> {output_dir}/model.onnx")

    # 양자화 시키기
    onnx_model_path = os.path.join(output_dir, "model.onnx")
    quantized_model_path = os.path.join(output_dir, "model_quantized.onnx")

    # 모델 양자화
    quantize_dynamic(
        model_input=onnx_model_path,
        model_output=quantized_model_path,
        weight_type=QuantType.QUInt8
    )
    print(f"양자화 성공 -> {quantized_model_path}")


if __name__ == "__main__":
    # 경로
    current_file_path = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file_path)

    # 모델 가져오기
    saved_model_dir = os.path.abspath(
        os.path.join(current_dir, "..", "..", "models", "kcbert_model", "20260510_144939")
    )

    onnx_output_dir = os.path.join(current_dir, "kcbert_onnx")

    export_and_quantize(saved_model_dir, onnx_output_dir)