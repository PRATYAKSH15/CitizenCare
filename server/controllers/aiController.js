import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const CATEGORIES = [
  'Pothole', 'Road Damage', 'Waste Management', 'Street Light',
  'Water Supply', 'Sewage', 'Public Safety', 'Parks & Recreation',
  'Noise Pollution', 'Other',
];

export const analyzeIssue = async (title, description) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `Analyze this citizen complaint and return ONLY a valid JSON object (no markdown, no code blocks):
{
  "aiSummary": "A concise 1-2 sentence summary of the issue",
  "sentiment": "negative",
  "category": "Pothole",
  "priority": "medium"
}

Valid sentiment values: positive, negative, neutral
Valid category values: ${CATEGORIES.join(', ')}
Valid priority values: low, medium, high

Title: ${title}
Description: ${description}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty response from Groq');

    const jsonText = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonText);
  } catch (err) {
    console.error('AI analysis failed:', err.message);
    return {
      aiSummary: description.substring(0, 200),
      sentiment: 'neutral',
      category: 'Other',
      priority: 'medium',
    };
  }
};
