from fastapi import FastAPI

app = FastAPI(title="Coffee Bean Map — AI Server")


@app.get("/health")
def health():
    return {"status": "ok"}
