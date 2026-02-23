# AMC DASHBOARD - SETUP INSTRUCTIONS


LOGIN CREDENTIALS


Admin Account:
- Email: adminigl@yopmail.com
- Password: admin123
- Role: Administrator (Full access to all features)

Employee Account:
- Email: empigl@yopmail.com  
- Password: emp123
- Role: Employee (Limited access to assigned tasks and contracts)

================================
INSTALLATION INSTRUCTIONS
================================

PREREQUISITES:
- Node.js (version 14 or higher)
- npm (comes with Node.js)
- MySQL database server

STEP 1: BACKEND SETUP
---------------------
1. Navigate to backend directory:
   cd backend

2. Install backend dependencies:
   npm install express nodemon bcryptjs jsonwebtoken mysql2 cors dotenv helmet express-rate-limit nodemailer cron

3. Create .env file in backend directory with:
   JWT_SECRET=your_jwt_secret_key
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=amc_dashboard
   EMAIL_FROM=your_email@gmail.com
   EMAIL_PASS=your_email_password

STEP 2: FRONTEND SETUP
----------------------
1. Navigate to frontend directory:
   cd frontend

2. Install frontend dependencies:
   npm install react react-dom react-router-dom axios tailwindcss postcss autoprefixer react-hook-form recharts papaparse react-hot-toast

3. Initialize Tailwind CSS:
   npx tailwindcss init -p

STEP 3: DATABASE SETUP
----------------------
1. Create MySQL database named 'amc_dashboard'
2. Import the provided database schema
3. Insert sample data (users, contracts, tasks)

STEP 4: RUNNING THE APPLICATION
-------------------------------
1. From project root directory, run:
   npm run dev

2. This will start both servers concurrently:
   - Backend server: http://localhost:5000
   - Frontend server: http://localhost:3000

3. Open browser and navigate to: http://localhost:3000

================================
TESTING THE APPLICATION
================================

1. Go to login page
2. Use either Admin or Employee credentials above
3. Admin users will see full dashboard with user management
4. Employee users will see limited dashboard with assigned tasks

================================
FEATURES TO TEST
================================

Admin Features:
- User management and approval
- Full contract CRUD operations
- Task assignment to employees
- System analytics and reporting
- CSV export functionality

Employee Features:
- View assigned contracts and tasks
- Update task status and progress
- Personal profile management
- Limited dashboard analytics

================================
TROUBLESHOOTING
================================

If servers don't start:
1. Check if ports 3000 and 5000 are available
2. Verify MySQL database connection
3. Ensure all dependencies are installed
4. Check console for error messages

Database connection issues:
1. Verify MySQL server is running
2. Check database credentials in .env file
3. Ensure database 'amc_dashboard' exists

================================
ADDITIONAL NOTES
================================

- The application uses JWT tokens for authentication
- Email notifications require SMTP configuration
- All passwords are hashed using bcrypt
- Role-based access control is enforced on all routes
- The application supports responsive design for mobile devices

For support or issues, contact: M.S.Jawahar (8810577805)
