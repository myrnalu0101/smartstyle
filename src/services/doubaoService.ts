import OpenAI from "openai";
import { ClothingItem, Outfit, Category, ItemStatus } from "../types";

// Initialize Doubao (豆包) Client via OpenAI-compatible API
const client = new OpenAI({
  apiKey: process.env.DOUBAO_API_KEY || '',
  baseURL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

const getRandomItem = (items: ClothingItem[], category: Category): ClothingItem | undefined => {
  const filtered = items.filter(i => i.category === category);
  if (filtered.length === 0) return undefined;
  return filtered[Math.floor(Math.random() * filtered.length)];
};

export const generateOutfitSuggestion = async (
  wardrobe: ClothingItem[],
  occasion: string,
  weather: string,
  temperature: number,
  userStyle: string,
  lockedItemIds: string[] = []
): Promise<Outfit> => {

  // 1. Identify Locked Items (Must be in outfit)
  const lockedItems = wardrobe.filter(item => lockedItemIds.includes(item.id));

  // 2. Prepare Inventory for AI
  const wardrobeSummary = wardrobe.map(item => ({
    id: item.id,
    category: item.category,
    color: item.color,
    tags: item.tags.join(", "),
    status: item.status,
    isLocked: lockedItemIds.includes(item.id)
  }));

  const systemPrompt = `
    You are a world-class AI Fashion Stylist.
    Your goal is to create a stylish outfit from the provided wardrobe based on the occasion/context.

    User Context:
    - Occasion/Goal: ${occasion}
    - Weather: ${weather}, ${temperature}°C
    - Personal Style: ${userStyle}

    Wardrobe Inventory (JSON):
    ${JSON.stringify(wardrobeSummary)}

    Constraints:
    1. You MUST include ALL items marked as 'isLocked': true. This is non-negotiable.
    2. Select complementary items from the inventory to complete the look (e.g., if a Top is locked, find matching Bottoms and Shoes).
    3. If the locked item is a 'Pre-purchase' item (status: WISHLIST), the goal is to prove it fits the existing wardrobe.

    You must respond with valid JSON in the following format:
    {
      "selectedItemIds": ["id1", "id2", ...],
      "reasoning": "A short, engaging explanation. If locked items were used, explain how you styled around them.",
      "score": 85
    }
  `;

  try {
    if (!process.env.DOUBAO_API_KEY) {
      throw new Error("Doubao API Key missing");
    }

    const response = await client.chat.completions.create({
      model: process.env.DOUBAO_ENDPOINT_ID || 'ep-20260610091756-sg9fc',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the best outfit combination respecting the locked items." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    const selectedIds: string[] = result.selectedItemIds || [];

    // Merge AI selection with constraints to be safe
    const finalIds = Array.from(new Set([...lockedItemIds, ...selectedIds]));

    const matchedItems = wardrobe.filter(item => finalIds.includes(item.id));

    return {
      id: Date.now().toString(),
      items: matchedItems.length > 0 ? matchedItems : fallbackOutfit(wardrobe, lockedItems),
      score: result.score || 85,
      reasoning: result.reasoning || "根据您的要求，为您搭配了这套造型。",
      occasion: occasion,
      dateCreated: new Date().toISOString()
    };

  } catch (error) {
    console.warn("Doubao API call failed, using fallback", error);
    return {
      id: Date.now().toString(),
      items: fallbackOutfit(wardrobe, lockedItems),
      score: 80,
      reasoning: "网络连接受限，但我还是为您凭直觉挑了一套不错的搭配！(API Error or Key Missing)",
      occasion: occasion,
      dateCreated: new Date().toISOString()
    };
  }
};

const fallbackOutfit = (wardrobe: ClothingItem[], lockedItems: ClothingItem[]): ClothingItem[] => {
  const outfit: ClothingItem[] = [...lockedItems];

  const hasTop = outfit.some(i => i.category === Category.TOP || i.category === Category.DRESS || i.category === Category.OUTERWEAR);
  const hasBottom = outfit.some(i => i.category === Category.BOTTOM || i.category === Category.DRESS);
  const hasShoes = outfit.some(i => i.category === Category.SHOES);

  if (!hasTop) {
     const top = getRandomItem(wardrobe, Category.TOP);
     if (top) outfit.push(top);
  }
  if (!hasBottom && !outfit.some(i => i.category === Category.DRESS)) {
      const bottom = getRandomItem(wardrobe, Category.BOTTOM);
      if (bottom) outfit.push(bottom);
  }
  if (!hasShoes) {
      const shoes = getRandomItem(wardrobe, Category.SHOES);
      if (shoes) outfit.push(shoes);
  }

  return outfit;
};

export const simulateProcessingDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
