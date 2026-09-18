# SwachhSeva backend — Docker image
# Note: TensorFlow is intentionally NOT included in this image by default
# (see requirements.txt) to keep builds fast. If you've trained a model
# and want the container to load it, uncomment the tensorflow line in
# requirements.txt before building.

FROM python:3.11-slim

WORKDIR /app

# System packages needed by Pillow (image processing) and psycopg2 (Postgres driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads/resolutions models

EXPOSE 5000

ENV FLASK_ENV=production

CMD ["python", "run.py"]
