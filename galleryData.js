// Gallery Data File - Contains all painting information and gallery details

// Data storage for paintings (will be populated from CSV)
let paintings = [];

// Exported arrays (will be populated from the paintings array)
export let images = [];
export let titles = [];
export let artists = [];
export let paintingDetails = [];

// Gallery contact information
export const galleryEmail = "art@redeslabs.com";

// Total number of paintings
export let paintingCount = 0;

// Function to parse CSV data and handle quoted fields with commas
function parseCSVLine(line) {
  const values = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  values.push(currentValue);
  
  return values;
}

// Load data from CSV file
export async function loadPaintingData() {
  try {
    const response = await fetch('/paintings.csv');
    const csvText = await response.text();
    
    // Parse CSV (skip header row)
    const rows = csvText.split('\n').slice(1).filter(row => row.trim() !== '');
    
    // Process each row
    paintings = rows.map(row => {
      // Parse the CSV line properly handling quoted fields
      const values = parseCSVLine(row);
      
      // Map values to object properties
      const [
        id, 
        image_url, 
        title, 
        artist, 
        year, 
        description, 
        to_sell, 
        price, 
        auction, 
        date_ending_auction, 
        available, 
        current_owner, 
        authenticated_by, 
        comments_of_seller
      ] = values;
      
      return {
        id,
        image_url,
        title,
        artist,
        year,
        description,
        to_sell: to_sell === 'true',
        price: parseInt(price),
        auction: auction === 'true',
        dateEndingAuction: date_ending_auction,
        available: available === 'true',
        currentOwner: current_owner,
        authenticatedBy: authenticated_by.split(',').map(a => a.trim()),
        commentsOfSeller: comments_of_seller
      };
    });
    
    // Update the exported arrays
    images = paintings.map(p => p.image_url);
    titles = paintings.map(p => p.title);
    artists = paintings.map(p => p.artist);
    paintingDetails = paintings.map(p => ({
      id: p.id,
      price: p.price,
      description: p.description,
      year: parseInt(p.year),
      toSell: p.to_sell,
      auction: p.auction,
      dateEndingAuction: p.dateEndingAuction,
      available: p.available,
      currentOwner: p.currentOwner,
      authenticatedBy: p.authenticatedBy,
      commentsOfSeller: p.commentsOfSeller
    }));
    
    // Update painting count
    paintingCount = images.length;
    
    console.log(`Loaded ${paintingCount} paintings from CSV`);
    
    return paintings;
  } catch (error) {
    console.error('Error loading painting data:', error);
    
    // Fallback to default data if CSV loading fails
    setupDefaultData();
    return paintings;
  }
}