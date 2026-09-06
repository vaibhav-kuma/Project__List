FROM python:3.11-slim
WORKDIR /app
COPY app.py /app/
RUN pip install flask
ENV PORT=8080
EXPOSE 8080
CMD ["python","app.py"]
