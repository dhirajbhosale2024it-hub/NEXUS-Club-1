const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const db = require("./config/db");

dotenv.config();

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===== SESSION ===== */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secretkey",
    resave: false,
    saveUninitialized: false
  })
);

/* ===== AUTH MIDDLEWARE ===== */
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Please log in to register for events." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access only." });
  }
  next();
}

/* ===== HTML PAGES ===== */
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
app.get("/about.html", (req, res) => res.sendFile(path.join(__dirname, "views", "about.html")));
app.get("/events.html", (req, res) => res.sendFile(path.join(__dirname, "views", "events.html")));
app.get("/team.html", (req, res) => res.sendFile(path.join(__dirname, "views", "team.html")));
app.get("/gallery.html", (req, res) => res.sendFile(path.join(__dirname, "views", "gallery.html")));
app.get("/contact.html", (req, res) => res.sendFile(path.join(__dirname, "views", "contact.html")));
app.get("/join.html", (req, res) => res.sendFile(path.join(__dirname, "views", "join.html")));
app.get("/login.html", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/register-event.html", (req, res) => res.sendFile(path.join(__dirname, "views", "register-event.html")));

/* ===== AUTH ROUTES ===== */

/* Register new user */
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields are required." });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ success: false, message: "Email already registered." });
          console.error(err);
          return res.status(500).json({ success: false, message: "Registration failed." });
        }
        res.json({ success: true, message: "Account created! You can now log in." });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* Login */
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password are required." });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) { console.error(err); return res.status(500).json({ success: false, message: "Server error." }); }
    if (results.length === 0)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    req.session.user = { user_id: user.user_id, name: user.name, email: user.email, role: user.role };
    res.json({ success: true, message: `Welcome back, ${user.name}!`, user: req.session.user });
  });
});

/* Logout */
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: "Logged out." }));
});

/* Session check */
app.get("/api/auth/me", (req, res) => {
  res.json(req.session.user ? { loggedIn: true, user: req.session.user } : { loggedIn: false });
});

/* ===== CLUB MEMBERSHIP ===== */

/* Submit club membership form */
app.post("/api/join", (req, res) => {
  const { name, email, phone, dept, year, interest } = req.body;
  if (!name || !email || !phone || !dept || !year || !interest) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // Check if email already registered
  db.query("SELECT * FROM club_members WHERE email = ?", [email], (err, results) => {
    if (err) { console.error(err); return res.status(500).json({ success: false, message: "Database error." }); }
    if (results.length > 0) {
      return res.status(409).json({ success: false, message: "This email is already registered for club membership." });
    }

    // Insert new member
    db.query(
      "INSERT INTO club_members (name, email, phone, department, year_of_study, area_of_interest) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, phone, dept, year, interest],
      (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ success: false, message: "Registration failed." });
        }
        res.json({ success: true, message: "Thank you for joining NEXUS Club! We'll review your application and get back to you soon." });
      }
    );
  });
});

/* ===== EVENT ROUTES ===== */

/* Get latest events */
app.get("/api/events", (req, res) => {
  db.query("SELECT * FROM events ORDER BY date DESC LIMIT 3", (err, results) => {
    if (err) { console.error(err); return res.json([]); }
    res.json(results);
  });
});

/* Get single event by event_id */
app.get("/api/events/:id", (req, res) => {
  db.query("SELECT * FROM events WHERE event_id = ?", [req.params.id], (err, results) => {
    if (err) { console.error(err); return res.status(500).json({ success: false, message: "Database error." }); }
    if (results.length === 0) return res.status(404).json({ success: false, message: "Event not found." });
    res.json(results[0]);
  });
});

/* ===== EVENT REGISTRATION ===== */

/* Register logged-in user for an event */
app.post("/api/events/:id/register", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId  = req.session.user.user_id;

  db.query("SELECT * FROM events WHERE event_id = ?", [eventId], (err, events) => {
    if (err) { console.error(err); return res.status(500).json({ success: false, message: "Database error." }); }
    if (events.length === 0) return res.status(404).json({ success: false, message: "Event not found." });

    db.query(
      "INSERT INTO event_registrations (user_id, event_id) VALUES (?, ?)",
      [userId, eventId],
      (err2) => {
        if (err2) {
          if (err2.code === "ER_DUP_ENTRY")
            return res.status(409).json({ success: false, message: "You are already registered for this event." });
          console.error(err2);
          return res.status(500).json({ success: false, message: "Registration failed." });
        }
        res.json({ success: true, message: `Successfully registered for "${events[0].event_name}"!` });
      }
    );
  });
});

/* Cancel registration */
app.delete("/api/events/:id/register", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId  = req.session.user.user_id;

  db.query(
    "DELETE FROM event_registrations WHERE user_id = ? AND event_id = ?",
    [userId, eventId],
    (err, result) => {
      if (err) { console.error(err); return res.status(500).json({ success: false, message: "Database error." }); }
      if (result.affectedRows === 0)
        return res.status(404).json({ success: false, message: "Registration not found." });
      res.json({ success: true, message: "Registration cancelled." });
    }
  );
});

/* My registrations (logged-in user) */
app.get("/api/my-registrations", requireLogin, (req, res) => {
  db.query(
    `SELECT e.event_id, e.event_name, e.date, e.time, e.venue, e.description, er.registered_at
     FROM event_registrations er
     JOIN events e ON er.event_id = e.event_id
     WHERE er.user_id = ?
     ORDER BY e.date ASC`,
    [req.session.user.user_id],
    (err, results) => {
      if (err) { console.error(err); return res.status(500).json({ success: false, message: "Database error." }); }
      res.json({ success: true, registrations: results });
    }
  );
});

/* ADMIN: All registrations for a given event */
app.get("/api/admin/events/:id/registrations", requireAdmin, (req, res) => {
  db.query(
    `SELECT u.user_id, u.name, u.email, er.registered_at
     FROM event_registrations er
     JOIN users u ON er.user_id = u.user_id
     WHERE er.event_id = ?
     ORDER BY er.registered_at DESC`,
    [req.params.id],
    (err, results) => {
      if (err) { console.error(err); return res.status(500).json({ success: false, message: "Database error." }); }
      res.json({ success: true, count: results.length, registrations: results });
    }
  );
});

/* ===== CONTACT FORM ===== */
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;
  console.log("Contact Form:", name, email, message);
  res.json({ success: true, message: "Message received successfully" });
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));