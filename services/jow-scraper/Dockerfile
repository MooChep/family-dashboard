FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8001

CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "2", "--timeout", "30", "main:app"]
