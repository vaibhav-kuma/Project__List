FROM python:3.11-slim
WORKDIR /app
COPY server.py index.html /app/
RUN pip install flask
EXPOSE 80
CMD ["python","server.py"]
