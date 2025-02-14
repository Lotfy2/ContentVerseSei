import axios from 'axios';

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const API_KEY = '5917f5021502bcc262c406894843fe09627cfc79a277d119ce3c9663ed379a17';

interface TranslationRequest {
  text: string;
  targetLanguage: string;
}

export const translateContent = async (
  request: TranslationRequest
): Promise<string> => {
  try {
    const response = await axios.post(
      TOGETHER_API_URL,
      {
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text to ${request.targetLanguage}. Only provide the direct translation without any additional notes, context, or explanations. Do not include any metadata or comments about the translation process.`
          },
          {
            role: "user",
            content: request.text
          }
        ],
        temperature: 0.3,
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Clean up the response to ensure only the translation is returned
    const translation = response.data.choices[0].message.content
      .trim()
      // Remove any potential notes or explanations that might be in parentheses
      .replace(/\(.*?\)/g, '')
      // Remove any "Translation:" prefix if present
      .replace(/^Translation:\s*/i, '')
      // Remove any "Note:" or similar prefixes
      .replace(/^Note:\s*/i, '')
      // Remove any trailing notes or explanations
      .split(/\n\n/)[0];

    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate content. Please try again.');
  }
};