const express = require('express')
const cors = require('cors')
require('dotenv').config()
const Groq = require('groq-sdk')
const mongoose = require('mongoose')

const app = express()
app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log('MongoDB error:', err.message))

const chatSchema = new mongoose.Schema({
  role: String,
  text: String,
  location: { lat: Number, lng: Number },
  createdAt: { type: Date, default: Date.now }
})

const Chat = mongoose.model('Chat', chatSchema)

app.post('/chat', async (req, res) => {
  try {
    const { message, location } = req.body
    console.log('Received:', message)

    await Chat.create({ role: 'user', text: message, location })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are RoadSOS, an emergency assistant for road accident victims.
          Help users find nearby hospitals, police stations, ambulances and give first aid guidance.
          Be calm, clear and very concise. Always ask for their location if not provided.`
        },
        { role: 'user', content: message }
      ]
    })

    const reply = response.choices[0].message.content
    console.log('Reply sent!')

    await Chat.create({ role: 'bot', text: reply, location })

    res.json({ reply })

  } catch (error) {
    console.error('ERROR:', error.message)
    res.status(500).json({ reply: 'Error: ' + error.message })
  }
})

app.get('/history', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 }).limit(20)
    res.json({ chats: chats.reverse() })
  } catch (error) {
    res.status(500).json({ chats: [] })
  }
})

app.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an emergency services locator. When given coordinates, return ONLY a JSON array of nearby emergency places. No explanation, just JSON.
          Format: [{"name": "Place Name", "type": "hospital/police/ambulance", "lat": 12.xxx, "lng": 76.xxx, "phone": "number"}]`
        },
        {
          role: 'user',
          content: `Find 6 nearest emergency services (mix of hospitals, police stations) near coordinates: Lat ${lat}, Lng ${lng} in India. Return only JSON array.`
        }
      ]
    })
    const text = response.choices[0].message.content
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      res.json({ places: JSON.parse(jsonMatch[0]) })
    } else {
      res.json({ places: [] })
    }
  } catch (error) {
    res.status(500).json({ places: [] })
  }
})
app.get('/firstaid', async (req, res) => {
  try {
    const { type } = req.query

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a first aid expert. Give clear, numbered, step-by-step first aid instructions. 
          Keep each step short (1 sentence). Maximum 6 steps. Start immediately with Step 1.`
        },
        {
          role: 'user',
          content: `Give first aid steps for: ${type}`
        }
      ]
    })

    res.json({ steps: response.choices[0].message.content })
  } catch (error) {
    res.status(500).json({ steps: 'Error fetching first aid steps' })
  }
})

app.listen(5000, () => console.log('RoadSOS server running on port 5000'))