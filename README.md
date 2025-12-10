# 🌟 Md Azad's Portfolio Website

[![Deployment Status](https://img.shields.io/badge/deployment-ready-brightgreen)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-green)](https://www.mongodb.com/)

> A modern, responsive portfolio website with a powerful admin panel for managing content dynamically.

## 🌐 Live Demo

- **Portfolio:** [Coming Soon - Deploy Now!](DEPLOYMENT.md)
- **Admin Panel:** [Your-URL/admin.html](DEPLOYMENT.md)

---

## ✨ Features

### Public Portfolio
- 🏠 Dynamic hero section with greeting
- 👤 About section with stats
- 💻 Skills with progress bars
- 📚 Education timeline
- 🗂️ Projects gallery with filters
- 🏆 Certificates showcase
- 🛠️ Services section
- 💬 Testimonials carousel
- 📝 Blog section
- 📧 Contact form with email notifications

### Admin Panel
- 🔐 Secure JWT authentication
- 📊 Dashboard with statistics
- ✏️ Full CRUD for all sections
- 📁 Image/file uploads
- ⚙️ Site settings & customization
- 🔑 Password management

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT

## 📦 Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/portfolio
JWT_SECRET=your_secret_key
```

Seed database:
```bash
node seed.js
```

Start server:
```bash
npm run dev
```

### Frontend Setup

Simply open `frontend/index.html` in browser or use Live Server.

For admin panel: `frontend/admin.html`

## 🔑 Default Admin Login

- **Email:** admin@mdazad.com
- **Password:** admin123

## 📁 Project Structure

```
Portfolio/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & upload middleware
│   ├── uploads/         # Uploaded files
│   ├── server.js        # Main server
│   ├── seed.js          # Database seeder
│   └── package.json
│
├── frontend/
│   ├── css/
│   │   ├── style.css    # Main styles
│   │   └── admin.css    # Admin styles
│   ├── js/
│   │   ├── app.js       # Main script
│   │   └── admin.js     # Admin script
│   ├── assets/          # Images
│   ├── index.html       # Portfolio
│   └── admin.html       # Admin panel
│
└── README.md
```

## 📸 Screenshots

After running, visit:
- Portfolio: http://localhost:5500/frontend/index.html
- Admin: http://localhost:5500/frontend/admin.html
- API: http://localhost:5000/api/health

## 👨‍💻 Author

**Md Azad Ansari**
- CSE Student at Government Polytechnic Chhapra
- 4th Semester

## 📄 License

MIT License
