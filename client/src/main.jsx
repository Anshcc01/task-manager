import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  LogOut,
  Plus,
  Shield,
  Users
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function getId(item) {
  return item?.id || item?._id || "";
}

function api(token) {
  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: "DELETE" })
  };
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const data = await api().post(path, body);
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Full-stack assignment</p>
          <h1>Team Task Manager</h1>
          <p className="muted">Create projects, assign work, and track team delivery with Admin and Member access.</p>
        </div>

        <form onSubmit={submit} className="stack">
          <div className="segmented">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
          </div>

          {mode === "signup" && (
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
          )}

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>

          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </label>

          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>
        </form>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProjectForm({ onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event) {
    event.preventDefault();
    await onCreate({ name, description });
    setName("");
    setDescription("");
  }

  return (
    <form onSubmit={submit} className="panel stack">
      <h2>New Project</h2>
      <label>
        Project name
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" />
      </label>
      <button className="primary"><Plus size={16} /> Create project</button>
    </form>
  );
}

function TaskForm({ selectedProject, users, onCreate }) {
  const [task, setTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assigneeId: ""
  });

  async function submit(event) {
    event.preventDefault();
    await onCreate({
      ...task,
      projectId: getId(selectedProject),
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      assigneeId: task.assigneeId || null
    });
    setTask({ title: "", description: "", priority: "MEDIUM", dueDate: "", assigneeId: "" });
  }

  if (!selectedProject) return null;

  return (
    <form onSubmit={submit} className="panel stack">
      <h2>New Task</h2>
      <label>
        Title
        <input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} required minLength={2} />
      </label>
      <label>
        Description
        <textarea value={task.description} onChange={(e) => setTask({ ...task, description: e.target.value })} rows="3" />
      </label>
      <div className="two-cols">
        <label>
          Priority
          <select value={task.priority} onChange={(e) => setTask({ ...task, priority: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={task.dueDate} onChange={(e) => setTask({ ...task, dueDate: e.target.value })} />
        </label>
      </div>
      <label>
        Assignee
        <select value={task.assigneeId} onChange={(e) => setTask({ ...task, assigneeId: e.target.value })}>
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={getId(user)} value={getId(user)}>{user.name}</option>
          ))}
        </select>
      </label>
      <button className="primary"><Plus size={16} /> Add task</button>
    </form>
  );
}

function MemberManager({ project, users, currentUser, onAdd, onRemove }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("MEMBER");

  async function submit(event) {
    event.preventDefault();
    await onAdd(getId(project), { userId, role });
    setUserId("");
    setRole("MEMBER");
  }

  if (!project) return null;

  return (
    <section className="panel stack">
      <h2>Team</h2>
      <form onSubmit={submit} className="member-form">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
          <option value="">Select user</option>
          {users.map((user) => (
            <option key={getId(user)} value={getId(user)}>{user.name} - {user.email}</option>
          ))}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button className="icon-button" title="Add member"><Plus size={18} /></button>
      </form>
      <div className="member-list">
        {project.memberships?.map((membership) => {
          const memberId = getId(membership.user);
          const isCurrentUser = memberId === getId(currentUser);

          return (
          <div key={getId(membership)} className="member-row">
            <span>{membership.user.name}</span>
            <small>{membership.role}</small>
            <button
              disabled={isCurrentUser}
              title={isCurrentUser ? "You cannot remove yourself" : "Remove member"}
              onClick={() => onRemove(getId(project), memberId)}
            >
              {isCurrentUser ? "You" : "Remove"}
            </button>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem("session");
    return raw ? JSON.parse(raw) : null;
  });
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const client = useMemo(() => api(session?.token), [session?.token]);
  const isAdmin = session?.user?.role === "ADMIN";

  function saveSession(data) {
    localStorage.setItem("session", JSON.stringify(data));
    setSession(data);
  }

  function logout() {
    localStorage.removeItem("session");
    setSession(null);
  }

  async function load() {
    if (!session) return;

    const [dashboardData, projectData, userData] = await Promise.all([
      client.get("/dashboard"),
      client.get("/projects"),
      client.get("/users")
    ]);

    setDashboard(dashboardData);
    setProjects(projectData);
    setUsers(userData);

    const nextId = selectedId || getId(projectData[0]) || "";
    setSelectedId(nextId);

    if (nextId) {
      setSelectedProject(await client.get(`/projects/${nextId}`));
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [session, selectedId]);

  async function createProject(body) {
    await client.post("/projects", body);
    await load();
  }

  async function createTask(body) {
    await client.post("/tasks", body);
    await load();
  }

  async function updateStatus(taskId, status) {
    await client.patch(`/tasks/${taskId}/status`, { status });
    await load();
  }

  async function addMember(projectId, body) {
    await client.post(`/projects/${projectId}/members`, body);
    await load();
  }

  async function removeMember(projectId, userId) {
    await client.delete(`/projects/${projectId}/members/${userId}`);
    await load();
  }

  if (!session) return <AuthScreen onAuth={saveSession} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <FolderKanban size={24} />
          <span>Task Manager</span>
        </div>
        <button className="logout" onClick={logout}><LogOut size={16} /> Logout</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome, {session.user.name}</p>
            <h1>Dashboard</h1>
          </div>
          <span className="role"><Shield size={16} /> {session.user.role}</span>
        </header>

        {error && <p className="error">{error}</p>}

        <section className="stats-grid">
          <Stat icon={FolderKanban} label="Projects" value={dashboard?.projects ?? 0} />
          <Stat icon={CircleDot} label={isAdmin ? "Total tasks" : "Assigned tasks"} value={dashboard?.totalTasks ?? 0} />
          <Stat icon={Clock3} label="Overdue" value={dashboard?.overdue ?? 0} />
          <Stat icon={CheckCircle2} label="Done" value={dashboard?.status?.done ?? 0} />
        </section>

        <section className="workspace">
          <div className="main-column">
            <section className="panel">
              <div className="panel-head">
                <h2>Projects</h2>
                <Users size={18} />
              </div>
              <div className="project-list">
                {projects.map((project) => (
                  <button
                    key={getId(project)}
                    className={getId(project) === selectedId ? "project active" : "project"}
                    onClick={() => setSelectedId(getId(project))}
                  >
                    <strong>{project.name}</strong>
                    <span>{project._count?.tasks ?? 0} tasks</span>
                  </button>
                ))}
              </div>
            </section>

            {selectedProject && (
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>{selectedProject.name}</h2>
                    <p className="muted">{selectedProject.description || "No description yet"}</p>
                  </div>
                </div>

                <div className="task-list">
                  {selectedProject.tasks?.map((task) => (
                    <article key={getId(task)} className={`task priority-${task.priority.toLowerCase()}`}>
                      <div>
                        <h3>{task.title}</h3>
                        <p>{task.description || "No description"}</p>
                        <small>{task.assignee?.name || "Unassigned"} {task.dueDate ? `- due ${new Date(task.dueDate).toLocaleDateString()}` : ""}</small>
                      </div>
                      <select value={task.status} onChange={(e) => updateStatus(getId(task), e.target.value)}>
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="side-column">
            {isAdmin ? (
              <>
                <ProjectForm onCreate={createProject} />
                <TaskForm selectedProject={selectedProject} users={selectedProject?.memberships?.map((m) => m.user) || []} onCreate={createTask} />
                <MemberManager project={selectedProject} users={users} currentUser={session.user} onAdd={addMember} onRemove={removeMember} />
              </>
            ) : (
              <section className="panel stack">
                <h2>My Access</h2>
                <p className="muted">Members can view project work and update task status assigned by an admin.</p>
              </section>
            )}
        </aside>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
