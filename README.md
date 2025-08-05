# 🐔 Rubber Chicken API

A full-stack image gallery web app featuring image upload, metadata storage with DynamoDB, and an interactive frontend. Built with Dockerized services including:

- 🚀 Express-based `image-services` (uploads images)
- 📦 Express-based `meta-service` (stores image metadata in DynamoDB)
- 🗃️ DynamoDB Local
- 🧑‍💻 DynamoDB Admin UI for managing tables and items
- 🌐 Static HTML/CSS/JS frontend served by NGINX

---

## 📁 Project Structure

```
rubber-chicken-api/
├── backend/
│   └── services/
│       ├── image-services/
│       └── meta-service/
├── frontend/
│   └── public/
├── docker-compose.yml
├── openapi.yaml
└── README.md
```

---

## 🧰 Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Internet connection (for first-time image pulls)
- Optional: Node.js (for local testing without Docker)

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/alinjeni/rubber-chicken-api.git
cd rubber-chicken-api
```

---

### 2️⃣ Start the App

Make sure you're in the root folder (`rubber-chicken-api`) and run:

```bash
docker-compose up --build
```

This will:
- Pull and build services
- Start all containers
- Expose services to your local machine

---

### 3️⃣ App URLs

| Service             | URL                         |
|---------------------|-----------------------------|
| Frontend UI         | http://localhost:8080       |
| Image API           | http://localhost:3001       |
| Metadata API        | http://localhost:3002       |
| DynamoDB Local      | http://localhost:8000       |
| DynamoDB Admin UI   | http://localhost:8001       |

---

## 🧪 Testing the App

1. **Upload Images** via the frontend
2. **View & Filter** gallery at [http://localhost:8080]
3. **Inspect Metadata** in DynamoDB Admin UI at [http://localhost:8001]

---

## 🛠️ Dev Tips

### Restart Without Losing Data

```bash
docker-compose stop
docker-compose up
```
---

## 🧹 Clean Up

To stop all services and remove containers:

```bash
docker-compose down
```

To also remove all volumes and start clean:

```bash
docker-compose down --volumes
```

---

## 📦 Useful Commands

- View logs:

```bash
docker-compose logs -f
```

---

## 🙋‍♀️ Need Help?

If anything doesn’t work, check:
- Docker Desktop is running
- Port conflicts (e.g., 8080, 3001, 8001)

---

## 📃 License

This project is open-source and free to use.