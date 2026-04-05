FROM python:3.10-slim

WORKDIR /code

# Pre-install dependencies for faster builds
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files
COPY . .

# Exposure (HF Spaces use 7860)
EXPOSE 7860

# CMD to run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
