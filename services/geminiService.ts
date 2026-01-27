
import { GoogleGenAI } from "@google/genai";

export const generatePoliteMessage = async (reason: string, eventTitle: string, date: string): Promise<string> => {
  try {
    // Initialize GoogleGenAI using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      以下の情報をもとに、学校の先生へ送る丁寧な欠席連絡のメッセージ文を作成してください。
      
      【欠席理由】: ${reason}
      【授業名】: ${eventTitle}
      【日付】: ${date}
      
      敬語（です・ます調）で、簡潔かつ誠実な文章を2〜3文で作成してください。
      出力はメッセージ本文のみにしてください。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    // Access the .text property directly
    return response.text || "体調不良のため、本日の授業を欠席させていただきます。何卒よろしくお願い申し上げます。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "体調不良のため、本日の授業を欠席させていただきます。何卒よろしくお願い申し上げます。";
  }
};
