const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Mock database
const itineraries = {};

const axios = require('axios');
require('dotenv').config();

// AI Trip Planner API with ChatGPT integration
app.post('/api/generate-itinerary', async (req, res) => {
    try {
        const { destination, dates, travelers, budget, interests, email } = req.body;
        
        // Validate input
        if (!destination || !dates || !travelers || !budget || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Construct ChatGPT prompt
        const dayCount = Math.ceil((new Date(dates.end) - new Date(dates.start)) / (1000 * 60 * 60 * 24)) + 1;
        const prompt = `Create a detailed ${dayCount}-day travel itinerary for ${travelers} visiting ${destination} with a ${budget} budget. 
        Interests include: ${interests.join(', ')}. Include accommodations, activities, and dining recommendations.
        Format as JSON with days array containing date, activities (time, title, description).`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const itineraryData = JSON.parse(response.data.choices[0].message.content);
        const itineraryId = Date.now().toString();
        
        const itinerary = {
            id: itineraryId,
            destination,
            dates,
            travelers,
            budget,
            interests,
            email,
            status: 'generated',
            createdAt: new Date().toISOString(),
            days: itineraryData.days || generateItinerary(destination, dates, interests) // Fallback to mock if needed
        };

        itineraries[itineraryId] = itinerary;
        res.json({
            success: true,
            itineraryId,
            message: 'Itinerary generated successfully!',
            itinerary: itinerary
        });
    } catch (error) {
        console.error('ChatGPT API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate itinerary',
            message: error.message
        });
    }
});

// Helper function to generate sample itinerary
function generateItinerary(destination, dates, interests) {
    const days = [];
    const startDate = new Date(dates.start);
    const endDate = new Date(dates.end);
    const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < dayCount; i++) {
        days.push({
            day: i + 1,
            date: new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            activities: generateDailyActivities(destination, interests)
        });
    }
    return days;
}

function generateDailyActivities(destination, interests) {
    // Sample activities based on interests
    const activities = [];
    
    if (interests.includes('Adventure')) {
        activities.push({
            time: '09:00',
            title: `${destination} Adventure Tour`,
            description: 'Exciting outdoor activities'
        });
    }
    
    if (interests.includes('Culture')) {
        activities.push({
            time: '14:00',
            title: 'Cultural Experience',
            description: 'Visit local museums and historical sites'
        });
    }
    
    // Add default activities
    activities.push(
        {
            time: '12:00',
            title: 'Lunch at Local Restaurant',
            description: 'Try authentic local cuisine'
        },
        {
            time: '19:00',
            title: 'Dinner',
            description: 'Relax and enjoy your meal'
        }
    );
    
    return activities.sort((a, b) => a.time.localeCompare(b.time));
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});