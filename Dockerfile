FROM python:3
WORKDIR /usr/src/app
COPY . .
CMD [ "python", "-m", "http.server", "8000" ]
