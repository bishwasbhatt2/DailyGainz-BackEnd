// server.js
import express from 'express';
import cors from 'cors';
import sgMail from '@sendgrid/mail';

// Set up SendGrid API key
sgMail.setApiKey('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');

const app = express();
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // Parse JSON requests

// Endpoint to send email
app.post('/send-email', async (req, res) => {
  const { email, workouts } = req.body;

  const message = {
    to: email,
    from: 'thedailygainzco@gmail.com', // Replace with your verified SendGrid sender email
    subject: 'Your Workout Recommendations',
    text: `Here are your workout recommendations:\n\n${workouts.join('\n')}`,
    html: `<p>Here are your workout recommendations:</p><ul>${workouts
      .map((workout) => `<li>${workout}</li>`)
      .join('')}</ul>`,
  };

  try {
    await sgMail.send(message);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error.response.body.errors);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
