# TaskFlow – Project Management Web App

## Overview

**TaskFlow** is a full-stack project management system built using MongoDB, Express.js, and Node.js (no frontend framework). It helps individuals and teams streamline project planning, task management, and team collaboration through secure user authentication, real-time dashboards, calendar views, and detailed analytics.

## Features

### 1. User Authentication
- Secure user registration and login with password hashing (bcrypt)
- Session-based or token-based authentication (e.g., JWT)
- Role-based data access control

### 2. Project Management
- Create, update, delete projects
- Assign due dates, status (Pending, In Progress, Completed), priorities, and budgets
- Add and manage team members with roles
- Embedded project data within user profiles for optimized access

### 3. Task Management
- Add, update, delete tasks per project
- Assign deadlines, priorities, and status
- Embedded tasks within user documents for fast retrieval

### 4. Dashboard Analytics
- View overall statistics: total/completed/pending tasks and projects
- Track team member involvement
- Integrated project and task metrics for productivity insights

### 5. Calendar View
- Visual calendar for upcoming project deadlines
- Timeline-based project planning and reminder system

### 6. API-Driven Architecture
- Fully RESTful API design with modular controllers
- Endpoints for authentication, project, task, and dashboard operations

### 7. Responsive Frontend (HTML/CSS/JS)
- Device-friendly design without a frontend framework
- Mobile and desktop support with consistent UI
- Uses Fetch API for backend communication

## Tech Stack

| Layer      | Technology             |
|------------|------------------------|
| Backend    | Node.js + Express.js   |
| Database   | MongoDB + Mongoose     |
| Frontend   | HTML, CSS, JavaScript  |
| Auth       | Bcrypt.js (password hashing) |
| Hosting    | Localhost / Deployable on Heroku, Render, or Vercel |

## Database Design

- **Users Collection**
  - Stores username, email, password, projects, and tasks
- **Projects (embedded)**
  - Includes name, description, team, priority, status, deadline, budget
- **Tasks (embedded)**
  - Includes name, description, due date, priority, status

This schema allows fast, single-query retrieval of user-related data without joins.
