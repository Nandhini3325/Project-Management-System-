const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/pmtl', {
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const { ObjectId } = mongoose.Types;

const ProjectSchema = new mongoose.Schema({
  projectName: String,
  description: String,
  teamMembers: [{
    name: String,
    role: String
  }],
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Pending'],
    default: 'Pending'
  },
  dueDate: Date,
  budget: {
    type: Number,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TaskSchema = new mongoose.Schema({
  taskName: String,
  description: String,
  dueDate: Date,
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Pending'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Task = mongoose.model('Task', TaskSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String },
  phoneNumber: { type: String },
  jobTitle: { type: String },
  department: { type: String },
  bio: { type: String },
  location: { type: String },
  profilePicture: { type: String, default: 'default-avatar.png' },
  joinDate: { type: Date, default: Date.now },
  projects: [ProjectSchema],
  tasks: [TaskSchema],
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', UserSchema);

// Registration
app.post('/api/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      fullName, 
      phoneNumber, 
      jobTitle, 
      department, 
      bio, 
      location 
    } = req.body;
    
    let user = await User.findOne({ email });
    
    if (user) return res.status(400).json({ message: 'User already exists' });
    
    user = new User({ 
      username, 
      email, 
      password,
      fullName,
      phoneNumber,
      jobTitle,
      department,
      bio,
      location
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      profilePicture: user.profilePicture
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// Add Project
app.post('/submit-project', async (req, res) => {
  const { userId, projectName, description, teamMembers, priority, status, dueDate, budget } = req.body;

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const formattedTeam = teamMembers.map(m => {
      if (!m.name || !m.role) throw new Error('Invalid team member');
      return { name: m.name, role: m.role };
    });

    const project = { projectName, description, teamMembers: formattedTeam, priority, status, dueDate, budget };
    user.projects.push(project);
    await user.save();

    res.status(200).json({ message: 'Project saved successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while saving project' });
  }
});

// Get Projects
app.get('/get-projects/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(userId)).select('projects');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.projects || user.projects.length === 0)
      return res.status(204).json({ message: 'No projects found' });

    res.json(user.projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});
// Update Project
app.put('/api/projects/:id', async (req, res) => {
  console.log('Update project request received:', req.params.id, req.body);
  const { id } = req.params;
  const { userId, projectName, description, teamMembers, priority, status, dueDate, budget } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const projectIndex = user.projects.findIndex(project => project._id.toString() === id);
    if (projectIndex === -1) return res.status(404).json({ message: 'Project not found' });

    // Format team members
    const formattedTeam = teamMembers.map(m => {
      return { name: m.name, role: m.role };
    });

    // Update project fields
    user.projects[projectIndex].projectName = projectName;
    user.projects[projectIndex].description = description;
    user.projects[projectIndex].teamMembers = formattedTeam;
    user.projects[projectIndex].priority = priority;
    user.projects[projectIndex].status = status;
    user.projects[projectIndex].dueDate = dueDate;
    user.projects[projectIndex].budget = budget;

    await user.save();
    res.json({ success: true, message: 'Project updated successfully', project: user.projects[projectIndex] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error while updating project', error: error.message });
  }
});

// Update Project Status (Partial Update)
app.patch('/api/projects/:id/status', async (req, res) => {
  const { id } = req.params;
  const { userId, status } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const projectIndex = user.projects.findIndex(project => project._id.toString() === id);
    if (projectIndex === -1) return res.status(404).json({ message: 'Project not found' });

    user.projects[projectIndex].status = status;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Project status updated successfully', 
      project: user.projects[projectIndex] 
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({ message: 'Server error while updating project status', error: error.message });
  }
});
// Delete Project - Fixed Endpoint
app.delete('/api/projects/:id', async (req, res) => {
  console.log('Delete project request received:', req.params.id, req.body);
  const { id } = req.params;
  const { userId } = req.body;

  if (!id || !userId) {
    return res.status(400).json({ message: 'Project ID and User ID are required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the project index
    const projectIndex = user.projects.findIndex(p => p._id.toString() === id);
    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Remove the project
    user.projects.splice(projectIndex, 1);
    await user.save();

    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Server error deleting project:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a fallback delete route
app.delete('/delete-project/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const projectIndex = user.projects.findIndex(p => p._id.toString() === id);
    if (projectIndex === -1) return res.status(404).json({ message: 'Project not found' });
    
    user.projects.splice(projectIndex, 1);
    await user.save();
    
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in fallback delete:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Project Calendar View
app.get('/user-projects-calendar', async (req, res) => {
  const userId = req.query.userId;

  if (!userId) return res.status(400).json({ message: "User ID is required" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const projects = user.projects.map(p => ({
      projectName: p.projectName,
      dueDate: new Date(p.dueDate).toISOString().split("T")[0]
    }));

    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  const userId = req.query.userId;

  if (!ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID format' });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const totalProjects = user.projects.length;
    let completedTasks = 0;
    let pendingTasks = 0;
    let teamMemberSet = new Set();

    user.projects.forEach(project => {
      if (project.status === 'Completed') completedTasks++;
      else pendingTasks++;
      project.teamMembers.forEach(m => teamMemberSet.add(m.name));
    });

    res.json({
      totalProjects,
      completedTasks,
      pendingTasks,
      teamMembers: teamMemberSet.size
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});
// Get Tasks
app.get('/api/tasks', async (req, res) => {
  const { userId } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch all tasks associated with this user
    const tasks = user.tasks || [];
    
    if (tasks.length === 0) {
      return res.status(204).json({ message: 'No tasks available' });
    }

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// Create Task
app.post('/api/tasks', async (req, res) => {
  const { userId, taskName, description, dueDate, priority, status } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    const newTask = {
      taskName,
      description,
      dueDate,
      priority: priority || 'Medium',
      status: status || 'Pending'
    };

    user.tasks.push(newTask);
    await user.save();

    res.status(201).json({ success: true, message: 'Task created successfully', task: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to add task', error: error.message });
  }
});

// Update Task (Full Update)
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { userId, taskName, description, dueDate, priority, status } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const task = user.tasks.id(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Update task fields
    task.taskName = taskName;
    task.description = description;
    task.dueDate = dueDate;
    task.priority = priority;
    task.status = status;

    await user.save();
    res.json({ success: true, message: 'Task updated successfully', task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

// Update Task Status (Partial Update)
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { userId, status } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const task = user.tasks.id(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = status;
    await user.save();

    res.json({ success: true, message: 'Task status updated successfully', task });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error while updating task status' });
  }
});

// DELETE Task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const taskIndex = user.tasks.findIndex(task => task._id.toString() === id);
    if (taskIndex === -1) return res.status(404).json({ message: 'Task not found' });

    // Remove the task from the user's task array
    user.tasks.splice(taskIndex, 1);
    await user.save();

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const link = `http://localhost:${PORT}`;
  console.log(`\n🚀 Server running at: \x1b[36m%s\x1b[0m\n`, link);
})