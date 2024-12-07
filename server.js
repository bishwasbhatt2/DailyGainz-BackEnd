// server.js

import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { getWorkouts } from './workouts.js'; // Adjust the path as necessary
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Use createRequire to import CommonJS modules
const require = createRequire(import.meta.url);
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin SDK

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://dailygainz-bf092.firebaseio.com', // Replace with your project ID
});

// Firestore reference
const db = admin.firestore();

// Set up SendGrid API key
sgMail.setApiKey(''); // Replace with your actual SendGrid API key

const app = express();
app.use(cors({ origin: 'http://localhost:5173' })); // Adjust CORS origin as needed
app.use(express.json());

// Timer interval in milliseconds (modifiable)
// 24 hours = 24 * 60 * 60 * 1000 milliseconds
const TIMER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Send email function
const sendEmail = async (email, workouts) => {
  const message = {
    to: email,
    from: 'thedailygainzco@gmail.com',
    subject: 'Your Daily Workout Challenge',
    text: `Here are your workout recommendations:\n\n${workouts.join('\n')}`,
    html: `<p>Here are your workout recommendations:</p><ul>${workouts
      .map((workout) => `<li>${workout}</li>`)
      .join('')}</ul>`,
  };

  try {
    await sgMail.send(message);
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('SendGrid Response Error:', error.response.body.errors);
    }
  }
};

app.post('/start-timer', async (req, res) => {
  const { userId, email, difficulty } = req.body;

  if (!email || !userId || !difficulty) {
    return res.status(400).json({
      error: 'Invalid input. Ensure "userId", "email", and "difficulty" are provided.',
    });
  }

  // Generate initial workouts
  const newWorkouts = getWorkouts(difficulty);

  // Store timer data in Firestore
  const timerData = {
    difficulty,
    email,
    startTime: admin.firestore.Timestamp.now(), // New timestamp
    interval: TIMER_INTERVAL,
    workouts: newWorkouts,
  };

  try {
    // Always replace the old timer with the new one
    await db.collection('timers').doc(userId).set(timerData, { merge: false });

    res.status(200).json({
      message: 'Timer updated with the new difficulty and email schedule.',
      workouts: newWorkouts,
    });
  } catch (err) {
    console.error('Error storing timer data:', err);
    res.status(500).json({ error: 'Failed to update the timer.' });
  }
});


// Function to handle timer resets
const checkTimers = async () => {
  const now = admin.firestore.Timestamp.now();
  const timersRef = db.collection('timers');
  const snapshot = await timersRef.get();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const { startTime, interval, difficulty, email } = data;

    const elapsed = now.toMillis() - startTime.toMillis();
    if (elapsed >= interval) {
      // Generate new workouts
      const newWorkouts = getWorkouts(difficulty);

      // Send email
      sendEmail(email, newWorkouts);

      // Update timer in Firestore
      await timersRef.doc(doc.id).update({
        startTime: now,
        workouts: newWorkouts,
      });
    }
  });
};

// Periodically check timers (e.g., every minute)
setInterval(checkTimers, 60 * 1000); // Check every minute

// Server setup
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
