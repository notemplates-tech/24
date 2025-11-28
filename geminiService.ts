import { GoogleGenAI } from "@google/genai";
import { Mountain } from '../types';

export const analyzeDirection = async (
  mountain: Mountain, 
  rotation: number,
  mapCenter?: [number, number],
  mapZoom?: number
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Normalize rotation to 0-360
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  let locationContext = "";
  if (mapCenter) {
    locationContext = `
    Контекст карты:
    - Координаты центра: Широта ${mapCenter[0].toFixed(4)}, Долгота ${mapCenter[1].toFixed(4)}
    - Уровень приближения (Zoom): ${mapZoom || 'Неизвестно'}
    `;
  }

  const prompt = `
    Ты - опытный мастер классического Фэн-шуй (школа Сань Юань и Летящие Звезды).
    
    Пользователь выбрал направление:
    - Название: ${mountain.name} (${mountain.chineseName} - ${mountain.pinyin})
    - Сектор: ${mountain.direction}
    - Элемент: ${mountain.element}
    - Компас ориентирован на: ${normalizedRotation.toFixed(1)} градусов.
    ${locationContext}
    
    Задача:
    Дай краткую, но глубокую интерпретацию этого сектора (горы) с точки зрения Фэн-шуй.
    
    Если координаты указаны, попробуй учесть географическое положение (например, если это северное полушарие, особенности климата или местности, если они очевидны из координат, но не фантазируй лишнего).
    
    Структура ответа:
    1. **Общее значение**: Энергетика направления ${mountain.chineseName}.
    2. **Для построек**: Благоприятность фасада или двери в этом направлении в 9-м периоде.
    3. **Совет мастера**: Практическая рекомендация по активации или коррекции.

    Отформатируй ответ в Markdown, используй заголовки и списки. Будь краток и практичен.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Не удалось получить ответ от оракула.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Return a string message instead of throwing an object if possible, 
    // or let the caller handle the error object by extracting the message.
    throw new Error(error.message || "Ошибка соединения с духами ИИ.");
  }
};