# Qatar Foundation Admin Portal

A complete admin portal for managing opportunities and certifications, built with Python Flask backend and vanilla JavaScript frontend.

## 📋 Features Implemented

### Task 1 — Login & Signup (Day 1)

✅ **US-1.1 — Admin Sign Up**
- Full name, email, password, confirm password validation
- Email format validation
- Password minimum 8 characters
- Password and confirm password must match
- Duplicate email detection
- Successful registration redirects to login

✅ **US-1.2 — Admin Login**
- Email and password authentication
- Remember Me checkbox (7-day session vs 2-hour session)
- Generic error message for security (doesn't reveal which field is wrong)
- Session persistence — stays logged in on page refresh
- Redirects to dashboard on success
- Loads all opportunities created by the logged-in admin

✅ **US-1.3 — Forgot Password**
- Email submission for password reset
- Always shows same success message (privacy protection)
- Generates reset token with 1-hour expiration
- Reset link logged internally (no actual email sending)
- Expired token validation

### Task 2 — Opportunity Management (Day 2)

✅ **US-2.1 — View All Opportunities**
- Displays all opportunities created by the logged-in admin
- Shows opportunity name, category, duration, start date, description
- All data comes from database (no hardcoded data)
- Empty state message when no opportunities exist
- Hardcoded demo cards removed

✅ **US-2.2 — Add a New Opportunity**
- Modal form with all required fields:
  - Opportunity Name (required)
  - Duration (required)
  - Start Date (required)
  - Description (required)
  - Skills to Gain (required, comma-separated)
  - Category (required: Technology, Business, Design, Marketing, Data Science, Other)
  - Future Opportunities (required)
  - Maximum Applicants (optional)
- All required field validation
- Opportunity saved to database and linked to current admin
- New opportunity appears immediately without page refresh

✅ **US-2.3 — Opportunities Persist After Login**
- All opportunities stored in database
- Opportunities load on login
- Each admin only sees their own opportunities
- Session persistence across browser sessions

✅ **US-2.4 — View Opportunity Details**
- Click "View Details" button on any opportunity card
- Modal shows all saved fields
- Close button to dismiss modal

✅ **US-2.5 — Edit an Opportunity**
- Edit button on each opportunity card
- Opens same form modal with pre-filled data
- All required field validations apply
- Updates saved to database
- Changes reflect immediately without page refresh
- Only affects the specific opportunity

✅ **US-2.6 — Delete an Opportunity**
- Delete button on each opportunity card
- Confirmation prompt before deletion
- Permanent deletion from database
- Card removed immediately without page refresh
- Only admin who created it can delete

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or download the repository**

2. **Install Python dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Run the Flask server**
   ```bash
   python app.py
   ```

   The server will start on `http://localhost:5000`

4. **Open the application**
   - Open your browser and navigate to `http://localhost:5000`
   - You'll see the login page

### First Time Setup

1. Click "Create Account" to register a new admin account
2. Fill in your details (all fields required, password min 8 characters)
3. After successful registration, you'll be redirected to login
4. Log in with your credentials
5. You'll see the dashboard with the Opportunity Management tab

## 📁 Project Structure

```
.
├── backend/
│   ├── app.py                 # Flask application factory
│   ├── config.py              # Configuration settings
│   ├── models.py              # Database models (Admin, Opportunity)
│   ├── requirements.txt       # Python dependencies
│   ├── routes/
│   │   ├── auth.py           # Authentication routes (signup, login, forgot password)
│   │   └── opportunities.py  # Opportunity CRUD routes
│   ├── utils/
│   │   └── validators.py     # Email and password validators
│   └── instance/
│       └── database.db       # SQLite database (auto-created)
├── frontend/
│   ├── admin.html            # Main HTML file
│   ├── admin.css             # Styles
│   └── admin.js              # Frontend JavaScript
└── README.md
```

## 🔐 Security Features

- Passwords hashed using bcrypt
- Session-based authentication with Flask-Login
- CSRF protection via Flask
- HTTP-only cookies
- Generic error messages (don't reveal if email exists)
- Password reset tokens expire after 1 hour
- Remember Me option for extended sessions

## 🗄️ Database Schema

### Admin Table
- `id` (Primary Key)
- `full_name`
- `email` (Unique)
- `password_hash`
- `reset_token` (for password reset)
- `token_expiry`
- `created_at`

### Opportunity Table
- `id` (Primary Key)
- `name`
- `duration`
- `start_date`
- `description`
- `skills` (comma-separated)
- `category`
- `future_opps`
- `max_applicants` (optional)
- `admin_id` (Foreign Key → Admin)
- `created_at`
- `updated_at`

## 🎯 API Endpoints

### Authentication
- `POST /api/signup` — Register new admin
- `POST /api/login` — Login admin
- `POST /api/forgot-password` — Request password reset
- `POST /api/reset-password` — Reset password with token
- `POST /api/logout` — Logout admin
- `GET /api/me` — Get current session info

### Opportunities
- `GET /api/opportunities` — Get all opportunities for logged-in admin
- `POST /api/opportunities` — Create new opportunity
- `GET /api/opportunities/<id>` — Get single opportunity details
- `PUT /api/opportunities/<id>` — Update opportunity
- `DELETE /api/opportunities/<id>` — Delete opportunity

## 🧪 Testing the Application

### Test Signup
1. Go to `http://localhost:5000`
2. Click "Create Account"
3. Fill in all fields
4. Try with password < 8 characters (should show error)
5. Try with mismatched passwords (should show error)
6. Try with same email twice (should show "email already exists")
7. Successful signup redirects to login

### Test Login
1. Enter correct credentials
2. Try "Remember Me" checkbox
3. Try wrong password (should show generic error)
4. Successful login shows dashboard

### Test Forgot Password
1. Click "Forgot password?"
2. Enter any email
3. Always shows same success message
4. Check backend console for reset link (logged internally)

### Test Opportunities
1. Click "Opportunity Management" in sidebar
2. Click "Add New Opportunity"
3. Fill in all required fields
4. Submit — new card appears immediately
5. Click "Edit" — form pre-fills with data
6. Update and submit — changes appear immediately
7. Click "View Details" — modal shows all fields
8. Click "Delete" — confirmation prompt, then card removed
9. Logout and login again — all opportunities still there

## 🔧 Configuration

Edit `backend/config.py` to customize:
- `SECRET_KEY` — Flask secret key
- `SQLALCHEMY_DATABASE_URI` — Database location
- `REMEMBER_COOKIE_DURATION` — Remember Me duration (default: 7 days)
- `PERMANENT_SESSION_LIFETIME` — Regular session duration (default: 2 hours)

## 📝 Notes

- The UI is fully functional and unchanged from the original design
- All hardcoded demo data has been removed
- The frontend uses vanilla JavaScript (no frameworks)
- The backend uses Flask with SQLAlchemy ORM
- Database is SQLite (stored in `backend/instance/database.db`)
- Sessions are server-side with Flask-Login
- CORS is enabled for development

## 🐛 Troubleshooting

**Database not found:**
- The database is auto-created on first run
- Located at `backend/instance/database.db`

**Port already in use:**
- Change the port in `app.py`: `app.run(debug=True, port=5001)`

**Session not persisting:**
- Make sure cookies are enabled in your browser
- Check that `SECRET_KEY` is set in `config.py`

**Opportunities not loading:**
- Check browser console for errors
- Verify you're logged in (check `/api/me` endpoint)
- Check backend console for errors

## ✅ All User Stories Completed

- ✅ US-1.1 — Admin Sign Up
- ✅ US-1.2 — Admin Login
- ✅ US-1.3 — Forgot Password
- ✅ US-2.1 — View All Opportunities
- ✅ US-2.2 — Add a New Opportunity
- ✅ US-2.3 — Opportunities Persist After Login
- ✅ US-2.4 — View Opportunity Details
- ✅ US-2.5 — Edit an Opportunity
- ✅ US-2.6 — Delete an Opportunity

## 📧 Support

For issues or questions, check the backend console logs for detailed error messages.

---

**Built with:**
- Backend: Python 3, Flask, SQLAlchemy, Flask-Login, Flask-Bcrypt
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Database: SQLite
