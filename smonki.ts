import puppeteer from 'puppeteer';
const fs = require('fs');

class MonkiScraper {
  source = 'Monki';
  availability = ['DK'];
  totalProducts = 0;
  scrapedProducts = 0;
  scrapedUrls = new Set<string>();
  affiliate = true;
  MAX_LIMIT = 2000;
  maxRequestSize = 27;
  scrapedProductCount = 0;
    scrapingLimit = 10; // Set the scraping limit to 10
     products: any[] = []
    

  baseURL =
    "https://www.monki.com/en_dkk/clothing/coats-jackets/coats/product.single-breasted-water-repellent-coat-green.1127199004.html";

  browser: any;
  page: any;

    
  constructor() {
    // Initialize Puppeteer
    this.init();
  }

  async init() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  async start() {
   
    const url = this.baseURL;
    await this.navigate(url);
  }

  async navigate(url: string) {
    await this.page.goto(url);
    await this.parse(url);
   
  }

  async parse(url: string) {

    await this.page.goto(url);

    const jsonFile = await this.page.$eval(
      'script[type="application/ld+json"]:last-of-type',
      (element: Element) => {
        const textContent = element.textContent || '';
        return JSON.parse(textContent);
      }
    );

    if (!jsonFile) {
      return;
    }

    const title = jsonFile.name;
    // const description = jsonFile.description;
 const description = await this.page.$eval('#description div:nth-child(2)', (element: any) => {
  return element.textContent.trim();
});


    const price = parseFloat(jsonFile.offers[0].price);
    const discountedPrice = price; // Monki doesn't have discounted products
    const brand = 'Monki';
    const categoryList = await this.page.$$eval(
      'li.breadcrumb-item span[itemprop="name"]',
      (elements: Element[]) => elements.map((element) => element.textContent)
    );
    const category = categoryList.length >= 3 ? categoryList[2] : categoryList[1];
    const sizes = await this.page.$$eval(
      'button.size-options.a-button-nostyle.in-stock',
      (elements: Element[]) => elements.map((element) => element.getAttribute('data-value'))
    );
    const images = jsonFile.image;
    
const materials = await this.page.$eval('#articleCompositions', (element: Element) => {
  return element.textContent?.trim() || 'Materials not found';
});

    const color = 'blue'; // Fixed color

    const pIdMatch = url.match(/\.(\d+)\.html$/);
    const id = pIdMatch ? `moonki_${pIdMatch[1]}` : '';
    const relatedProductId = id ? id.slice(0, 13) : '';

    const productData = {
      id,
      source: this.source,
      url,
      title,
      description,
      price,
      currency: 'DKK',
      brand,
      color,
      category,
      sizes,
      images,
      materials,
      relatedProductId,
    };

    if (this.isProductValid(productData)) {
      this.scrapedProducts++;
      console.log(`Scraped ${this.scrapedProducts}/${this.totalProducts} products`);
      this.scrapedProductCount++;
      if (Math.round(discountedPrice) !== Math.round(price)) {
        const discountedProduct = {
          ...productData,
          discountedPrice,
          isDiscounted: true,
          affiliate: this.affiliate,
          availability: this.availability,
          };
          console.log(discountedProduct)
               this.products.push(discountedProduct); 
        // Handle the discounted product as needed
      } else {
          const product = { ...productData, affiliate: this.affiliate, availability: this.availability };
          console.log(product)
          this.products.push(product);
        // Handle the non-discounted product as needed
      }
    }
  }

  async getColor(url: string) {
    const pIdMatch = url.match(/\.(\d+)\.html$/);
    if (!pIdMatch) return '';

    const pId = pIdMatch[1];
    const allProductInfo = await this.page.$eval('script', (element: Element) => element.textContent || '');
    const searchThing = new RegExp(`'${pId}': ({.*?})`, 's');
    const productInfoMatch = allProductInfo.match(searchThing);
    if (productInfoMatch) {
      const productInfo = JSON.parse(`{${productInfoMatch[1]}}`);
      const color = productInfo.colorLoc || '';
      return color || '';
    }

    return '';
    }
    
    

  isProductValid(product: any) {
    const emptyFields = Object.entries(product).filter(([_, value]) => !value);
    if (emptyFields.length === 0) {
      console.log(`Product ${product.url} scraped successfully`);
      return true;
    }

    console.warn(
      `Product ${product.url} has empty fields in (${emptyFields.map(([field]) => field).join(', ')}) and will not be parsed.`
    );

    return false;
  }


     async close() {
    if (this.browser) {
      await this.browser.close();
      fs.writeFileSync('Smonki.json', JSON.stringify(this.products)); // Save the array to a JSON file
      console.log('Successfully saved JSON!');
    }
  }
    
}  
async function main() {
  const scraper = new MonkiScraper();
  await scraper.init();
    await scraper.start();

  const productData = await scraper.close();

//   // Initialize an array to store the scraped products
//   const products: any[] = [];

//   // Ensure that productData is an array
//   if (Array.isArray(productData)) {
//     for (const product of productData) {
//       if (product) {
//         products.push(product);
//         if (products.length >= 10) {
//           break; // Break the loop after 10 products
//         }
//       }
//     }
//   }

}

main();

