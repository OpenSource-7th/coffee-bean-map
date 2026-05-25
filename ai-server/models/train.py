import torch
from torch import nn
from torch import functional as F
from torch.utils.data import Dataset, DataLoader

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import get_peft_model, LoraConfig, TaskType, PeftModel

import pandas as pd
from sklearn.metrics import f1_score
from sklearn.model_selection import train_test_split

import os
import re
import emoji
import json
from datetime import datetime
from soynlp.normalizer import repeat_normalize


# 데이터셋
class ReviewDataset(Dataset):
    pattern = re.compile(r'[^ .,?!/@$%~％·∼()\x00-\x7Fㄱ-ㅣ가-힣]+')
    url_pattern = re.compile(
        r'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)'
    )

    def __init__(self, texts, labels, tokenizer, max_length=256):
        self.texts = [self._clean(str(text)) for text in texts]
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def _clean(self, x):
        x = self.pattern.sub(' ', x)
        x = emoji.replace_emoji(x, replace='')
        x = self.url_pattern.sub('', x)
        x = x.strip()
        x = repeat_normalize(x, num_repeats=2)
        return x

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]

        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        x_data = encoding["input_ids"].flatten()
        y_data = torch.tensor(label, dtype=torch.long)
        attention_mask = encoding["attention_mask"].flatten()

        return x_data, y_data, attention_mask


# 훈련 클래스
class ModelTrain:
    def __init__(self, config: dict) -> None:
        self._model_name: str = config["model_name"]

        # 지표 저장을 위한 딕셔너리 초기화
        self.history = {
            "train_loss": [],
            "valid_loss": [],
            "f1_score": []
        }

        # 🔥 공통 Dropout 확률 가져오기 (기본값 0.1)
        dropout_prob = config.get("dropout", 0.1)

        # 모델 불러오기 및 분기 처리
        if config.get("load_my_model", False):
            try:
                self._tokenizer = AutoTokenizer.from_pretrained(self._model_name, local_files_only=True)

                # 원본 베이스 모델을 불러올 때도 우리가 설정한 dropout 적용
                base_model = AutoModelForSequenceClassification.from_pretrained(
                    config.get("base_model_name", "beomi/kcbert-base"),
                    num_labels=config["num_labels"],
                    hidden_dropout_prob=dropout_prob,
                    attention_probs_dropout_prob=dropout_prob
                )

                # 저장된 모델이 LoRA 모델인지 확인하고 로드
                if config.get("use_lora", False):
                    self._model = PeftModel.from_pretrained(base_model, self._model_name)
                else:
                    self._model = AutoModelForSequenceClassification.from_pretrained(
                        self._model_name,
                        num_labels=config["num_labels"],
                        hidden_dropout_prob=dropout_prob,
                        attention_probs_dropout_prob=dropout_prob,
                        local_files_only=True
                    )
            except Exception as e:
                raise ValueError(f"해당 모델을 불러올 수 없습니다: {e}")
        else:
            self._tokenizer = AutoTokenizer.from_pretrained(self._model_name)

            # 원본 베이스 모델에 Dropout 적용하여 로드
            base_model = AutoModelForSequenceClassification.from_pretrained(
                self._model_name,
                num_labels=config["num_labels"],
                hidden_dropout_prob=dropout_prob,
                attention_probs_dropout_prob=dropout_prob
            )

            # 새 모델 학습 시 LoRA 적용 여부
            if config.get("use_lora", False):
                print("⚡ LoRA 모드로 모델을 초기화합니다.")
                lora_config = LoraConfig(
                    task_type=TaskType.SEQ_CLS,
                    r=config.get("lora_r", 8),
                    lora_alpha=config.get("lora_alpha", 32),
                    lora_dropout=dropout_prob,  # 🔥 여기서도 공통 dropout 적용!
                    target_modules=["query", "value"]
                )
                self._model = get_peft_model(base_model, lora_config)
                self._model.print_trainable_parameters()
            else:
                print("🔥 Full Fine-Tuning 모드로 모델을 초기화합니다.")
                self._model = base_model

        # config data
        self._config = config
        self._batch_size = config["batch_size"]
        self._epochs = config["epochs"]
        self._device = torch.device(config["device"])

        self._model.to(self._device)
        self._optimizer = self._set_optimizer(self._model, config["optimizer"], config["lr"])

    @classmethod
    def load_all_csv_data(cls, directory_path, file_labels):
        df_list = []

        for filename in os.listdir(directory_path):
            if filename.endswith(".csv") and filename in file_labels:
                file_path = os.path.join(directory_path, filename)
                df = pd.read_csv(file_path)

                if "text" in df.columns:
                    df = df[["text"]].copy()
                    df["label"] = file_labels[filename]
                    df_list.append(df)

        if not df_list:
            return pd.DataFrame(columns=["text", "label"])

        combined_df = pd.concat(df_list, ignore_index=True)

        combined_df = combined_df.dropna(subset=["text", "label"])
        combined_df["label"] = combined_df["label"].astype(int)

        return combined_df

    @classmethod
    def _set_optimizer(cls, model, optim_name: str, lr=2e-5) -> None:
        optimizer = getattr(torch.optim, optim_name)
        return optimizer(model.parameters(), lr=lr)

    def _train_dataloader(self, dataset: Dataset) -> DataLoader:
        return DataLoader(dataset, batch_size=self._batch_size, shuffle=True)

    def _valid_dataloader(self, dataset: Dataset) -> DataLoader:
        return DataLoader(dataset, batch_size=self._batch_size, shuffle=False)

    def _train_step(self, batch) -> float:
        x_train, y_train, attention_mask = batch
        x_train = x_train.to(self._device)
        y_train = y_train.to(self._device)
        attention_mask = attention_mask.to(self._device)

        self._optimizer.zero_grad()

        output = self._model(
            input_ids=x_train,
            attention_mask=attention_mask,
            labels=y_train
        )
        loss = output.loss

        loss.backward()
        self._optimizer.step()

        return loss.cpu().detach().item()

    def _valid_step(self, batch):
        x_valid, y_valid, attention_mask = batch
        x_valid = x_valid.to(self._device)
        y_valid = y_valid.to(self._device)
        attention_mask = attention_mask.to(self._device)

        with torch.no_grad():
            output = self._model(
                input_ids=x_valid,
                attention_mask=attention_mask,
                labels=y_valid
            )
            loss = output.loss
            logits = output.logits
        return loss.cpu().item(), logits.cpu(), y_valid.cpu()

    def train(self, train_dataset: Dataset, valid_dataset: Dataset = None, save_config=False, valid=False,
              save_scores=False) -> None:
        train_loader: DataLoader = self._train_dataloader(train_dataset)
        if valid:
            try:
                valid_loader: DataLoader = self._valid_dataloader(valid_dataset)
            except:
                raise ValueError("검증이 활성화 되어있으나 검증 데이터셋이 할당되지 않았습니다.")

        for epoch in range(self._epochs):
            self._model.train()
            total_loss: float = 0.

            for batch in train_loader:
                loss = self._train_step(batch)
                total_loss += loss

            avg_train_loss = total_loss / len(train_loader)
            print(f"Epoch {epoch + 1}/{self._epochs} - Train Loss: {avg_train_loss:.4f}")

            if save_scores:
                self.history["train_loss"].append(avg_train_loss)

            if valid:
                avg_valid_loss, f1 = self.valid(valid_loader)

                if save_scores:
                    self.history["valid_loss"].append(avg_valid_loss)
                    self.history["f1_score"].append(f1)

        self.save(save_config=save_config, save_scores=save_scores)

    def valid(self, valid_loader: DataLoader):
        self._model.eval()
        total_loss: float = 0.
        all_preds: list = []
        all_labels: list = []

        for batch in valid_loader:
            loss, logits, labels = self._valid_step(batch)

            total_loss += loss

            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)
            all_preds.extend(preds.numpy())
            all_labels.extend(labels.numpy())

        avg_valid_loss = total_loss / len(valid_loader)
        f1 = f1_score(all_labels, all_preds, average="binary")

        print(f"Validation Loss: {avg_valid_loss:.4f} - F1 Score: {f1:.4f}")
        return avg_valid_loss, f1

    def save(self, save_config=False, save_scores=False):
        base_dir = "kcbert_model"
        time_str = datetime.now().strftime("%Y%m%d_%H%M%S")

        model_type = "lora" if self._config.get("use_lora", False) else "fft"
        save_dir = os.path.join(base_dir, f"{time_str}_{model_type}")

        if not os.path.exists(save_dir):
            os.makedirs(save_dir)

        self._model.save_pretrained(save_dir)
        self._tokenizer.save_pretrained(save_dir)

        if save_config:
            save_dict = self._config.copy()
            if "device" in save_dict:
                save_dict["device"] = str(save_dict["device"])

            with open(os.path.join(save_dir, "train_config.json"), "w", encoding="utf-8") as f:
                json.dump(save_dict, f, ensure_ascii=False, indent=4)

        if save_scores and len(self.history["train_loss"]) > 0:
            with open(os.path.join(save_dir, "training_metrics.json"), "w", encoding="utf-8") as f:
                json.dump(self.history, f, ensure_ascii=False, indent=4)
            print(f"📊 훈련 지표(Metrics) 저장 완료")

        print(f"✅ 모델 저장완료 경로 -> {save_dir}")


if __name__ == "__main__":
    # 모델 config
    train_config = {
        "base_model_name": "beomi/kcbert-base",
        "model_name": "beomi/kcbert-base",
        "num_labels": 2,
        "batch_size": 16,
        "epochs": 5,
        "lr": 2e-5,
        "optimizer": "AdamW",
        "use_lora": False,
        "lora_r": 8,
        "lora_alpha": 32,
        "dropout": 0.1,  # dropout
        "load_my_model": False,
        "device": "mps"
    }

    train_data_labels = {
        "coffee_reviews.csv": 1,
        "dessert_reviews.csv": 0,
        "drink_reviews.csv": 0,
        "employee_reviews.csv": 0,
        "interior_reviews.csv": 0,
        "restaurant_reviews.csv": 0,
        "tmi_reviews.csv": 0
    }

    valid_data_labels = {
        "coffee_reviews.csv": 1,
        "dessert_reviews.csv": 0,
        "drink_reviews.csv": 0,
        "employee_reviews.csv": 0,
        "interior_reviews.csv": 0,
        "restaurant_reviews.csv": 0,
        "tmi_reviews.csv": 0
    }

    train_data_df = ModelTrain.load_all_csv_data("train_dataset", train_data_labels)
    valid_data_df = ModelTrain.load_all_csv_data("valid_dataset", valid_data_labels)

    if not train_data_df.empty:
        train_texts = train_data_df["text"].tolist()
        train_labels = train_data_df["label"].tolist()
        train_config["coffee_review_train_data"] = train_labels.count(1)
        train_config["not_coffee_review_train_data"] = train_labels.count(0)
        print(f"커피 관련 리뷰 개수(훈련): {train_labels.count(1)}\n커피 관련 없는 리뷰 개수(훈련): {train_labels.count(0)}")

        valid_texts = valid_data_df["text"].tolist()
        valid_labels = valid_data_df["label"].tolist()
        train_config["coffee_review_valid_data"] = valid_labels.count(1)
        train_config["not_coffee_review_valid_data"] = valid_labels.count(0)
        print(f"커피 관련 리뷰 개수(검증): {valid_labels.count(1)}\n커피 관련 없는 리뷰 개수(검증): {valid_labels.count(0)}\n")

        model_trainer = ModelTrain(train_config)
        train_dataset = ReviewDataset(train_texts, train_labels, model_trainer._tokenizer, max_length=256)
        valid_dataset = ReviewDataset(valid_texts, valid_labels, model_trainer._tokenizer, max_length=256)

        print(f"\n훈련 데이터셋 개수: {len(train_dataset)}\n검증 데이터셋 개수: {len(valid_dataset)}\n")

        model_trainer.train(train_dataset, valid_dataset, save_config=True, valid=True, save_scores=True)
    else:
        print("train_dataset 폴더에서 csv 파일들을 찾을 수 없습니다.")