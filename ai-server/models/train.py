import torch
from torch import nn
from torch import functional as F
from torch.utils.data import Dataset, DataLoader

from transformers import AutoTokenizer, AutoModelForSequenceClassification

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
        self._model_name: str = config["model_name"] # 모델 이름
        self._tokenizer = AutoTokenizer.from_pretrained(self._model_name) # 토크나이저
        self._model: nn.Module = AutoModelForSequenceClassification.from_pretrained(
            self._model_name,
            num_labels=config["num_labels"]
        ) # 모델
        if config["load_my_model"]:
            pass

        # config data
        self._config = config
        self._batch_size = config["batch_size"]
        self._epochs = config["epochs"]
        self._device = torch.device(config["device"])

        self._optimizer = None

        self._set_optimizer(config["optimizer"], config["lr"])

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

    def _set_optimizer(self, optim_name: str, lr=2e-5) -> None:
        optimizer = getattr(torch.optim, optim_name) # AdamW 추천
        self._optimizer = optimizer(self._model.parameters(), lr=lr)

    def _train_dataloader(self, dataset: Dataset) -> DataLoader:
        return DataLoader(dataset, batch_size=self._batch_size, shuffle=True)

    def _valid_dataloader(self, dataset: Dataset) -> DataLoader:
        return DataLoader(dataset, batch_size=self._batch_size, shuffle=False)

    def _train_step(self, batch) -> float:
        x_train, y_train, attention_mask = batch # (text, label)
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

    def train(self, train_dataset: Dataset, valid_dataset: Dataset = None, save_config=False, valid=False) -> None:
        train_loader: DataLoader = self._train_dataloader(train_dataset)
        if valid:
            valid_loader: DataLoader = self._valid_dataloader(valid_dataset)


        for epoch in range(self._epochs):
            self._model.train()
            total_loss: float = 0.

            for batch in train_loader:
                loss = self._train_step(batch)
                total_loss += loss

            print(f"Epoch {epoch+1}/{self._epochs} - Train Loss: {total_loss/len(train_loader):.4f}")
            if valid:
                self.valid()

        self.save(save_config=save_config)

    def valid(self, valid_loader: DataLoader) -> None:
        self._model.eval()
        total_loss: float = 0.
        all_preds: list = []
        all_labels: list = []

        for batch in valid_loader:
            loss, logits, labels = self._valid_step(batch)

            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)
            all_preds.extend(preds.numpy())
            all_labels.extend(labels.numpy())

        f1 = f1_score(all_labels, all_preds, average="binary")
        print(f"Validation Loss: {total_loss / len(valid_loader):.4f} - F1 Score: {f1:.4f}")

    def save(self, save_config=False):
        base_dir = "kcbert_model"
        time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_dir = os.path.join(base_dir, time_str)

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

        print(f"데이터 저장완료 경로 -> {save_dir}")


if __name__ == "__main__":
    train_config = {
        "model_name": "beomi/kcbert-base",
        "num_labels": 2,
        "batch_size": 8,
        "epochs": 3,
        "lr": 2e-5,
        "optimizer": "AdamW",
        "load_my_model": False,
        "device": "cpu"
    }

    data_labels = {
        "coffee_professional_reviews2.csv": 1,
        "coffee_reviews.csv": 1,
        "dessert_reviews.csv": 0,
        "drink_reviews.csv": 0,
        "employee_reviews.csv": 0,
        "interio_reviews.csv": 0,
        "restaurant_reviews.csv": 0,
        "tmi_reviews.csv": 0
    }
    train_data_df = ModelTrain.load_all_csv_data("train_dataset", data_labels)

    if not train_data_df.empty:
        texts = train_data_df["text"].tolist()
        labels = train_data_df["label"].tolist()
        print(f"커피 관련 리뷰 개수: {labels.count(1)}\n커피 관련 없는 리뷰 개수: {labels.count(0)}")

        train_texts, valid_texts, train_labels, valid_labels = train_test_split(
            texts, labels, test_size=0.2, random_state=42
        )

        model_trainer = ModelTrain(train_config)
        train_dataset = ReviewDataset(train_texts, train_labels, model_trainer._tokenizer)
        valid_dataset = ReviewDataset(valid_texts, valid_labels, model_trainer._tokenizer)
        print(f"훈련 데이터셋 개수: {len(train_dataset)}\n검증 데이터셋 개수: {len(valid_dataset)}")

        model_trainer.train(train_dataset, save_config=True, valid=True)
    else:
        print("train_dataset 폴더에서 csv 파일들을 찾을 수 없습니다.")
