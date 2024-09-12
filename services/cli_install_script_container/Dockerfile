FROM golang:1.22.7-alpine

WORKDIR /app
COPY . .

RUN go mod download
RUN go build -o serve main.go

ENTRYPOINT [ "./serve" ]
