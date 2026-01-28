# Google Image Search Setup Instructions

## Overview
The Google Image Search feature uses Google Custom Search API to search for product images and display them in a modal.

## Setup Steps

### 1. Create a Google Cloud Project (if you don't have one)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2. Enable Custom Search API
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Custom Search API"
3. Click on it and press "Enable"

### 3. Create an API Key
1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. (Optional but recommended) Click "Edit API key" → "API restrictions" → Select "Custom Search API"

### 4. Create a Custom Search Engine (CSE)
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create)
2. Fill in the form:
   - **Search engine name:** Bloom Product Images
   - **What to search:** Search the entire web
   - **Image search:** ON (toggle this!)
   - **SafeSearch:** OFF (for product images)
3. Click "Create"
4. On the next page, copy the **Search engine ID** (it looks like: `a1b2c3d4e5f6g7h8i`)

### 5. Configure Search Engine for Images
1. Click "Customize" on your search engine
2. Under "Image Search":
   - Enable "Image search"
3. Under "Sites to search":
   - Select "Search the entire web"
4. Click "Update"

### 6. Add to Environment Variables

Add these two variables to your `/back/.env` file:

```bash
# Google Custom Search API (for image search)
GOOGLE_CSE_API_KEY=your_api_key_here
GOOGLE_CSE_ID=your_search_engine_id_here
```

### 7. Restart Backend Server

```bash
cd back
npm run dev:back
```

## Usage Limits

**Free Tier:**
- 100 search queries per day
- $5 per 1000 additional queries (if you upgrade)

This is plenty for normal usage. If you exceed the free tier, you'll get an error message.

## Testing

1. Go to an order in the fulfillment page
2. Click "Search Google Images"
3. Enter a product code or search term
4. You should see image results appear

## Troubleshooting

**Error: "Google Custom Search API not configured"**
- Make sure both `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID` are in your `.env` file
- Restart the backend server

**Error: "API key not valid"**
- Check that the API key is correct
- Make sure Custom Search API is enabled in Google Cloud Console
- Try creating a new API key

**Error: "Invalid Value" or "CSE ID not found"**
- Double-check the Search Engine ID
- Make sure the Custom Search Engine exists and is active

**No images returned:**
- The API might not find images for very specific/obscure searches
- Try a more general search term
- Make sure "Image search" is enabled in the CSE settings

## Cost Monitoring

To monitor your API usage:
1. Go to [Google Cloud Console > APIs & Services > Dashboard](https://console.cloud.google.com/apis/dashboard)
2. Click on "Custom Search API"
3. View your quota usage

## Security Note

The API key is stored in the backend `.env` file and never exposed to the frontend. All image searches go through your backend API endpoint.
