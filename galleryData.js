// Gallery Data File - Contains all painting information and gallery details

/*
 * ====================================================================
 * TUTORIAL: HOW TO ADD NEW PAINTINGS TO THE GALLERY APP
 * ====================================================================
 * 
 * Follow these steps to add a new painting to the gallery:
 * 
 * 1. PREPARE YOUR IMAGE:
 *    - Save your painting image in the public folder
 *    - Use a descriptive name with lowercase letters and no spaces (e.g., 'mona_lisa.jpg')
 * 
 * 2. ADD YOUR PAINTING DATA:
 *    - Find each array below (images, titles, artists, etc.)
 *    - Add your painting's information to EACH array
 *    - Make sure to maintain the same index position across all arrays
 * 
 * COMPLETE EXAMPLE:
 * To add "Mona Lisa" by Leonardo da Vinci, you would add an entry to each array:
 * 
 *    images:              'mona_lisa.jpg'
 *    titles:              'Mona Lisa'
 *    artists:             'Leonardo da Vinci'
 *    ids:                 'P007'  (incrementing from the last ID)
 *    years:               '1503'
 *    descriptions:        'Painted between 1503 and 1519, the Mona Lisa is famous for her enigmatic smile.'
 *    prices:              7500000
 *    toSellStatus:        true  (if available for sale, false if not)
 *    auctionStatus:       false (if not in auction, true if in auction)
 *    auctionEndDates:     ''    (empty string if not in auction, or date format 'YYYY-MM-DD')
 *    availabilityStatus:  true  (if available for viewing)
 *    currentOwners:       'Private Collection'
 *    authenticationBodies: ['Louvre Museum', 'Italian Ministry of Culture']
 *    sellerComments:      'Exceptional provenance with documentation dating back to the 16th century.'
 * 
 * IMPORTANT NOTES:
 *    - The image filename in the 'images' array MUST match your actual file in the public folder
 *    - Create a unique ID for each new painting (e.g., 'P007', 'P008', etc.)
 *    - All arrays must have the same length
 *    - Required fields for each painting: image, title, artist, id, year, description, price
 *    - Maintain the proper data type for each field (strings, numbers, booleans, arrays)
 *    - No code changes are needed in the functions at the bottom of this file
 * 
 * After adding your data, the application will automatically display your new painting
 * in the gallery when it loads!
 * ====================================================================
 */
// For new line in 'bla bla' text use <br>. For example 'this is a new<br>line'. br is for break
// ----------------------------------------------------------------------------------------
// Ensure all of the below have been filled for all the number of paintings and don't forget , or a '
// Hardcoded painting data from CSV
// Exported arrays with painting data from CSV
export let images = [
  'socrates.jpg',
  'stars.jpg',
  'wave.jpg',
  'spring.jpg',
  'mountain.jpg',
  'sunday.jpg',
  'monalisa.jpg'
];

export let titles = [
  'The Death of Socrates',
  'Starry Night',
  'The Great Wave off Kanagawa',
  'Effect of Spring Giverny',
  'Mount Corcoran',
  'A Sunday on La Grande Jatte',
  'Mona Lisa'
];

export let artists = [
  'Jacques-Louis David',
  'Vincent Van Gogh',
  'Katsushika Hokusai',
  'Claude Monet',
  'Albert Bierstadt',
  'George Seurat',
  'Leonardo da Vinci'
];

// IDs from CSV
const ids = [
  'P001',
  'P002',
  'P003',
  'P004',
  'P005',
  'P006',
  'P007'
];

// Years from CSV
const years = [
  '1787',
  '1889',
  '1831',
  '1890',
  '1876',
  '1886',
  '1503'
];

// Descriptions from CSV
const descriptions = [
  'Completed in 1787, this painting depicts the moment when the Athenian philosopher Socrates, sentenced to death, prepares to drink hemlock.',
  'Painted in 1889, this iconic work depicts a night scene with a swirling sky and bright crescent moon.',
  'Created around 1831, this woodblock print depicts a massive wave threatening boats off the coast of Japan with Mount Fuji in the background.',
  'Painted in 1890, this impressionist work captures the beauty of spring in Giverny, France.',
  'Completed in the 1870s, this landscape painting captures the grandeur of the Sierra Nevada mountains.',
  'Finished in 1886, this pointillist masterpiece depicts people relaxing in a park on the banks of the Seine River.',
  'Painted between 1503 and 1519, the Mona Lisa is famous for her enigmatic smile and is one of the most recognized paintings in the world.'
];

// Prices from CSV
const prices = [
  4500000,
  12000000,
  8750000,
  7200000,
  5800000,
  10500000,
  0
];

// To Sell status from CSV
const toSellStatus = [
  true,
  true,
  true,
  true,
  true,
  true,
  false
];

// Auction status from CSV
const auctionStatus = [
  false,
  true,
  false,
  true,
  false,
  true,
  false
];

// Auction end dates from CSV
const auctionEndDates = [
  '',
  '2023-12-31',
  '',
  '2023-11-15',
  '',
  '2023-10-30',
  ''
];

// Availability status from CSV
const availabilityStatus = [
  true,
  true,
  true,
  true,
  true,
  false,
  false
];

// Current owners from CSV
const currentOwners = [
  'Private Collection',
  'Anonymous Collector',
  'Japanese Art Foundation',
  'European Art Trust',
  'Western American Art Collection',
  'Private European Estate',
  ''
];

// Authentication bodies from CSV
const authenticationBodies = [
  ['Louvre Museum', 'Metropolitan Museum'],
  ['Museum of Modern Art', 'Van Gogh Museum'],
  ['Tokyo National Museum', 'British Museum'],
  ['Musée d\'Orsay', 'Giverny Foundation'],
  ['National Gallery of Art', 'Smithsonian American Art Museum'],
  ['Art Institute of Chicago', 'Musée d\'Orsay'],
  []
];

// Seller comments from CSV
const sellerComments = [
  'DEMO DATA! NOT REAL! Acquired from a prestigious European collection in 2005.',
  'DEMO DATA! NOT REAL! One of Van Gogh\'s most recognized masterpieces with exceptional provenance.',
  'DEMO DATA! NOT REAL! Excellent condition for its age with vibrant original colors.',
  'DEMO DATA! NOT REAL! Features Monet\'s garden which inspired many of his most famous works.',
  'DEMO DATA! NOT REAL! Stunning example of American landscape painting with perfect light quality.',
  'DEMO DATA! NOT REAL! Remarkable pointillist technique with millions of tiny colored dots forming the image.',
  ''
];
// ----------------------------------------------------------------------------------------
// Do not edit below from here
// Combine all the data into the paintingDetails array
export let paintingDetails = images.map((img, index) => ({
  id: ids[index],
  price: prices[index],
  description: descriptions[index],
  year: parseInt(years[index]),
  toSell: toSellStatus[index],
  auction: auctionStatus[index],
  dateEndingAuction: auctionEndDates[index],
  available: availabilityStatus[index],
  currentOwner: currentOwners[index],
  authenticatedBy: authenticationBodies[index],
  commentsOfSeller: sellerComments[index]
}));

// Total number of paintings
export let paintingCount = images.length;

// Since we're using hardcoded data, this function just returns the existing data
export async function loadPaintingData() {
  console.log(`Using ${paintingCount} hardcoded paintings from CSV data`);
  return paintingDetails.map((details, index) => ({
    id: details.id,
    image_url: images[index],
    title: titles[index],
    artist: artists[index],
    year: years[index],
    description: details.description,
    to_sell: details.toSell,
    price: details.price,
    auction: details.auction,
    dateEndingAuction: details.dateEndingAuction,
    available: details.available,
    currentOwner: details.currentOwner,
    authenticatedBy: details.authenticatedBy,
    commentsOfSeller: details.commentsOfSeller
  }));
}
