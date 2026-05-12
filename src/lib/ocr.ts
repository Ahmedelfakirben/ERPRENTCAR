import { GoogleGenerativeAI } from '@google/generative-ai';

export interface OCRResult {
  full_name?: string;
  cin?: string;
  birth_date?: string;
  address?: string;
  driver_license?: string;
  license_delivery_date?: string;
  passport?: string;
}

// Initialize the Google Generative AI client with the API key from environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const scanDocument = async (imageUrls: string[]): Promise<OCRResult> => {
  try {
    console.log(`Fetching ${imageUrls.length} image(s) for Gemini 2.5 Flash OCR...`);
    
    // Fetch all images and convert to Base64
    const imageParts = await Promise.all(imageUrls.map(async (url) => {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64data = reader.result as string;
              resolve(base64data.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });

      return {
        inlineData: {
          data: base64Image,
          mimeType: blob.type
        }
      };
    }));

    // Check if API key is loaded
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      alert("La clave API de Gemini no se ha cargado. Por favor, asegúrate de reiniciar el servidor (npm run dev) después de añadir el archivo .env.");
      throw new Error("Missing Gemini API Key. Restart dev server.");
    }

    console.log('Sending image to Gemini 2.5 Flash...');
    
    // 2. Initialize Model (Using the latest stable 2.5 multimodal model)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. Prompt for exact JSON output
    const prompt = `
      You are an expert OCR system specialized in Moroccan identity documents.
      You are receiving between 1 and 6 images. Each image may be a DIFFERENT document:
        - Moroccan National ID Card (CIN) - front or back
        - Moroccan Driver's License (Permis de Conduire) - front or back
        - Passport - any page
      
      CRITICAL INSTRUCTIONS:
      1. Analyze EVERY single image provided, regardless of its orientation (horizontal/landscape images are common for driver's licenses - STILL READ THEM).
      2. Merge all information found across ALL images into ONE JSON object.
      3. Return ONLY valid JSON. No markdown, no backticks, no explanation.

      WHAT TO LOOK FOR IN EACH DOCUMENT TYPE:
      - CIN FRONT: full_name (in Latin script, uppercase), cin number (format: 1-2 letters + 5-6 digits e.g. L541131), birth_date
      - CIN BACK: address (residential address in French/Latin script)
      - DRIVER'S LICENSE FRONT: driver_license number (Permis N° or N° Permis), license_delivery_date (Délivré le / Date de délivrance)
      - PASSPORT: passport number (starts with letters like AB, P, etc.)

      OUTPUT FIELDS (use null if not found):
      - "full_name": Person's full name in UPPERCASE
      - "cin": National ID number, no spaces (e.g. "L541131")
      - "birth_date": Date of birth as YYYY-MM-DD
      - "address": Full residential address from back of CIN
      - "driver_license": Driver's license number (e.g. "12/345678")
      - "license_delivery_date": License issue date as YYYY-MM-DD
      - "passport": Passport number (e.g. "AB1234567")

      EXAMPLE OUTPUT:
      {
        "full_name": "AHMED EL FAKIR",
        "cin": "L541131",
        "birth_date": "1994-08-06",
        "address": "AV ALLAMA MHAND OURIAGHLI RES YOUSEF B N0 04 TETOUAN",
        "driver_license": "12/345678",
        "license_delivery_date": "2020-01-15",
        "passport": null
      }
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Clean potential markdown blocks from response just in case
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log('Gemini JSON Response:', jsonStr);
    
    return JSON.parse(jsonStr) as OCRResult;

  } catch (err) {
    console.error('Gemini OCR Error:', err);
    throw err;
  }
};
