const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.argv[2];

  if (!apiKey) {
    console.log('Usage: node test-gemini.js YOUR_API_KEY');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const models = await genAI.listModels();
    console.log('\n✅ Available models:');
    models.forEach(model => {
      console.log(`- ${model.name}`);
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log('  ✓ Supports generateContent (vision)');
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listModels();
